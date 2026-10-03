"""Export the trained model for the phone and write the 4 hand-off files.

  1. PyTorch → ONNX (fp32), input "input" [1,3,224,224], output "logits".
  2. Try int8 weight quantisation; keep it only if it agrees with fp32 (parity check).
  3. Copy rice.onnx + labels.json + preprocess.json + threshold.json (from eval.json) to the app.

Usage: python ml/export.py --run runs/ft --out frontend/public/model [--check-images data/clean]
"""

import argparse
import json
import random
import shutil
from pathlib import Path

import numpy as np
import onnxruntime as ort
import torch
from onnxruntime.quantization import QuantType, quantize_dynamic
from PIL import Image

from common import CLASSES, PREPROCESS, write_handoff_json
from train import build_model, transforms_for


def export_fp32(run: Path, path: Path) -> None:
    model = build_model("finetune")
    model.load_state_dict(torch.load(run / "model.pt", map_location="cpu"))
    model.eval()
    size = PREPROCESS["size"]
    torch.onnx.export(model, torch.zeros(1, 3, size, size), path, input_names=["input"],
                      output_names=["logits"], opset_version=17, dynamo=False)


def sample_inputs(folder: Path | None, n: int = 200) -> list[np.ndarray]:
    if folder is None:
        return [np.random.rand(1, 3, PREPROCESS["size"], PREPROCESS["size"]).astype(np.float32) for _ in range(20)]
    paths = [p for p in folder.rglob("*.jpg")]
    random.Random(0).shuffle(paths)
    tf = transforms_for(False)
    return [tf(Image.open(p).convert("RGB"))[None].numpy() for p in paths[:n]]


def agreement(a: Path, b: Path, inputs: list[np.ndarray]) -> float:
    sa, sb = ort.InferenceSession(str(a)), ort.InferenceSession(str(b))
    same = [sa.run(None, {"input": x})[0].argmax() == sb.run(None, {"input": x})[0].argmax() for x in inputs]
    return float(np.mean(same))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", required=True)
    parser.add_argument("--out", default="frontend/public/model")
    parser.add_argument("--check-images", default=None, help="folder of real images for the parity check")
    parser.add_argument("--min-agreement", type=float, default=0.97)
    args = parser.parse_args()

    run, out = Path(args.run), Path(args.out)
    fp32, int8 = run / "rice_fp32.onnx", run / "rice_int8.onnx"
    export_fp32(run, fp32)
    quantize_dynamic(str(fp32), str(int8), weight_type=QuantType.QUInt8)

    inputs = sample_inputs(Path(args.check_images) if args.check_images else None)
    agree = agreement(fp32, int8, inputs)
    chosen = int8 if agree >= args.min_agreement else fp32
    print(f"fp32 {fp32.stat().st_size / 1e6:.1f} MB · int8 {int8.stat().st_size / 1e6:.1f} MB · "
          f"int8 agrees with fp32 on {agree:.1%} → shipping {chosen.name}")

    ev = json.loads((run / "eval.json").read_text())
    metrics = {k: ev[k] for k in ("val", "test_heldout_source", "nonrice") if k in ev}
    out.mkdir(parents=True, exist_ok=True)
    shutil.copy(chosen, out / "rice.onnx")
    write_handoff_json(out, CLASSES, ev["temperature"], ev["min_prob"], ev["min_margin"], dummy=False,
                       metrics={"variant": chosen.name, "int8_agreement": round(agree, 4),
                                "size_mb": round(chosen.stat().st_size / 1e6, 2), **metrics})
    print(f"Hand-off files written to {out}. Check the app still loads them, then commit.")


if __name__ == "__main__":
    main()
