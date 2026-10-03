"""Generate the Bangla audio clips from audio/script.json. The app ships the mp3 files and plays them offline
(no TTS on the phone). Name the voice honestly in the video, e.g. "Bangla voice: ElevenLabs, checked by a native speaker".

Providers
  elevenlabs (default)  needs an API key: put  ELEVENLABS_API_KEY=...  in frontend/.env.elevenlabs (git-ignored)
                        or set it as an environment variable. Never paste the key into chat or commit it.
  edge                  Microsoft bn-BD neural voices via edge-tts (no key): bn-BD-PradeepNeural / bn-BD-NabanitaNeural

  node scripts/gen-audio-script.mjs                                     # refresh the text first
  python scripts/tts.py --list-voices                                   # ElevenLabs voices in your account
  python scripts/tts.py --voice-id <id> --only C3-BROWNSPOT SH-ASK --out audio/samples --suffix=-el   # sample
  python scripts/tts.py --voice-id <id>                                 # all clips → public/audio/<id>.mp3
  python scripts/tts.py --provider edge --voice bn-BD-NabanitaNeural    # Microsoft voice instead
"""

import argparse
import asyncio
import json
import os
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
EL_API = "https://api.elevenlabs.io/v1"


def el_key() -> str:
    key = os.environ.get("ELEVENLABS_API_KEY")
    env = HERE / ".env.elevenlabs"
    if not key and env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            if line.strip().startswith("ELEVENLABS_API_KEY="):
                key = line.split("=", 1)[1].strip().strip('"')
    if not key:
        raise SystemExit("No ElevenLabs key. Create frontend/.env.elevenlabs with ELEVENLABS_API_KEY=... (see the top of this file).")
    return key


def el_request(path: str, body: dict | None = None) -> bytes:
    req = urllib.request.Request(
        EL_API + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"xi-api-key": el_key(), "Content-Type": "application/json", "Accept": "*/*"},
        method="POST" if body is not None else "GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code}: {e.read().decode(errors='replace')[:300]}") from None


def list_voices() -> None:
    data = json.loads(el_request("/voices"))
    for v in data.get("voices", []):
        labels = ", ".join(f"{k}={val}" for k, val in (v.get("labels") or {}).items())
        print(f"{v['voice_id']}  {v['name']:<28} {labels}")


async def make_elevenlabs(clip: dict, a: argparse.Namespace, path: Path) -> None:
    body = {
        "text": clip["text"],
        "model_id": a.model,
        "voice_settings": {"stability": a.stability, "similarity_boost": 0.75, "speed": a.speed},
    }
    if a.language_code:
        body["language_code"] = a.language_code
    audio = await asyncio.to_thread(el_request, f"/text-to-speech/{a.voice_id}?output_format=mp3_44100_64", body)
    path.write_bytes(audio)


async def make_edge(clip: dict, a: argparse.Namespace, path: Path) -> None:
    import edge_tts  # only needed for this provider

    await edge_tts.Communicate(clip["text"], a.voice, rate=a.rate).save(str(path))


async def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--provider", choices=["elevenlabs", "edge"], default="elevenlabs")
    p.add_argument("--list-voices", action="store_true", help="ElevenLabs: print voice ids in your account")
    p.add_argument("--voice-id", help="ElevenLabs voice id (from --list-voices or the Voice Library)")
    p.add_argument("--model", default="eleven_v3", help="ElevenLabs model; eleven_v3 covers Bengali")
    p.add_argument("--language-code", default=None, help="optional, e.g. bn (only some models accept it)")
    p.add_argument("--stability", type=float, default=0.5)
    p.add_argument("--speed", type=float, default=0.95, help="slightly slower reads better for farmers")
    p.add_argument("--voice", default="bn-BD-PradeepNeural", help="edge only")
    p.add_argument("--rate", default="-8%", help="edge only")
    p.add_argument("--only", nargs="*", help="clip ids to generate (default: all)")
    p.add_argument("--out", default="public/audio")
    p.add_argument("--suffix", default="")
    a = p.parse_args()

    if a.list_voices:
        return list_voices()
    if a.provider == "elevenlabs" and not a.voice_id:
        raise SystemExit("Pass --voice-id (run --list-voices to see yours).")

    clips = json.loads((HERE / "audio/script.json").read_text(encoding="utf-8"))
    if a.only:
        clips = [c for c in clips if c["id"] in a.only]
    chars = sum(len(c["text"]) for c in clips)
    print(f"{len(clips)} clips, {chars} characters → {a.provider}")
    out = HERE / a.out
    out.mkdir(parents=True, exist_ok=True)
    make = make_elevenlabs if a.provider == "elevenlabs" else make_edge
    sem = asyncio.Semaphore(2 if a.provider == "elevenlabs" else 4)  # stay under the API's concurrency limit

    async def one(c: dict) -> str:
        path = out / f"{c['id']}{a.suffix}.mp3"
        async with sem:
            try:
                await make(c, a, path)
                return f"{path.name}  {path.stat().st_size // 1024} KB"
            except Exception as e:  # noqa: BLE001 - report and continue with the other clips
                return f"FAILED {c['id']}: {e}"

    for line in await asyncio.gather(*(one(c) for c in clips)):
        print(line)


if __name__ == "__main__":
    asyncio.run(main())
