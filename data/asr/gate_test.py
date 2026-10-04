"""Gate test: does the offline Bengali model transcribe Bangla speech? Uses Zoha's TTS clips (known text)."""
import json, subprocess, sys, time
from pathlib import Path
import numpy as np
import sherpa_onnx

M = Path(__file__).parent / "sherpa-onnx-streaming-zipformer-bn-vosk-2026-02-09"
ENC = sys.argv[1] if len(sys.argv) > 1 else "encoder.onnx"
rec = sherpa_onnx.OnlineRecognizer.from_transducer(
    tokens=str(M / "tokens.txt"), encoder=str(M / ENC), decoder=str(M / "decoder.onnx"),
    joiner=str(M / (sys.argv[2] if len(sys.argv) > 2 else "joiner.onnx")), num_threads=2, sample_rate=16000, feature_dim=80,
    decoding_method="greedy_search")

def load(mp3):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", mp3, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32)

def transcribe(samples):
    s = rec.create_stream()
    s.accept_waveform(16000, samples)
    s.accept_waveform(16000, np.zeros(8000, np.float32))  # tail padding
    s.input_finished()
    while rec.is_ready(s):
        rec.decode_stream(s)
    return rec.get_result(s)

import re
def norm(t):
    t = re.sub(r"[।?!,.\"'\-]", "", t)
    for d, w in zip("০১২৩৪৫৬৭৮৯", ["শূন্য","এক","দুই","তিন","চার","পাঁচ","ছয়","সাত","আট","নয়"]):
        t = t.replace(d, w)
    return t.replace(" ", "")

def cer(ref, hyp):
    ref, hyp = norm(ref), norm(hyp)
    d = list(range(len(hyp) + 1))
    for i, r in enumerate(ref, 1):
        prev, d[0] = d[0], i
        for j, h in enumerate(hyp, 1):
            prev, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, prev + (r != h))
    return d[-1] / max(len(ref), 1)

script = {c["id"]: c["text"] for c in json.load(open("frontend/audio/script.json"))}
ids = [i for i in script if i.startswith(("Q-", "A6-R-"))][:20]
tot_audio = tot_time = 0
cers = []
for cid in ids:
    mp3 = f"frontend/public/audio/{cid}.mp3"
    if not Path(mp3).exists():
        continue
    x = load(mp3)
    t0 = time.time(); hyp = transcribe(x); dt = time.time() - t0
    tot_audio += len(x) / 16000; tot_time += dt
    c = cer(script[cid], hyp); cers.append(c)
    print(f"{cid:16s} CER {c:5.1%}  REF: {script[cid][:60]}\n{'':16s}            HYP: {hyp[:60]}")
print(f"\nmean CER {np.mean(cers):.1%} on {len(cers)} clips · real-time factor {tot_time / tot_audio:.3f} ({ENC}, 2 threads, M4)")
