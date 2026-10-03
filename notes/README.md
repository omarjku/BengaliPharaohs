# Room transcripts

The laptop listens in the room and saves a text transcript every 30 minutes for Claude.
Audio stays on the laptop; only the text is pushed (the repo is private).

## Set up (once, 10 minutes, on the Mac that stays in the room)
1. Open Terminal and go to the repo: `cd BengaliPharaohs` then `git pull`
2. Install ffmpeg: `brew install ffmpeg`
3. Install the transcriber: `make record-setup` (downloads ~500 MB, needs Wi-Fi)
4. Test it: `CHUNK_SECONDS=60 make record`
   - A popup asks for microphone access → **Allow**. If no popup or it fails: System Settings → Privacy & Security → Microphone → turn on Terminal, then run the command again.
   - Talk for a minute, press **Ctrl+C**, then open the newest file in `notes/transcripts/`. If you see your words, it works.

## Every session
1. Start: `make record` and leave the Terminal window open.
2. Keep the lid open, charger plugged in, laptop between the two of you.
3. Stop any time with **Ctrl+C** (the last part is still saved).

## Every 30 min or so, send it to Claude
```bash
git add notes/transcripts && git commit -m "Transcript $(date +%H:%M)" && git push
```
Then tell Claude: **"new transcript"**.

## If something goes wrong
| Problem | Fix |
|---|---|
| "Run 'make record-setup' first" | Run step 3 of setup |
| "No audio written" | Allow the microphone (setup step 4), or try another mic: `make mics`, then `MIC=":1" make record` |
| A transcript is missing after a crash | `make transcribe` |
| Transcripts are wrong language | `WHISPER_LANGUAGE=en make record` |
| Transcription falls behind or the laptop gets hot | `WHISPER_MODEL=base make record` |

Progress of the background transcription: `notes/audio/transcribe.log`.
Speakers are not labelled. Tell people at your table you are recording.
