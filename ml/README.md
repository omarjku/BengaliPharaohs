# Rice-leaf model: run order (Omar)

Setup once (Mac, Python 3.11/3.12):
```bash
python3 -m venv .venv-ml && source .venv-ml/bin/activate
pip install -r ml/requirements.txt
cd ml   # all commands below run from ml/
```

| # | Command | Time | What you get |
|---|---|---|---|
| 0 | `python make_dummy.py --out ../frontend/public/model` | 1 s | dummy model for Zoha (already committed) |
| 1 | put each dataset in `../data/raw/<SourceName>/` | downloads | see `docs/data.md` |
| 2 | `python prepare.py --raw ../data/raw --out ../data` (add `--limit 200` for a quick test) | 20–60 min | `data/clean/…`, `data/manifest.csv`, counts per source × class |
| 3 | `python train.py --manifest ../data/manifest.csv --mode frozen --out ../runs/frozen` | ~5–10 min | first real model |
| 4 | `python eval.py --run ../runs/frozen` then `python export.py --run ../runs/frozen --out ../frontend/public/model --check-images ../data/clean` | 2 min | **first real hand-off to Zoha** |
| 5 | `python train.py --manifest ../data/manifest.csv --mode finetune --epochs 12 --out ../runs/ft` | 30–60 min | better model |
| 6 | LODO: `for s in $(python train.py --manifest ../data/manifest.csv --list-sources); do python train.py --manifest ../data/manifest.csv --mode frozen --holdout "$s" --out "../runs/lodo_$s"; done` then `python eval.py --lodo "../runs/lodo_*"` | ~5 min per source | **the honest pitch table** |
| 7 | `python eval.py --run ../runs/ft --target 0.90 --nonrice ../data/nonrice` | 1 min | thresholds + "not rice" check (30 photos of other leaves/soil/hands) |
| 8 | `python export.py --run ../runs/ft --out ../frontend/public/model --check-images ../data/clean` | 2 min | final hand-off (int8 if it agrees ≥97% with fp32, else fp32) |
| 9 | copy numbers into `docs/results.md`, `make smoke`, commit, push | | |

Notes
- Apple Silicon: `export PYTORCH_ENABLE_MPS_FALLBACK=1`. If training is slow, use free Colab (T4) with the same scripts.
- Classes and label mapping: `ml/common.py` (`CLASSES`, `LABEL_MAP`). Add new dataset label spellings to `LABEL_MAP`; `prepare.py` prints how many it dropped per source.
- `--cap 1500` limits images per (source, class) so one dataset can't dominate a class.
- Tested here on synthetic data: `prepare.py`, `eval.py`, `make_dummy.py`. `train.py`/`export.py` are compile-checked only (no PyTorch weights reachable from the cloud box) — run step 2 with `--limit 200` and steps 3–4 first as a smoke test.
