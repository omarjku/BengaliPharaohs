"""One-off: ~400 CC BY 4.0 non-rice leaf images per Bangladeshi dataset → data/raw/NotRice/<name>/not_rice/."""
import sys, shutil
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import fetch_data

TMP = Path(__file__).resolve().parent.parent / "data" / "raw_notrice_tmp"
OUT = Path(__file__).resolve().parent.parent / "data" / "raw" / "NotRice"
SETS = {"jackfruit": ("6d4y69dv9x", 2), "banana": ("9tb7k297ff", 1), "chilli": ("tm3v4zmh7c", 1),
        "beancowpea": ("ykvcrjffzd", 1), "lemon": ("smz8ffbthy", 3)}
fetch_data.RAW = TMP

def one(item):
    name, (ds, v) = item
    try:
        fetch_data.fetch_mendeley(name, ds, v, ["augment"], 400)
    except Exception as e:
        print(name, "FAILED", e)
        return
    dst = OUT / name / "not_rice"
    dst.mkdir(parents=True, exist_ok=True)
    for i, p in enumerate(sorted((TMP / name).rglob("*.jpg"))[:400]):
        shutil.move(str(p), dst / f"{name}_{i:04d}.jpg")
    print(name, len(list(dst.glob("*.jpg"))))

with ThreadPoolExecutor(5) as pool:
    list(pool.map(one, SETS.items()))
shutil.rmtree(TMP, ignore_errors=True)
