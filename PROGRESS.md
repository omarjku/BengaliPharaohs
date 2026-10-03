# PROGRESS

## 2026-10-04 ~00:50
- All datasets downloaded (aria2c + `ml/unpack_zip.py`; zips deleted). 14,134 rice + 747 not_rice images after `prepare.py` (`data/manifest.csv`, gitignored). Licences + counts: `docs/data.md`.
- Label fixes in `ml/common.py` (typos, "(BLB)" suffix, "Healthy Rice Leaf").
- v1 frozen model trained (`runs/frozen`), evaluated, **exported to `frontend/public/model/`** (commit 80eb328). Numbers in `docs/results.md`.
- Added `not_rice` class (Bangladeshi chilli/banana/bean/lemon/jackfruit leaves, CC BY 4.0, `ml/fetch_notrice.py`); eval counts not_rice as NOT SURE. Bean leaves (iBean, MIT) kept OUT of training as the not-rice test.
- Running: v2 fine-tune 12 epochs → `runs/ft` (`runs/ft.log`).
- Next: eval v2 (+ nonrice), export if better, tell Zoha labels.json now has 7 classes (not_rice → NOT SURE card C8), LODO table, `docs/results.md`.


## 2026-10-03 ~23:50 (local Mac session, teleported from cloud)
- Locked: Challenge 04 · Bangladesh · rice · offline leaf classifier + after-flood advisor (see CLAUDE.md, docs/PLAN.md, docs/ROADMAP-OMAR.md).
- `.venv-ml` (uv, Python 3.12, torch 2.14 with MPS on Apple M4) installed from `ml/requirements.txt` + remotezip, huggingface_hub, pandas.
- `ml/fetch_data.py` downloads datasets into `data/raw/<Source>/`, shrinking images to 512 px on arrival (disk is tight). Big Mendeley zips are streamed (HTTP range), not downloaded whole.
  - RiceLeafDiseaseBD (CC BY 4.0, uses `Original images/<class>/` only), SIP (Original only), DhanShomadhan (field background only), BanglaRiceLeaf (CC0, Dataverse .rar via `unar`), AgML_BD (HF, held-out test).
  - Logs: `data/logs/fetch_<Source>.log`. Label typos ("Browon Spot", "Rice Turgro", "Shath Blight") mapped in `ml/common.py`.
- Dummy model + hand-off JSON already in `frontend/public/model/` (from the cloud session).
- Next: `prepare.py` → frozen baseline → export first real model to Zoha → fine-tune → LODO eval → export.
