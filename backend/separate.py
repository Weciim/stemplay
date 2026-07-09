from __future__ import annotations

import argparse
import os
from pathlib import Path

import torch

FAST_MODEL = "htdemucs"


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
        "jobs": min(max(cpus - 1, 1), 4),
    }


def ensure_output_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


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
    jobs: int = 4,
) -> Path:
    import soundfile as sf
    from demucs.apply import apply_model
    from demucs.audio import convert_audio
    from demucs.pretrained import get_model

    torch.set_num_threads(min(max(jobs or 1, 1), os.cpu_count() or 4))

    model = get_model(model_name)
    model.eval()

    data, sr = sf.read(str(input_file), always_2d=True)
    wav = torch.from_numpy(data.T.astype("float32"))
    wav = convert_audio(wav, sr, model.samplerate, model.audio_channels)

    ref = wav.mean(0)
    std = ref.std()
    wav = (wav - ref.mean()) / max(float(std), 1e-8)

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

    sources = sources * std + ref.mean()

    out = output_dir / model_name
    out.mkdir(parents=True, exist_ok=True)
    stem_dir = out / input_file.stem
    stem_dir.mkdir(parents=True, exist_ok=True)

    for source, name in zip(sources, model.sources):
        save_wav_stem(stem_dir / f"{name}.wav", source, model.samplerate)

    return stem_dir


def main() -> int:
    parser = argparse.ArgumentParser(description="Demucs stem separation wrapper")
    parser.add_argument("input", type=str, help="Path to input audio file")
    parser.add_argument("-o", "--output", type=str, default="separated_web", help="Output directory")
    parser.add_argument("-n", "--model", type=str, default=FAST_MODEL, help="Demucs model name")
    parser.add_argument("--device", type=str, choices=["cuda", "cpu"], default=None, help="Force device")
    parser.add_argument("--segment", type=int, default=None, help="Segment size")
    parser.add_argument("--shifts", type=int, default=None, help="Extra shifts")
    args = parser.parse_args()

    input_file = Path(args.input).expanduser().resolve()
    output_dir = Path(args.output).expanduser().resolve()
    if not input_file.exists():
        print(f"[error] input file not found: {input_file}")
        return 1

    ensure_output_dir(output_dir)

    device = detect_device(args.device)
    profile = get_separation_profile(device)
    segment = args.segment or profile["segment"]
    shifts = profile["shifts"] if args.shifts is None else args.shifts

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
    except Exception as e:
        if device == "cuda":
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
            raise e

    return 0


if __name__ == "__main__":
    raise SystemExit(main())