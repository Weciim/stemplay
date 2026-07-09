from __future__ import annotations

import argparse
import os
import shlex
import sys
from pathlib import Path

import torch
import demucs.separate

FAST_MODEL = "htdemucs"
MAX_SEPARATION_SECONDS = int(os.environ.get("MAX_SEPARATION_SECONDS", "120"))


def detect_device(force_device: str | None = None) -> str:
    if force_device:
        return force_device
    return "cuda" if torch.cuda.is_available() else "cpu"


def get_separation_profile(device: str) -> dict:
    cpus = os.cpu_count() or 4
    if device == "cuda":
        return {
            "model": FAST_MODEL,
            "segment": 7,
            "shifts": 1,
            "overlap": 0.25,
            "jobs": 0,
        }
    return {
        "model": FAST_MODEL,
        "segment": 7,
        "shifts": 0,
        "overlap": 0.1,
        "jobs": min(cpus, 8),
    }


def get_safe_segment(model: str) -> int:
    if model.startswith("htdemucs"):
        return 7
    return 10


def ensure_output_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def maybe_print_gpu_info(device: str) -> None:
    print(f"[info] selected device: {device}")
    if device == "cuda":
        try:
            print(f"[info] torch cuda available: {torch.cuda.is_available()}")
            print(f"[info] cuda version: {torch.version.cuda}")
            print(f"[info] gpu: {torch.cuda.get_device_name(0)}")
        except Exception as e:
            print(f"[warn] could not read GPU info: {e}")


def run_demucs(
    input_file: Path,
    output_dir: Path,
    model: str,
    device: str,
    mp3: bool,
    mp3_bitrate: int,
    segment: int | None,
    shifts: int,
    two_stems: str | None,
    overlap: float = 0.25,
    jobs: int = 0,
) -> None:
    args = [
        "-n", model,
        "-d", device,
        "-o", str(output_dir),
        "--overlap", str(overlap),
        "-j", str(jobs),
    ]

    if mp3:
        args += ["--mp3", "--mp3-bitrate", str(mp3_bitrate)]

    if segment is not None:
        args += ["--segment", str(segment)]

    if shifts > 0:
        args += ["--shifts", str(shifts)]

    if two_stems:
        args += ["--two-stems", two_stems]

    args += [str(input_file)]

    print("[info] running demucs with args:")
    print("python -m demucs " + " ".join(shlex.quote(x) for x in args))

    try:
        demucs.separate.main(args)
    except SystemExit as exc:
        code = exc.code if exc.code is not None else 1
        if code != 0:
            raise RuntimeError(f"Demucs exited with status {code}") from exc


def save_wav_stem(path: Path, wav: torch.Tensor, samplerate: int) -> None:
    import soundfile as sf

    from demucs.audio import prevent_clip

    wav = prevent_clip(wav, mode="rescale")
    data = wav.detach().cpu().numpy()
    if data.ndim == 2:
        data = data.T
    path.parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(path), data, samplerate, subtype="PCM_16")


def run_demucs_fast(
    input_file: Path,
    output_dir: Path,
    model_name: str,
    device: str,
    segment: int | None = 7,
    shifts: int = 0,
    overlap: float = 0.1,
    jobs: int = 8,
) -> Path:
    """Programmatic fast path: loads WAV directly and uses parallel CPU workers."""
    import soundfile as sf
    from demucs.apply import apply_model
    from demucs.audio import convert_audio
    from demucs.pretrained import get_model

    torch.set_num_threads(min(jobs or 4, os.cpu_count() or 4))

    print(
        f"[info] fast separation: model={model_name} device={device} "
        f"shifts={shifts} overlap={overlap} jobs={jobs} segment={segment}"
    )

    model = get_model(model_name)
    model.eval()

    data, sr = sf.read(str(input_file), always_2d=True)
    wav = torch.from_numpy(data.T.astype("float32"))
    wav = convert_audio(wav, sr, model.samplerate, model.audio_channels)

    ref = wav.mean(0)
    wav = (wav - ref.mean()) / max(ref.std(), 1e-8)

    sources = apply_model(
        model,
        wav[None],
        device=device,
        shifts=shifts,
        split=True,
        overlap=overlap,
        progress=True,
        num_workers=jobs if device == "cpu" else 0,
        segment=segment,
    )[0]
    sources = sources * ref.std() + ref.mean()

    out = output_dir / model_name
    out.mkdir(parents=True, exist_ok=True)
    stem_dir = out / input_file.stem
    stem_dir.mkdir(parents=True, exist_ok=True)

    for source, name in zip(sources, model.sources):
        save_wav_stem(stem_dir / f"{name}.wav", source, model.samplerate)

    print(f"[done] stems written to {stem_dir}")
    return stem_dir


def main() -> int:
    parser = argparse.ArgumentParser(description="GPU-first Demucs stem separation wrapper")
    parser.add_argument("input", type=str, help="Path to input audio file")
    parser.add_argument("-o", "--output", type=str, default="separated_web", help="Output directory")
    parser.add_argument("-n", "--model", type=str, default=FAST_MODEL, help="Demucs model name")
    parser.add_argument("--device", type=str, choices=["cuda", "cpu"], default=None, help="Force device")
    parser.add_argument("--wav", action="store_true", help="Export WAV instead of MP3")
    parser.add_argument("--mp3-bitrate", type=int, default=320, help="MP3 bitrate")
    parser.add_argument("--segment", type=int, default=None, help="Segment size; auto-tuned for model")
    parser.add_argument("--shifts", type=int, default=None, help="Extra shifts for quality; slower when > 1")
    parser.add_argument("--two-stems", type=str, default=None, help="Example: vocals")
    args = parser.parse_args()

    input_file = Path(args.input).expanduser().resolve()
    output_dir = Path(args.output).expanduser().resolve()

    if not input_file.exists():
        print(f"[error] input file not found: {input_file}")
        return 1

    ensure_output_dir(output_dir)

    device = detect_device(args.device)
    maybe_print_gpu_info(device)

    profile = get_separation_profile(device)
    segment = args.segment or profile["segment"]
    shifts = profile["shifts"] if args.shifts is None else args.shifts
    print(f"[info] using segment: {segment}s")

    mp3 = not args.wav

    try:
        run_demucs_fast(
            input_file=input_file,
            output_dir=output_dir,
            model_name=args.model,
            device=device,
            segment=segment,
            shifts=shifts,
            overlap=profile["overlap"],
            jobs=profile["jobs"],
        )
    except RuntimeError as e:
        msg = str(e).lower()
        if device == "cuda" and ("out of memory" in msg or "cuda" in msg):
            print("[warn] cuda failed, retrying on cpu...")
            cpu_profile = get_separation_profile("cpu")
            run_demucs_fast(
                input_file=input_file,
                output_dir=output_dir,
                model_name=args.model,
                device="cpu",
                segment=segment,
                shifts=cpu_profile["shifts"],
                overlap=cpu_profile["overlap"],
                jobs=cpu_profile["jobs"],
            )
        else:
            raise

    print("[done] separation complete.")
    print(f"[done] output folder: {output_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
