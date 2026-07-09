from __future__ import annotations

import re
import urllib.error
import urllib.request
from pathlib import Path
from typing import Tuple

import yt_dlp

from backend.audio_convert import convert_to_wav, _ffmpeg_exe

SOUNDCLOUD_HOST_RE = re.compile(
    r"^https?://(?:www\.|m\.|on\.)?soundcloud\.com/.+",
    re.IGNORECASE,
)


def slugify(name: str) -> str:
    stem = re.sub(r"[^a-zA-Z0-9_-]+", "_", name).strip("_")
    return stem or "soundcloud_track"


def normalize_soundcloud_url(url: str) -> str:
    url = url.strip()
    if not url:
        return url

    if not re.match(r"^https?://", url, re.IGNORECASE):
        url = f"https://{url}"

    lowered = url.lower()
    if "on.soundcloud.com" in lowered or "snd.sc/" in lowered:
        try:
            req = urllib.request.Request(
                url,
                method="GET",
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
            )
            with urllib.request.urlopen(req, timeout=20) as resp:
                url = resp.geturl()
        except urllib.error.HTTPError as e:
            if e.code != 405:
                raise RuntimeError(f"Could not resolve SoundCloud short link (HTTP {e.code}).") from e
        except Exception as e:
            raise RuntimeError(f"Could not resolve SoundCloud short link: {e}") from e

    return url


def is_valid_soundcloud_url(url: str) -> bool:
    try:
        normalized = normalize_soundcloud_url(url)
    except RuntimeError:
        return False
    return bool(SOUNDCLOUD_HOST_RE.match(normalized))


def _ydl_opts(dest_dir: Path) -> dict:
    opts = {
        "format": "bestaudio/best",
        "outtmpl": str(dest_dir / "%(id)s.%(ext)s"),
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
    }
    ffmpeg = _ffmpeg_exe()
    if ffmpeg:
        opts["ffmpeg_location"] = str(Path(ffmpeg).parent)
    return opts


def download_soundcloud_track(url: str, dest_dir: Path) -> Tuple[Path, str]:
    dest_dir.mkdir(parents=True, exist_ok=True)
    resolved_url = normalize_soundcloud_url(url)

    try:
        with yt_dlp.YoutubeDL(_ydl_opts(dest_dir)) as ydl:
            info = ydl.extract_info(resolved_url, download=True)
    except yt_dlp.utils.DownloadError as e:
        msg = str(e)
        lowered = msg.lower()
        if "404" in msg and "metadata" in lowered:
            raise RuntimeError(
                "Track not found. Use a public SoundCloud track link (soundcloud.com/artist/track)."
            ) from e
        if "private" in lowered:
            raise RuntimeError("This track is private or unavailable.") from e
        raise RuntimeError(f"SoundCloud download failed: {msg}") from e

    if info is None:
        raise RuntimeError("Could not resolve SoundCloud track.")

    title = info.get("title") or info.get("id") or "soundcloud_track"
    video_id = info.get("id")

    downloaded = dest_dir / f"{video_id}.{info.get('ext', 'm4a')}"
    if not downloaded.exists():
        candidates = sorted(dest_dir.glob(f"{video_id}.*"))
        if not candidates:
            raise RuntimeError("Downloaded file not found after extraction.")
        downloaded = candidates[0]

    wav_path = dest_dir / f"{video_id}.wav"
    convert_to_wav(downloaded, wav_path)
    if downloaded != wav_path and downloaded.exists():
        downloaded.unlink(missing_ok=True)

    return wav_path, title
