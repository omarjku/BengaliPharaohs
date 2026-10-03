"""Transcribe room recordings to Markdown for Claude.

Usage: python scripts/transcribe.py [audio files...]
With no arguments, transcribes every notes/audio/*.ogg that has no transcript yet.
Each notes/audio/<stamp>.ogg becomes notes/transcripts/<stamp>.md with wall-clock timestamps.
Runs fully offline after the first model download. Model: WHISPER_MODEL (default "small").
"""

import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

from faster_whisper import WhisperModel

ROOT = Path(__file__).resolve().parent.parent
AUDIO_DIR = ROOT / "notes" / "audio"
TRANSCRIPT_DIR = ROOT / "notes" / "transcripts"
STAMP_FORMAT = "%Y-%m-%d-%H%M%S"


def transcript_path(audio: Path) -> Path:
    return TRANSCRIPT_DIR / f"{audio.stem}.md"


def chunk_start(audio: Path) -> datetime | None:
    """The recorder names chunks by their start time; other files get relative timestamps."""
    try:
        return datetime.strptime(audio.stem, STAMP_FORMAT)
    except ValueError:
        return None


def format_time(start: datetime | None, offset_s: float) -> str:
    if start is None:
        return str(timedelta(seconds=int(offset_s)))
    return (start + timedelta(seconds=offset_s)).strftime("%H:%M:%S")


def transcribe(model: WhisperModel, audio: Path) -> Path:
    start = chunk_start(audio)
    language = os.environ.get("WHISPER_LANGUAGE") or None  # None = auto-detect per chunk
    # vad_filter skips silence: much faster on a mostly quiet room and avoids hallucinated text.
    segments, info = model.transcribe(str(audio), language=language, vad_filter=True)

    out = transcript_path(audio)
    tmp = out.with_suffix(".md.part")
    header = start.strftime("%a %d %b %Y, %H:%M") if start else audio.name
    lines = 0
    with tmp.open("w", encoding="utf-8") as f:
        f.write(f"# Room transcript: {header}\n\n")
        f.write(f"Source: `{audio.name}` · language: {info.language} · "
                f"audio: {int(info.duration // 60)} min · speakers are not labelled\n\n")
        for seg in segments:
            text = seg.text.strip()
            if text:
                f.write(f"[{format_time(start, seg.start)}] {text}\n")
                lines += 1
        if lines == 0:
            f.write("_No speech detected._\n")
    tmp.rename(out)  # only a finished transcript gets the .md name
    return out


def main() -> None:
    files = [Path(a) for a in sys.argv[1:]] or sorted(AUDIO_DIR.glob("*.ogg"))
    pending = [a for a in files if not transcript_path(a).exists()]
    if not pending:
        print("Nothing to transcribe.")
        return

    TRANSCRIPT_DIR.mkdir(parents=True, exist_ok=True)
    model_name = os.environ.get("WHISPER_MODEL", "small")
    # int8 on CPU is the fast, low-memory setting that works on any Mac or Linux laptop.
    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    for audio in pending:
        print(f"Transcribing {audio.name} with '{model_name}'...", flush=True)
        print(f"Wrote {transcribe(model, audio).relative_to(ROOT)}", flush=True)


if __name__ == "__main__":
    main()
