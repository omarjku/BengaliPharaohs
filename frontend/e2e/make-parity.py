# Builds e2e/fixtures/parity/{img}.jpg + expected.json using the ML pipeline (ml/train.py transforms_for(False) + onnxruntime).
# Run from the original repo checkout that has data/ and .venv-ml:  .venv-ml/bin/python <this file>
import glob, json, os, random, shutil, sys
import numpy as np, onnxruntime as ort
from PIL import Image
ROOT = "/Users/omar/BengaliPharaohs"
sys.path.insert(0, ROOT + "/ml")
from train import transforms_for
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures/parity")
M = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + "/public/model/"
labels = json.load(open(M + "labels.json")); T = json.load(open(M + "threshold.json"))["temperature"]
sess = ort.InferenceSession(M + "rice.onnx", providers=["CPUExecutionProvider"])
random.seed(7)
files = []
for c in ["healthy", "blast", "brown_spot", "blb"]:
    files += random.sample(sorted(glob.glob(f"{ROOT}/data/clean/{c}/AgML_BD__*.jpg")), 10)
files += random.sample(sorted(glob.glob(f"{ROOT}/data/nonrice/beans/*.jpg")), 10)
tf = transforms_for(False); exp = {}
for f in files:
    name = os.path.basename(os.path.dirname(f)) + "_" + os.path.basename(f)
    shutil.copy(f, f"{OUT}/{name}")
    x = tf(Image.open(f).convert("RGB")).unsqueeze(0).numpy().astype(np.float32)
    lg = sess.run(None, {"input": x})[0][0]
    z = lg / T; p = np.exp(z - z.max()); p /= p.sum()
    exp[name] = {"top1": labels[int(p.argmax())], "probs": p.tolist()}
json.dump(exp, open(f"{OUT}/expected.json", "w"))
print(len(exp))
