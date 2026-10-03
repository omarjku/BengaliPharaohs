"""Shared constants for the rice-leaf model. The class order here IS the model's output order."""

import json
import re
from pathlib import Path

# Final classes (docs/redteam/README.md §2). Add "leaf_scald" only if it has >= 300 clean images.
CLASSES = ["healthy", "blast", "brown_spot", "sheath_blight", "tungro", "blb", "not_rice"]
# "not_rice" = other plants' leaves (BD jackfruit/banana/chilli/bean/lemon, CC BY 4.0); the app treats it as NOT SURE.
NOT_RICE = "not_rice"

# Must match what the model was trained with; the app reads this file to prepare photos.
PREPROCESS = {
    "size": 224,
    "resize_short_side": 256,  # resize, then centre-crop to `size`
    "mean": [0.485, 0.456, 0.406],
    "std": [0.229, 0.224, 0.225],
    "layout": "NCHW",
    "input_name": "input",
    "output_name": "logits",
}

# Every dataset label we know → our class (None = drop). Extend when a new dataset appears.
LABEL_MAP = {
    "healthy": "healthy", "healthy_leaf": "healthy", "healthy_rice_leaf": "healthy", "normal": "healthy",
    "blast": "blast", "leaf_blast": "blast", "leafblast": "blast", "rice_blast": "blast",
    "brown_spot": "brown_spot", "brownspot": "brown_spot", "brown spot": "brown_spot",
    "sheath_blight": "sheath_blight", "sheathblight": "sheath_blight", "sheath blight": "sheath_blight",
    "tungro": "tungro", "rice_tungro": "tungro",
    "bacterial_leaf_blight": "blb", "bacterial leaf blight": "blb", "bacterialblight": "blb",
    "bacterial_blight": "blb", "blb": "blb",
    # Typos as they appear in the dataset folders (Dhan-Shomadhan)
    "browon_spot": "brown_spot", "rice_turgro": "tungro", "shath_blight": "sheath_blight",
    "leaf_scald": None, "scald": None, "leaf_scaled": None,  # set to "leaf_scald" if you add the class
    "bacterial_leaf_streak": None, "narrow_brown_spot": None, "leaf_smut": None,
    "not_rice": "not_rice",
    "hispa": None, "leaf_folder": None, "insect_damage": None, "stripes": None,
}


def normalise_label(raw: str) -> str | None:
    key = re.sub(r"[\s_]*\(.*?\)", "", raw).strip().lower().replace("-", "_")  # "Bacterial Leaf Blight (BLB)"
    if key in LABEL_MAP:
        return LABEL_MAP[key]
    key = key.replace(" ", "_")
    return LABEL_MAP.get(key, LABEL_MAP.get(key.replace("_", ""), None))


def write_handoff_json(out: Path, classes: list[str], temperature: float, min_prob: float,
                       min_margin: float, dummy: bool = False, metrics: dict | None = None) -> None:
    """The 3 JSON files the app reads next to rice.onnx."""
    (out / "labels.json").write_text(json.dumps(classes, indent=2))
    (out / "preprocess.json").write_text(json.dumps(PREPROCESS, indent=2))
    threshold = {"temperature": round(temperature, 4), "min_prob": min_prob, "min_margin": min_margin,
                 "dummy": dummy, "metrics": metrics or {}}
    (out / "threshold.json").write_text(json.dumps(threshold, indent=2))
