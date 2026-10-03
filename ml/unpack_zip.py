"""Unpack a downloaded dataset zip into data/raw/<source>/, keeping only wanted images, shrunk on the way.

Usage (from ml/):
  python unpack_zip.py ../data/zips/RiceLeafDiseaseBD.zip RiceLeafDiseaseBD --include "Original images"
  python unpack_zip.py ../data/zips/SIP_Original.zip SIP --delete
"""

import argparse
import zipfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from fetch_data import IMAGE_EXT, RAW, safe_target, save_small


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("zip")
    parser.add_argument("source")
    parser.add_argument("--include", default="", help="only members whose path contains this text")
    parser.add_argument("--exclude", nargs="*", default=["annotated", "augment", "__macosx"])
    parser.add_argument("--delete", action="store_true", help="delete the zip afterwards (saves disk)")
    args = parser.parse_args()

    out = RAW / args.source
    with zipfile.ZipFile(args.zip) as z:
        members = [m for m in z.infolist()
                   if m.filename.lower().endswith(IMAGE_EXT)
                   and args.include.lower() in m.filename.lower()
                   and not any(e in m.filename.lower() for e in args.exclude)]
        print(f"{len(members)} images to unpack")

        def one(m: zipfile.ZipInfo) -> None:
            target = safe_target(out, m.filename)
            if not target.with_suffix(".jpg").exists():
                with zipfile.ZipFile(args.zip) as zz:  # one handle per thread
                    save_small(zz.read(m.filename), target)

        with ThreadPoolExecutor(8) as pool:
            list(pool.map(one, members))
    print(f"{args.source}: {sum(1 for _ in out.rglob('*.jpg'))} images in {out}")
    if args.delete:
        Path(args.zip).unlink()
        print(f"deleted {args.zip}")


if __name__ == "__main__":
    main()
