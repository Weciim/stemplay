from __future__ import annotations

import re
import shutil
import threading
import traceback
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from backend.separate import detect_device, ensure_output_dir, get_separation_profile, run_demucs_fast
from backend.soundcloud import download_soundcloud_track, is_valid_soundcloud_url, normalize_soundcloud_url, slugify as sc_slugify

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
OUTPUT_DIR = BASE_DIR / "separated_web"

ensure_output_dir(UPLOAD_DIR)
ensure_output_dir(OUTPUT_DIR)

ALLOWED_EXTENSIONS = {".mp3", ".wav", ".flac", ".m4a", ".ogg", ".aac"}


def slugify(name: str) -> str:
    stem = Path(name).stem
    stem = re.sub(r"[^a-zA-Z0-9_-]+", "_", stem).strip("_")
    return stem or "track"


@dataclass
class JobState:
    id: str
    status: str = "queued"
    progress: str = "Queued"
    trackName: str | None = None
    stems: dict[str, str] | None = None
    error: str | None = None
    inputPath: str | None = None
    outputPath: str | None = None
    source: str = "upload"
    sourceUrl: str | None = None
    debug: dict[str, Any] = field(default_factory=dict)


JOBS: dict[str, JobState] = {}

app = FastAPI(title="Stem Separation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/files", StaticFiles(directory=str(OUTPUT_DIR)), name="files")


class SoundCloudRequest(BaseModel):
    url: str


@app.get("/api/health")
def health():
    return {"ok": True}


@app.post("/api/separate")
async def separate(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing uploaded file.")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    job_id = uuid.uuid4().hex
    track_name = slugify(file.filename)
    input_name = f"{job_id}_{track_name}{ext}"
    input_path = UPLOAD_DIR / input_name

    input_path.write_bytes(data)

    JOBS[job_id] = JobState(
        id=job_id,
        status="queued",
        progress="Upload received.",
        trackName=track_name,
        inputPath=str(input_path),
        source="upload",
    )

    threading.Thread(target=run_job, args=(job_id,), daemon=True).start()
    return {"jobId": job_id}


@app.post("/api/separate-soundcloud")
async def separate_soundcloud(payload: SoundCloudRequest):
    url = payload.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="Missing SoundCloud URL.")

    try:
        normalized = normalize_soundcloud_url(url)
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    if not is_valid_soundcloud_url(normalized):
        raise HTTPException(status_code=400, detail="That does not look like a valid SoundCloud track URL.")

    job_id = uuid.uuid4().hex

    JOBS[job_id] = JobState(
        id=job_id,
        status="queued",
        progress="Resolving SoundCloud track...",
        trackName=None,
        source="soundcloud",
        sourceUrl=normalized,
    )

    threading.Thread(target=run_soundcloud_job, args=(job_id,), daemon=True).start()
    return {"jobId": job_id}


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return {
        "jobId": job.id,
        "status": job.status,
        "progress": job.progress,
        "trackName": job.trackName,
        "stems": job.stems,
        "error": job.error,
        "source": job.source,
        "debug": job.debug,
    }


@app.get("/api/debug/job/{job_id}")
def debug_job(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return {
        "inputPath": job.inputPath,
        "outputPath": job.outputPath,
        "stems": job.stems,
        "debug": job.debug,
    }


@app.get("/api/file")
def get_file(path: str):
    file_path = (OUTPUT_DIR / path).resolve()
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {file_path}")
    if OUTPUT_DIR.resolve() not in file_path.parents and file_path != OUTPUT_DIR.resolve():
        raise HTTPException(status_code=403, detail="Forbidden path")
    return FileResponse(file_path)


def run_soundcloud_job(job_id: str):
    job = JOBS[job_id]
    try:
        job.status = "processing"
        job.progress = "Downloading track from SoundCloud..."

        download_dir = UPLOAD_DIR / f"sc_{job_id}"
        wav_path, title = download_soundcloud_track(job.sourceUrl, download_dir)

        track_name = sc_slugify(title)
        final_input = UPLOAD_DIR / f"{job_id}_{track_name}.wav"
        shutil.move(str(wav_path), str(final_input))
        shutil.rmtree(download_dir, ignore_errors=True)

        job.inputPath = str(final_input)
        job.trackName = track_name
        job.progress = "Track downloaded. Starting separation..."

        _run_separation(job)

    except Exception as e:
        job.status = "error"
        job.error = f"{type(e).__name__}: {e}"
        job.progress = "SoundCloud download failed."
        job.debug["traceback"] = traceback.format_exc()


def run_job(job_id: str):
    job = JOBS[job_id]
    try:
        _run_separation(job)
    except Exception as e:
        job.status = "error"
        job.error = f"{type(e).__name__}: {e}"
        job.progress = "Separation failed."
        job.debug["traceback"] = traceback.format_exc()


def _run_separation(job: JobState):
    input_path = Path(job.inputPath)
    device = detect_device(None)
    profile = get_separation_profile(device)

    job.status = "processing"
    job.progress = f"Running Demucs on {device}..."
    job.debug["device"] = device
    job.debug["profile"] = profile

    track_output_dir = OUTPUT_DIR / job.id
    if track_output_dir.exists():
        shutil.rmtree(track_output_dir, ignore_errors=True)
    ensure_output_dir(track_output_dir)

    stem_dir = run_demucs_fast(
        input_file=input_path,
        output_dir=track_output_dir,
        model_name=profile["model"],
        device=device,
        segment=profile["segment"],
        shifts=profile["shifts"],
        overlap=profile["overlap"],
        jobs=profile["jobs"],
    )

    job.outputPath = str(stem_dir)
    job.progress = "Validating generated files..."

    stems = {}
    for name in ["drums", "bass", "vocals", "other"]:
        wav_path = stem_dir / f"{name}.wav"
        mp3_path = stem_dir / f"{name}.mp3"
        target = wav_path if wav_path.exists() else mp3_path if mp3_path.exists() else None
        if not target:
            raise RuntimeError(f"Missing expected stem file for {name} in {stem_dir}")
        rel = target.relative_to(OUTPUT_DIR).as_posix()
        stems[name] = f"/files/{rel}"

    job.stems = stems
    job.status = "done"
    job.progress = "Separation complete."