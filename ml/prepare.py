"""Turn the downloaded datasets into one clean, de-duplicated image set + manifest.csv.

Put each dataset in its own folder: data/raw/<source_name>/...  (any layout below that).
Two layouts are understood:
  * classification: the class is a folder name somewhere in the path (e.g. .../Brown Spot/img.jpg)
  * YOLO detection: images + labels/*.txt + a data.yaml with `names:` → each box is cropped
Labels are mapped to our classes with common.LABEL_MAP; unknown labels are dropped and counted.

Output: data/clean/<class>/<source>__<n>.jpg (short side 256 px) and data/manifest.csv with
path,class,source,cluster  — `cluster` groups near-duplicate images (perceptual hash), so the
same leaf never ends up in both train and test.

Usage: python ml/prepare.py --raw data/raw --out data [--white-bg-skip Dhan-Shomadhan]
"""

import argparse
import csv
import re
from collections import Counter, defaultdict
from pathlib import Path

import imagehash
import yaml
from PIL import Image, ImageOps

from common import normalise_label

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
SHORT_SIDE = 256
BOX_PAD = 0.15  # grow each YOLO box by 15% so the lesion keeps some leaf context
MIN_CROP = 48  # px; smaller boxes are too blurry to learn from


def resize_short_side(img: Image.Image, short: int = SHORT_SIDE) -> Image.Image:
    w, h = img.size
    scale = short / min(w, h)
    return img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.BILINEAR)


def class_from_path(path: Path, root: Path) -> str | None:
    """Use the closest folder name that maps to one of our classes."""
    for part in reversed(path.relative_to(root).parts[:-1]):
        label = normalise_label(re.sub(r"[\s\-]+", "_", part))
        if label is not None:
            return label
    return None


def yolo_names(source_dir: Path) -> list[str] | None:
    for yaml_path in source_dir.rglob("*.yaml"):
        data = yaml.safe_load(yaml_path.read_text())
        names = data.get("names") if isinstance(data, dict) else None
        if isinstance(names, dict):
            return [names[k] for k in sorted(names)]
        if isinstance(names, list):
            return names
    return None


def label_file_for(image: Path) -> Path:
    # YOLO convention: .../images/x.jpg ↔ .../labels/x.txt
    parts = list(image.parts)
    if "images" in parts:
        parts[len(parts) - 1 - parts[::-1].index("images")] = "labels"
    return Path(*parts).with_suffix(".txt")


def yolo_crops(image: Path, names: list[str]):
    labels = label_file_for(image)
    if not labels.exists():
        return
    img = ImageOps.exif_transpose(Image.open(image)).convert("RGB")
    w, h = img.size
    for line in labels.read_text().splitlines():
        fields = line.split()
        if len(fields) < 5:
            continue
        cls, cx, cy, bw, bh = int(fields[0]), *map(float, fields[1:5])
        label = normalise_label(names[cls]) if cls < len(names) else None
        if label is None:
            yield None, None
            continue
        bw, bh = bw * (1 + BOX_PAD), bh * (1 + BOX_PAD)
        box = (max(0, (cx - bw / 2) * w), max(0, (cy - bh / 2) * h),
               min(w, (cx + bw / 2) * w), min(h, (cy + bh / 2) * h))
        if min(box[2] - box[0], box[3] - box[1]) < MIN_CROP:
            continue
        yield label, img.crop(box)


def iter_source(source_dir: Path, skip_words: list[str]):
    """Yields (label_or_None, PIL image) for one dataset folder."""
    names = yolo_names(source_dir)
    for path in sorted(source_dir.rglob("*")):
        if path.suffix.lower() not in IMAGE_EXT:
            continue
        if any(w.lower() in str(path).lower() for w in skip_words):
            continue
        if names is not None and label_file_for(path).exists():
            yield from yolo_crops(path, names)
            continue
        label = class_from_path(path, source_dir)
        if label is None:
            yield None, None
            continue
        try:
            yield label, ImageOps.exif_transpose(Image.open(path)).convert("RGB")
        except OSError:
            continue


class UnionFind:
    def __init__(self, n: int):
        self.parent = list(range(n))

    def find(self, i: int) -> int:
        while self.parent[i] != i:
            self.parent[i] = self.parent[self.parent[i]]
            i = self.parent[i]
        return i

    def union(self, a: int, b: int) -> None:
        self.parent[self.find(a)] = self.find(b)


def cluster_near_duplicates(hashes: list[imagehash.ImageHash], max_distance: int = 7) -> list[int]:
    """Group images whose 64-bit pHash differs in <= 7 bits. Band trick: two hashes within
    7 bits must share at least one of 8 identical 8-bit bands, so we only compare those."""
    uf = UnionFind(len(hashes))
    bits = ["".join("1" if b else "0" for b in h.hash.flatten()) for h in hashes]
    for band in range(8):
        buckets: dict[str, list[int]] = defaultdict(list)
        for i, b in enumerate(bits):
            buckets[b[band * 8:(band + 1) * 8]].append(i)
        for members in buckets.values():
            if len(members) > 2000:  # very common band (e.g. blank images) → skip, too costly
                continue
            for x in range(len(members)):
                for y in range(x + 1, len(members)):
                    i, j = members[x], members[y]
                    if hashes[i] - hashes[j] <= max_distance:
                        uf.union(i, j)
    return [uf.find(i) for i in range(len(hashes))]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--raw", default="data/raw")
    parser.add_argument("--out", default="data")
    parser.add_argument("--skip", nargs="*", default=["white", "augment"],
                        help="skip files whose path contains any of these words (studio/augmented)")
    parser.add_argument("--limit", type=int, default=0, help="max images per source (0 = all), for a quick test")
    args = parser.parse_args()

    raw, out = Path(args.raw), Path(args.out)
    clean = out / "clean"
    rows, hashes, dropped = [], [], Counter()
    for source_dir in sorted(p for p in raw.iterdir() if p.is_dir()):
        source = source_dir.name
        kept = 0
        for label, img in iter_source(source_dir, args.skip):
            if label is None:
                dropped[source] += 1
                continue
            img = resize_short_side(img)
            target = clean / label / f"{source}__{kept:06d}.jpg"
            target.parent.mkdir(parents=True, exist_ok=True)
            img.save(target, quality=90)
            rows.append({"path": str(target), "class": label, "source": source})
            hashes.append(imagehash.phash(img))
            kept += 1
            if args.limit and kept >= args.limit:
                break
        print(f"{source}: kept {kept}, dropped {dropped[source]} (unmapped labels)")

    clusters = cluster_near_duplicates(hashes)
    for row, cluster in zip(rows, clusters):
        row["cluster"] = cluster
    with (out / "manifest.csv").open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["path", "class", "source", "cluster"])
        writer.writeheader()
        writer.writerows(rows)

    counts = Counter((r["source"], r["class"]) for r in rows)
    print(f"\n{len(rows)} images, {len(set(clusters))} unique clusters "
          f"({len(rows) - len(set(clusters))} near-duplicates grouped)")
    print("Images per source × class (watch for classes that come from only one source):")
    for (source, label), n in sorted(counts.items()):
        print(f"  {source:30s} {label:15s} {n}")


if __name__ == "__main__":
    main()
