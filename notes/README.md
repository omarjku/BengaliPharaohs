# Room transcripts

The laptop records the room and turns every 2 h of talk into a text file Claude can read.
Audio stays on the laptop (gitignored); only the text in `notes/transcripts/` is committed (repo is private).

## Setup (once, ~10 min, needs Wi-Fi for the downloads)
```bash
brew install ffmpeg      # skip if `ffmpeg -version` works
make record-setup        # Python venv + faster-whisper + the Whisper model (~500 MB)
make mics                # optional: list microphones; default is device :0
```
First `make record` asks for microphone access: allow it for your terminal app
(System Settings → Privacy & Security → Microphone), then run `make record` again.

## Use
```bash
make record                                   # 2 h chunks, Ctrl+C to stop (last chunk is still transcribed)
MIC=":1" make record                          # another mic, from `make mics`
WHISPER_LANGUAGE=en make record               # force English (default: auto-detect per chunk)
CHUNK_SECONDS=3600 make record                # 1 h chunks
make transcribe                               # catch up on any chunk without a transcript (e.g. after a crash)
```
Keep the lid open and the charger in (`caffeinate` keeps the Mac awake). Put the laptop between the two of you.
Transcription runs in the background after each chunk; progress is in `notes/audio/transcribe.log`.

## Hand it to Claude
```bash
git add notes/transcripts && git commit -m "Transcript $(date +%H:%M)" && git push
```
Then tell Claude: "new transcript". Claude extracts decisions, open questions and TODOs into
`CLAUDE.md` ("Current status", "Decisions made") and `TODO.md` — don't paste raw transcripts into those files.

Limits: speakers are not labelled; noisy rooms and other teams' voices reduce accuracy; tell people at your table you are recording.
