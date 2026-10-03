"""Train the rice-leaf classifier (MobileNetV3-Small, ImageNet-pretrained).

  --mode frozen    only the last layer learns (~minutes, safe baseline)
  --mode finetune  the whole network learns (better, slower)
  --holdout SRC    leave one dataset out completely: it becomes the TEST set (honest score)

Validation = 10% of the remaining *clusters* (near-duplicates stay together).
Saves to --out: model.pt, meta.json, logits.npz (val + test logits/labels for ml/eval.py).

Examples:
  python ml/train.py --mode frozen   --out runs/frozen
  python ml/train.py --mode finetune --epochs 12 --out runs/ft
  for s in $(python ml/train.py --list-sources); do python ml/train.py --mode frozen --holdout $s --out runs/lodo_$s; done
"""

import argparse
import csv
import json
import random
import time
from collections import Counter
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from torch import nn
from torch.utils.data import DataLoader, Dataset, WeightedRandomSampler
from torchvision import models, transforms

from common import CLASSES, PREPROCESS


def device() -> torch.device:
    if torch.cuda.is_available():
        return torch.device("cuda")
    if torch.backends.mps.is_available():
        return torch.device("mps")  # set PYTORCH_ENABLE_MPS_FALLBACK=1 if an op is missing
    return torch.device("cpu")


def read_manifest(path: str) -> list[dict]:
    with open(path) as f:
        return [r for r in csv.DictReader(f) if r["class"] in CLASSES]


def split(rows: list[dict], holdout: str | None, val_frac: float, cap: int, seed: int):
    """Test = the held-out source. Val = a random 10% of clusters from the rest."""
    rng = random.Random(seed)
    test = [r for r in rows if r["source"] == holdout] if holdout else []
    rest = [r for r in rows if r["source"] != holdout]
    clusters = sorted({r["cluster"] for r in rest})
    rng.shuffle(clusters)
    val_clusters = set(clusters[: max(1, int(len(clusters) * val_frac))])
    val = [r for r in rest if r["cluster"] in val_clusters]
    train = [r for r in rest if r["cluster"] not in val_clusters]
    if cap:  # stop one big dataset dominating a class (the model would learn "which camera")
        rng.shuffle(train)
        per = Counter()
        capped = []
        for r in train:
            key = (r["source"], r["class"])
            if per[key] < cap:
                per[key] += 1
                capped.append(r)
        train = capped
    return train, val, test


def transforms_for(train: bool):
    norm = transforms.Normalize(PREPROCESS["mean"], PREPROCESS["std"])
    size = PREPROCESS["size"]
    if not train:  # exactly what the app does: resize short side, centre crop
        return transforms.Compose([transforms.Resize(PREPROCESS["resize_short_side"]),
                                   transforms.CenterCrop(size), transforms.ToTensor(), norm])
    # Strong augmentation: phone photos in a field vary in light, angle, blur and framing.
    return transforms.Compose([
        transforms.RandomResizedCrop(size, scale=(0.5, 1.0)),
        transforms.RandomHorizontalFlip(), transforms.RandomVerticalFlip(),
        transforms.RandomRotation(25),
        transforms.ColorJitter(0.4, 0.4, 0.3, 0.05),
        transforms.RandomApply([transforms.GaussianBlur(5, (0.1, 2.0))], p=0.3),
        transforms.ToTensor(), norm,
    ])


class LeafSet(Dataset):
    def __init__(self, rows: list[dict], train: bool):
        self.rows, self.tf = rows, transforms_for(train)

    def __len__(self) -> int:
        return len(self.rows)

    def __getitem__(self, i: int):
        r = self.rows[i]
        return self.tf(Image.open(r["path"]).convert("RGB")), CLASSES.index(r["class"])


def build_model(mode: str) -> nn.Module:
    model = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.DEFAULT)
    model.classifier[3] = nn.Linear(model.classifier[3].in_features, len(CLASSES))
    if mode == "frozen":
        for p in model.features.parameters():
            p.requires_grad = False
    return model


def macro_f1(labels: np.ndarray, preds: np.ndarray) -> float:
    scores = []
    for c in range(len(CLASSES)):
        tp = np.sum((preds == c) & (labels == c))
        fp = np.sum((preds == c) & (labels != c))
        fn = np.sum((preds != c) & (labels == c))
        if tp + fp + fn:
            scores.append(2 * tp / (2 * tp + fp + fn))
    return float(np.mean(scores)) if scores else 0.0


