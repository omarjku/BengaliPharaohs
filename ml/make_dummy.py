"""Write a DUMMY model + the 3 hand-off JSON files so the app can be built before training.

The dummy has the exact same input/output contract as the real model:
  input  "input"  float32 [1, 3, 224, 224]  (NCHW, normalised with preprocess.json)
  output "logits" float32 [1, n_classes]
Its answers are meaningless (average colour → fixed random weights). Replace the files
with ml/export.py output later; names and shapes stay the same, so the app needs no change.

Usage: python ml/make_dummy.py [--out frontend/public/model]
"""

import argparse
import json
from pathlib import Path

import numpy as np
import onnx
from onnx import TensorProto, helper, numpy_helper

from common import CLASSES, PREPROCESS, write_handoff_json


def build_dummy(n_classes: int, size: int) -> onnx.ModelProto:
    rng = np.random.default_rng(0)
    weight = numpy_helper.from_array(rng.normal(0, 1, (3, n_classes)).astype(np.float32), "W")
    bias = numpy_helper.from_array(np.zeros(n_classes, np.float32), "B")
    nodes = [
        helper.make_node("GlobalAveragePool", ["input"], ["pooled"]),  # [1,3,1,1]
        helper.make_node("Flatten", ["pooled"], ["flat"]),  # [1,3]
        helper.make_node("Gemm", ["flat", "W", "B"], ["logits"]),  # [1,n]
    ]
    graph = helper.make_graph(
        nodes,
        "rice_dummy",
        [helper.make_tensor_value_info("input", TensorProto.FLOAT, [1, 3, size, size])],
        [helper.make_tensor_value_info("logits", TensorProto.FLOAT, [1, n_classes])],
        initializer=[weight, bias],
    )
    model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 17)])
    model.ir_version = 8  # readable by onnxruntime-web
    model.doc_string = "DUMMY model: random answers, for building the app only."
    onnx.checker.check_model(model)
    return model


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="frontend/public/model")
    args = parser.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    onnx.save(build_dummy(len(CLASSES), PREPROCESS["size"]), out / "rice.onnx")
    write_handoff_json(out, CLASSES, temperature=1.0, min_prob=0.70, min_margin=0.20, dummy=True)
    print(f"Wrote DUMMY model + labels/preprocess/threshold JSON to {out}")


if __name__ == "__main__":
    main()
