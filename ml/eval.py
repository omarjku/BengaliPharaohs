"""Honest numbers + the "not sure" thresholds, from the logits saved by train.py.

  1. Temperature scaling on the validation logits (makes confidences honest).
  2. Pick min_prob / min_margin: the most answered photos while accuracy-when-answering >= --target.
  3. Report: macro-F1, confusion matrix, risk-coverage, and (optional) non-rice photos → "not sure".
  4. --lodo runs/lodo_*  → leave-one-dataset-out table (the pitch number).

Usage:
  python ml/eval.py --run runs/ft --target 0.90 [--nonrice data/nonrice]
  python ml/eval.py --lodo runs/lodo_*
Writes <run>/eval.json (thresholds are copied into the app by ml/export.py).
"""

import argparse
import glob
import json
from pathlib import Path

import numpy as np

from common import CLASSES, NOT_RICE


def softmax(logits: np.ndarray, t: float = 1.0) -> np.ndarray:
    z = logits / t
    z = z - z.max(axis=1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=1, keepdims=True)


def nll(logits: np.ndarray, labels: np.ndarray, t: float) -> float:
    p = softmax(logits, t)[np.arange(len(labels)), labels]
    return float(-np.log(np.clip(p, 1e-12, 1)).mean())


def fit_temperature(logits: np.ndarray, labels: np.ndarray) -> float:
    grid = np.arange(0.5, 5.01, 0.05)
    return float(grid[np.argmin([nll(logits, labels, t) for t in grid])])


def ece(probs: np.ndarray, labels: np.ndarray, bins: int = 10) -> float:
    """Expected calibration error: gap between confidence and accuracy."""
    conf, pred = probs.max(1), probs.argmax(1)
    edges = np.linspace(0, 1, bins + 1)
    total = 0.0
    for lo, hi in zip(edges[:-1], edges[1:]):
        m = (conf > lo) & (conf <= hi)
        if m.any():
            total += m.mean() * abs((pred[m] == labels[m]).mean() - conf[m].mean())
    return float(total)


def macro_f1(labels: np.ndarray, preds: np.ndarray) -> float:
    scores = []
    for c in range(len(CLASSES)):
        tp, fp = np.sum((preds == c) & (labels == c)), np.sum((preds == c) & (labels != c))
        fn = np.sum((preds != c) & (labels == c))
        if tp + fp + fn:
            scores.append(2 * tp / (2 * tp + fp + fn))
    return float(np.mean(scores)) if scores else 0.0


def answered_mask(probs: np.ndarray, min_prob: float, min_margin: float) -> np.ndarray:
    """True where the app would show a diagnosis; a confident "not_rice" also counts as NOT answered."""
    top2 = np.sort(probs, axis=1)[:, -2:]
    confident = (top2[:, 1] >= min_prob) & (top2[:, 1] - top2[:, 0] >= min_margin)
    if NOT_RICE in CLASSES:
        confident &= probs.argmax(1) != CLASSES.index(NOT_RICE)
    return confident


def choose_thresholds(probs: np.ndarray, labels: np.ndarray, target: float):
    """Largest coverage with accuracy-when-answering >= target."""
    best = None
    pred = probs.argmax(1)
    for min_prob in np.arange(0.60, 0.96, 0.05):  # never answer below 60%: safety floor
        for min_margin in np.arange(0.0, 0.51, 0.05):
            m = answered_mask(probs, min_prob, min_margin)
            if m.sum() < 10:
                continue
            acc, cov = (pred[m] == labels[m]).mean(), m.mean()
            if acc >= target and (best is None or cov > best[2]):
                best = (round(float(min_prob), 2), round(float(min_margin), 2), float(cov), float(acc))
    return best or (0.95, 0.5, 0.0, 0.0)


def confusion(labels: np.ndarray, preds: np.ndarray) -> list[list[int]]:
    m = np.zeros((len(CLASSES), len(CLASSES)), int)
    for y, p in zip(labels, preds):
        m[y, p] += 1
    return m.tolist()