@torch.no_grad()
def predict(model: nn.Module, loader: DataLoader, dev: torch.device):
    model.eval()
    logits, labels = [], []
    for x, y in loader:
        logits.append(model(x.to(dev)).float().cpu())
        labels.append(y)
    if not logits:
        return np.zeros((0, len(CLASSES)), np.float32), np.zeros(0, np.int64)
    return torch.cat(logits).numpy(), torch.cat(labels).numpy()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", default="data/manifest.csv")
    parser.add_argument("--mode", choices=["frozen", "finetune"], default="frozen")
    parser.add_argument("--holdout", default=None, help="source name to leave out as the test set")
    parser.add_argument("--epochs", type=int, default=None)
    parser.add_argument("--batch", type=int, default=64)
    parser.add_argument("--lr", type=float, default=None)
    parser.add_argument("--cap", type=int, default=1500, help="max train images per (source, class); 0 = no cap")
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--out", default="runs/latest")
    parser.add_argument("--list-sources", action="store_true")
    args = parser.parse_args()

    rows = read_manifest(args.manifest)
    if args.list_sources:
        print("\n".join(sorted({r["source"] for r in rows})))
        return

    torch.manual_seed(args.seed)
    epochs = args.epochs or (6 if args.mode == "frozen" else 12)
    lr = args.lr or (1e-3 if args.mode == "frozen" else 3e-4)
    train, val, test = split(rows, args.holdout, 0.10, args.cap, args.seed)
    print(f"train {len(train)} · val {len(val)} · test {len(test)} (holdout={args.holdout})")
    print("train per class:", dict(Counter(r["class"] for r in train)))

    # Balanced sampling: every class is seen equally often, whatever its size.
    class_counts = Counter(r["class"] for r in train)
    weights = [1.0 / class_counts[r["class"]] for r in train]
    sampler = WeightedRandomSampler(weights, num_samples=len(train), replacement=True)
    loader_kw = {"batch_size": args.batch, "num_workers": args.workers}
    train_dl = DataLoader(LeafSet(train, True), sampler=sampler, **loader_kw)
    val_dl = DataLoader(LeafSet(val, False), **loader_kw)
    test_dl = DataLoader(LeafSet(test, False), **loader_kw)

    dev = device()
    model = build_model(args.mode).to(dev)
    optim = torch.optim.AdamW([p for p in model.parameters() if p.requires_grad], lr=lr, weight_decay=1e-4)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(optim, T_max=epochs)
    loss_fn = nn.CrossEntropyLoss(label_smoothing=0.05)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    best = -1.0
    for epoch in range(1, epochs + 1):
        model.train()
        if args.mode == "frozen":
            model.features.eval()  # keep pretrained batch-norm statistics
        t0, total, n = time.time(), 0.0, 0
        for x, y in train_dl:
            x, y = x.to(dev), y.to(dev)
            optim.zero_grad()
            loss = loss_fn(model(x), y)
            loss.backward()
            optim.step()
            total, n = total + loss.item() * len(y), n + len(y)
        sched.step()
        v_logits, v_labels = predict(model, val_dl, dev)
        f1 = macro_f1(v_labels, v_logits.argmax(1))
        print(f"epoch {epoch}/{epochs}  loss {total / max(n, 1):.3f}  val macro-F1 {f1:.3f}  ({time.time() - t0:.0f}s)")
        if f1 > best:
            best = f1
            torch.save(model.state_dict(), out / "model.pt")

    model.load_state_dict(torch.load(out / "model.pt", map_location=dev))
    v_logits, v_labels = predict(model, val_dl, dev)
    t_logits, t_labels = predict(model, test_dl, dev)
    np.savez(out / "logits.npz", val_logits=v_logits, val_labels=v_labels,
             test_logits=t_logits, test_labels=t_labels)
    meta = {"classes": CLASSES, "mode": args.mode, "holdout": args.holdout, "epochs": epochs,
            "train": len(train), "val": len(val), "test": len(test),
            "val_macro_f1": round(macro_f1(v_labels, v_logits.argmax(1)), 4),
            "test_macro_f1": round(macro_f1(t_labels, t_logits.argmax(1)), 4) if len(t_labels) else None}
    (out / "meta.json").write_text(json.dumps(meta, indent=2))
    print(json.dumps(meta, indent=2))


if __name__ == "__main__":
    main()
