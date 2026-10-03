"""Download the rice-leaf datasets into data/raw/<Source>/..., shrinking every image on arrival.

Disk is tight, so nothing big is kept: images are resized to a 512 px short side as they arrive
(prepare.py later makes the final 256 px crops), big zips are read remotely (HTTP range requests,
only the image bytes are fetched), and rar archives are deleted after extraction.

Usage (from ml/): python fetch_data.py [--only RiceLeafDiseaseBD SIP ...] [--limit 50]
"""

import argparse
import io
import json
import shutil
import subprocess
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import requests
from PIL import Image, ImageOps

RAW = Path(__file__).resolve().parent.parent / "data" / "raw"
KEEP_SHORT_SIDE = 512
IMAGE_EXT = (".jpg", ".jpeg", ".png", ".bmp", ".webp")
MENDELEY = "https://data.mendeley.com/public-api/datasets"
TIMEOUT = 60
HEADERS = {"User-Agent": "Mozilla/5.0 (rice-leaf hackathon dataset fetch)"}  # Dataverse rejects the default python UA

# Mendeley datasets: (source folder name, id, version, folder names to skip)
MENDELEY_SETS = {
    "RiceLeafDiseaseBD": ("86s4jzj2m4", 3, ["annotated"]),  # Original images/<class>/ only
    "SIP": ("hx6f852hw4", 2, ["augmented"]),
    "DhanShomadhan": ("znsxdctwtt", 1, ["white"]),
}
DATAVERSE_SETS = {"BanglaRiceLeaf": "doi:10.7910/DVN/XAOBYW"}
HF_SETS = {"AgML_BD": "Project-AgML/rice_leaf_disease_classification_bd"}


def save_small(data: bytes, target: Path) -> None:
    img = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
    w, h = img.size
    scale = KEEP_SHORT_SIDE / min(w, h)
    if scale < 1:
        img = img.resize((round(w * scale), round(h * scale)), Image.BILINEAR)
    target.parent.mkdir(parents=True, exist_ok=True)
    img.save(target.with_suffix(".jpg"), quality=92)


def safe_target(base: Path, relative: str) -> Path:
    """Join a remote (untrusted) name onto base, refusing anything that escapes it (e.g. '../')."""
    target = (base / relative).resolve()
    if not target.is_relative_to(base.resolve()):
        raise ValueError(f"unsafe path from remote listing: {relative!r}")
    return target


def get_json(url: str):
    r = requests.get(url, timeout=TIMEOUT, headers=HEADERS)
    r.raise_for_status()
    return r.json()


def mendeley_files(dataset: str, version: int):
    """Yield (relative_path, file_record) for every file in every folder."""
    folders = get_json(f"{MENDELEY}/{dataset}/folders/{version}")
    names = {f["id"]: f for f in folders}

    def path_of(fid: str | None) -> str:
        parts = []
        while fid and fid in names:
            parts.append(names[fid]["name"])
            fid = names[fid].get("parent_id")
        return "/".join(reversed(parts))

    for fid in ["root", *names]:
        for f in get_json(f"{MENDELEY}/{dataset}/files?folder_id={fid}&version={version}"):
            yield (path_of(None if fid == "root" else fid) + "/" + f["filename"]).lstrip("/"), f


def fetch_remote_zip(url: str, out: Path, skip: list[str], limit: int) -> int:
    """Read images (and YOLO label/yaml files) out of a remote zip without downloading all of it."""
    from remotezip import RemoteZip

    count = 0
    with RemoteZip(url) as z:
        members = [m for m in z.infolist() if not m.is_dir()]
        if any(s in m.filename.lower() for m in members for s in skip):
            members = [m for m in members if not any(s in m.filename.lower() for s in skip)]
        for m in members:
            name = m.filename
            target = safe_target(out, name)
            if name.lower().endswith(IMAGE_EXT):
                if limit and count >= limit:
                    continue
                if target.with_suffix(".jpg").exists():
                    count += 1
                    continue
                save_small(z.read(m), target)
                count += 1
            elif name.lower().endswith((".txt", ".yaml", ".yml", ".csv", ".json")):
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(z.read(m))
    return count


