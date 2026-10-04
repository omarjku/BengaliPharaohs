# Offline Bangla speech-to-text — plan (2026-10-04 ~02:15)

## Decision
Use **Vosk small streaming Bengali (Zipformer2 transducer, Apache-2.0)** via **sherpa-onnx WebAssembly**, int8, on the phone, offline.
Model: `sherpa-onnx-streaming-zipformer-bn-vosk-2026-02-09` — https://huggingface.co/alphacep/vosk-model-small-streaming-bn · https://k2-fsa.github.io/sherpa/onnx/pretrained_models/online-transducer/zipformer-transducer-models.html
The farmer's speech is matched to the **current question's fixed answer IDs** (closed vocabulary); anything weak → **"not sure — tap instead"**. No LLM, no free-text answers.

## Gate test (done, `data/asr/gate_test.py`, Zoha's ElevenLabs clips as input)
| Encoder | Size (enc+dec+joiner) | Char error rate (20 clips, punctuation/digits normalised) | Speed on M4, 2 threads |
|---|---|---|---|
| fp32 | 94 MB | 7.8% | 0.032 × real time |
| **int8** (ours, onnxruntime dynamic) | **~28 MB** | **7.8%** | 0.038 × real time |
Published open-vocabulary WER of the model: Common Voice 17.9%, Kathbath 19.3%, noisy 22.5%. **Caveat:** our test used clean TTS voices; real farmers outdoors will be worse — measure with real voices (step 4).

## Alternatives rejected
Whisper-tiny bn (WER 75%), Whisper-small (32.6%, too big), MMS (CC-BY-NC, 1B), Picovoice (no Bengali), vosk-browser (no Bengali Kaldi model), Web Speech API (cloud by default; on-device bn-BD unconfirmed — optional probe only).

## Architecture
```
mic → AudioWorklet (16 kHz mono) → Web Worker: sherpa-onnx WASM streaming recognizer (int8, cached by the service worker)
    → transcript → matcher(question_id): normalise (strip punctuation, Bengali digits ↔ words, spelling variants)
    → fuzzy score vs that question's answer phrases (Levenshtein/Jaro-Winkler on characters)
    → accept only if best ≥ threshold AND best − second ≥ margin → fill the answer, show it, farmer confirms with one tap
    → else: show top-2/3 options as big buttons + "none of these" (tap fallback)
```
- Vocabulary per question comes from `frontend/src/lib/voice-questions.ts` + `strings.ts` (options) + extra synonyms (`frontend/public/data/asr-vocab.json`: e.g. আমন/আমোন, numbers ০–৬০ as digits and words, "ব্রি ধান একান্ন/৫১", "জানি না").
- Yes/no questions (Q-FLOODED, Q-STORM, Q-COLD, Q-SALTY, Q-SEEDLINGS): হ্যাঁ/হ/জি/না/নাহ/জানি না.
- Numbers (Q-DAYS): parse Bengali number words and digits → integer 0–60.

## Build steps & owners
| # | Step | Owner | Time |
|---|---|---|---|
| 1 | Emscripten + sherpa-onnx `build-wasm-simd-asr.sh` with our int8 model in `wasm/asr/assets` → `sherpa-onnx-wasm-main-asr.{js,wasm,data}` | Omar/Claude | 1–1.5 h |
| 2 | `frontend/src/lib/asr/` (worker + mic + `listen(questionId) → {answerId, transcript, score} | notSure`) | Omar/Claude (agreed API with Zoha) | 1.5 h |
| 3 | 🎤 button on each question (UI) + confirm/tap fallback | Zoha | 1 h |
| 4 | Measure: Zoha + 1–2 other voices say 3× each answer (~150 utterances) → slot accuracy, "not sure" rate, latency on the cheap phone → `docs/results.md` | Omar + Zoha | 1 h |
| 5 | Fallback if WASM is too slow/crashes on the phone: run the same model on the laptop for the demo and **say so** (not offline) | — | — |

## Risks
WASM build time · RAM on 1 GB phones (~28 MB model + runtime; test early) · mic permission needs HTTPS · dialect/noise → closed vocabulary + tap fallback · `.data` file must be precached for offline.
