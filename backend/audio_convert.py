from __future__ import annotations

import os
import shutil
import subprocess
import wave
from pathlib import Path

MAX_SEPARATION_SECONDS = int(os.environ.get("MAX_SEPARATION_SECONDS", "120"))


def _ffmpeg_exe() -> str | None:
    try:
        import imageio_ffmpeg  # type: ignore

        bundled = imageio_ffmpeg.get_ffmpeg_exe()
        if bundled:
            return bundled
    except Exception:
        pass
    return shutil.which("ffmpeg")


def convert_to_wav(input_path: Path, output_path: Path) -> Path:
    """Convert any supported upload to 44.1kHz stereo WAV for Demucs."""
    if input_path.suffix.lower() == ".wav":
        try:
            with wave.open(str(input_path), "rb") as wav_file:
                if wav_file.getnchannels() > 0:
                    return input_path
        except wave.Error:
            pass

    output_path.parent.mkdir(parents=True, exist_ok=True)
    ffmpeg = _ffmpeg_exe()
    if not ffmpeg:
        raise RuntimeError(
            "Cannot decode this audio format. Install FFmpeg or run: pip install imageio-ffmpeg"
        )

    cmd = [
        ffmpeg,
        "-y",
        "-i",
        str(input_path),
        "-ar",
        "44100",
        "-ac",
        "2",
    ]
    if MAX_SEPARATION_SECONDS > 0:
        cmd.extend(["-t", str(MAX_SEPARATION_SECONDS)])
    cmd.append(str(output_path))
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        detail = (result.stderr or result.stdout or "").strip()
        raise RuntimeError(detail or "Audio conversion failed")

    if not output_path.exists() or output_path.stat().st_size == 0:
        raise RuntimeError("Audio conversion produced an empty file")

    return output_path