def fetch_mendeley(source: str, dataset: str, version: int, skip: list[str], limit: int) -> None:
    out = RAW / source
    files = list(mendeley_files(dataset, version))
    (out / "_files.json").parent.mkdir(parents=True, exist_ok=True)
    (out / "_files.json").write_text(json.dumps([{"path": p, "size": f.get("size")} for p, f in files], indent=1))
    images = [(p, f) for p, f in files if p.lower().endswith(IMAGE_EXT) and not any(s in p.lower() for s in skip)]
    zips = [(p, f) for p, f in files if p.lower().endswith(".zip")]
    if limit:
        images = images[:limit]

    def one(item):
        p, f = item
        target = safe_target(out, p)
        if target.with_suffix(".jpg").exists():
            return
        r = requests.get(f["content_details"]["download_url"], timeout=TIMEOUT)
        r.raise_for_status()
        save_small(r.content, target)

    with ThreadPoolExecutor(8) as pool:
        list(pool.map(one, images))
    n = len(images)
    for p, f in zips:
        n += fetch_remote_zip(f["content_details"]["download_url"], safe_target(out, Path(p).stem), skip, limit)
    print(f"{source}: {n} images")


def fetch_dataverse(source: str, doi: str, limit: int) -> None:
    out = RAW / source
    meta = get_json(f"https://dataverse.harvard.edu/api/datasets/:persistentId/?persistentId={doi}")
    for f in meta["data"]["latestVersion"]["files"]:
        df = f["dataFile"]
        folder = safe_target(out, Path(df["filename"]).stem)
        if folder.exists() and any(folder.rglob("*.jpg")):
            continue
        with tempfile.TemporaryDirectory() as tmp:
            archive = safe_target(Path(tmp), Path(df["filename"]).name)
            with requests.get(f"https://dataverse.harvard.edu/api/access/datafile/{df['id']}", stream=True,
                              timeout=TIMEOUT, headers=HEADERS) as r:
                r.raise_for_status()
                with archive.open("wb") as fh:
                    shutil.copyfileobj(r.raw, fh)
            subprocess.run(["unar", "-q", "-o", tmp, str(archive)], check=True)
            archive.unlink()
            images = [p for p in Path(tmp).rglob("*") if p.suffix.lower() in IMAGE_EXT]
            for i, p in enumerate(images[: limit or None]):
                save_small(p.read_bytes(), folder / f"{i:05d}.jpg")
        print(f"{source}/{folder.name}: done")


def fetch_hf(source: str, repo: str, limit: int) -> None:
    import pandas as pd
    from huggingface_hub import snapshot_download

    out = RAW / source
    with tempfile.TemporaryDirectory() as tmp:
        path = snapshot_download(repo, repo_type="dataset", local_dir=tmp, allow_patterns=["*.parquet", "README.md"])
        for pq in Path(path).rglob("*.parquet"):
            df = pd.read_parquet(pq)
            label_col = next(c for c in df.columns if c.lower() in ("label", "labels", "class"))
            image_col = next(c for c in df.columns if c.lower() in ("image", "img"))
            names = None
            readme = Path(path) / "README.md"
            if readme.exists() and "names:" in readme.read_text():
                import re
                names = re.findall(r"'\d+': (.+)", readme.read_text())
            for i, row in df.iterrows():
                if limit and i >= limit:
                    break
                label = names[int(row[label_col])].strip() if names else str(row[label_col])
                save_small(row[image_col]["bytes"], safe_target(out, f"{label}/{i:05d}.jpg"))
    print(f"{source}: done")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", nargs="*")
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()
    want = set(args.only) if args.only else None
    for source, (ds, ver, skip) in MENDELEY_SETS.items():
        if want is None or source in want:
            fetch_mendeley(source, ds, ver, skip, args.limit)
    for source, doi in DATAVERSE_SETS.items():
        if want is None or source in want:
            fetch_dataverse(source, doi, args.limit)
    for source, repo in HF_SETS.items():
        if want is None or source in want:
            fetch_hf(source, repo, args.limit)


if __name__ == "__main__":
    main()