def risk_coverage(probs: np.ndarray, labels: np.ndarray) -> list[dict]:
    pred, conf = probs.argmax(1), probs.max(1)
    rows = []
    for cut in [0.0, 0.5, 0.6, 0.7, 0.8, 0.9]:
        m = conf >= cut
        if m.any():
            rows.append({"min_prob": cut, "coverage": round(float(m.mean()), 3),
                         "accuracy_when_answering": round(float((pred[m] == labels[m]).mean()), 3)})
    return rows


def nonrice_check(run: Path, folder: Path, t: float, min_prob: float, min_margin: float) -> dict:
    """Run the trained model on photos that are NOT rice leaves; they should come out "not sure"."""
    import torch
    from PIL import Image

    from train import build_model, transforms_for

    model = build_model("finetune")
    model.load_state_dict(torch.load(run / "model.pt", map_location="cpu"))
    model.eval()
    tf = transforms_for(False)
    paths = [p for p in folder.rglob("*") if p.suffix.lower() in {".jpg", ".jpeg", ".png"}]
    with torch.no_grad():
        logits = np.stack([model(tf(Image.open(p).convert("RGB"))[None])[0].numpy() for p in paths])
    answered = answered_mask(softmax(logits, t), min_prob, min_margin)
    return {"n": len(paths), "not_sure_rate": round(1 - float(answered.mean()), 3),
            "wrongly_answered": [str(p) for p, a in zip(paths, answered) if a][:10]}


def evaluate_run(run: Path, target: float, nonrice: str | None) -> dict:
    d = np.load(run / "logits.npz")
    v_logits, v_labels = d["val_logits"], d["val_labels"]
    t = fit_temperature(v_logits, v_labels)
    v_probs = softmax(v_logits, t)
    min_prob, min_margin, cov, acc = choose_thresholds(v_probs, v_labels, target)
    report = {
        "temperature": t, "min_prob": min_prob, "min_margin": min_margin, "target": target,
        "val": {"macro_f1": round(macro_f1(v_labels, v_probs.argmax(1)), 4),
                "ece_before": round(ece(softmax(v_logits), v_labels), 4), "ece_after": round(ece(v_probs, v_labels), 4),
                "coverage": round(cov, 3), "accuracy_when_answering": round(acc, 3),
                "risk_coverage": risk_coverage(v_probs, v_labels)},
    }
    if len(d["test_labels"]):
        tp = softmax(d["test_logits"], t)
        tl = d["test_labels"]
        m = answered_mask(tp, min_prob, min_margin)
        report["test_heldout_source"] = {
            "macro_f1": round(macro_f1(tl, tp.argmax(1)), 4),
            "coverage": round(float(m.mean()), 3),
            "accuracy_when_answering": round(float((tp.argmax(1)[m] == tl[m]).mean()), 3) if m.any() else None,
            "confusion": confusion(tl, tp.argmax(1)), "classes": CLASSES,
        }
    if nonrice:
        report["nonrice"] = nonrice_check(run, Path(nonrice), t, min_prob, min_margin)
    (run / "eval.json").write_text(json.dumps(report, indent=2))
    return report


def lodo_table(patterns: list[str]) -> None:
    print(f"{'held-out source':30s} {'macro-F1':>9s} {'answers':>8s} {'acc when answering':>19s}")
    for run in sorted({p for pat in patterns for p in glob.glob(pat)}):
        run = Path(run)
        meta = json.loads((run / "meta.json").read_text())
        rep = evaluate_run(run, 0.9, None).get("test_heldout_source", {})
        print(f"{str(meta['holdout']):30s} {rep.get('macro_f1', 0):9.3f} {rep.get('coverage', 0):8.1%} "
              f"{(rep.get('accuracy_when_answering') or 0):19.1%}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--run")
    parser.add_argument("--target", type=float, default=0.90, help="accuracy wanted when the app answers")
    parser.add_argument("--nonrice", default=None, help="folder of non-rice photos")
    parser.add_argument("--lodo", nargs="*", help="run folders (globs) from leave-one-dataset-out training")
    args = parser.parse_args()
    if args.lodo:
        lodo_table(args.lodo)
    if args.run:
        print(json.dumps(evaluate_run(Path(args.run), args.target, args.nonrice), indent=2))


if __name__ == "__main__":
    main()
