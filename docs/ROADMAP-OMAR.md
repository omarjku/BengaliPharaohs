# Omar's roadmap: data → train → compress → hand-off (+ backend)

## Context
Omar owns everything model-related plus the small backend. Zoha builds the app against four hand-off files. Goal: a real, honest, phone-sized rice-leaf model in the app well before the deadline, with numbers for the pitch. Omar said "submission at 9": this plan treats **09:00 Sun as your own finish line** (official submission is 15:00, and the team freeze in CLAUDE.md is 07:00, so 09:00 is safe only if the model is frozen by 07:00). Times assume you start ~23:00 Sat; slide everything if you start later.

## The roadmap in sections (simple version)

### Section 1 — Get the data (23:00–00:00, mostly waiting)
- Start every download **in parallel, resumable** (`aria2c` or `curl -C -`):
  RiceLeafDiseaseBD (Mendeley 86s4jzj2m4, YOLO boxes) · BanglaRiceLeaf (Dataverse doi:10.7910/DVN/XAOBYW) · BRRI Disease & Pest (Data in Brief) · RiceLeafBD · SIP (Mendeley hx6f852hw4) · Dhan-Shomadhan (field half) · HF `Project-AgML/rice_leaf_disease_classification_bd` (held-out test).
- While waiting: write `docs/data.md`: name, URL, licence, size, classes, kept/dropped. Drop anything non-commercial or unknown from the shipped model, or flag it.
- **Goes wrong:** Mendeley slow or failing → skip the biggest set (RiceLeafDiseaseBD) first; you still have ~10k images.

### Section 2 — Clean and unify (00:00–01:30)
`ml/prepare.py` (ask Claude to write it):
- Map every dataset's labels to **our classes**: healthy, blast, brown_spot, sheath_blight, tungro, blb (+ leaf_scald only if ≥300 images). Drop everything else (hispa, smut, etc.).
- YOLO dataset: crop each box into its own image. **Time-box 1 h**, else skip that dataset.
- Resize all to 256 px once. pHash dedup (Hamming ≤ 8) → cluster id, so near-copies never sit in both train and test.
- Write `manifest.csv` (path, class, source, cluster) and print counts per (source, class).
- **Goes wrong:** one class comes from only one dataset → the model learns "which camera", not "which disease". Cap images per (source, class) and report it.

### Section 3 — First model fast (01:30–02:00) → unblock Zoha
- **Before this, at 23:00:** ask Claude for a **dummy** `rice.onnx` + 3 JSON files and give them to Zoha so she isn't waiting.
- `ml/train.py --frozen`: MobileNetV3-Small pretrained on ImageNet, freeze the body, train only the last layer (~2 min). Export ONNX → hand to Zoha. It's weak but real.

### Section 4 — Real training (02:00–03:30)
- `ml/train.py --finetune`: full fine-tune, strong augmentation (crop, rotate, colour/brightness, blur), class weights, 10–15 epochs (~5 min/epoch CPU, faster on M-series via MPS or free Colab T4). Save the best by held-out score, not training accuracy.
- **Goes wrong:** MPS errors → set `PYTORCH_ENABLE_MPS_FALLBACK=1` or use Colab; keep the frozen model as backup.

### Section 5 — Honest evaluation + "not sure" (03:30–04:30)
`ml/eval.py`:
- **Leave-one-dataset-out:** train on all but one source, test on the left-out one → macro-F1 per held-out set. This is the pitch number (expect ~0.45–0.6; literature 0.72→0.44).
- **Calibration:** fit temperature on a held-out set; choose `min_prob` and `min_margin` so that when the app answers it is ~X% right; report "answers Y% of photos, X% correct when it answers" (risk-coverage).
- **Not rice:** 30 non-rice photos (other leaves, soil, hands) → must come out "not sure". If not, add a "not_rice" class from other-plant images and retrain the head.
- Confusion matrix → name the worst pair (e.g. blast vs brown spot) for the pitch.

### Section 6 — Compress + export + hand-off (04:30–05:15)
`ml/export.py`:
- ONNX (opset 17), then fp16 or dynamic int8 quantisation → target ≤ 5 MB. Check accuracy doesn't drop more than ~1 point vs PyTorch on the same images (parity check); if int8 hurts, ship fp16.
- Write the **4 hand-off files** to `frontend/public/model/`:
  `rice.onnx` · `labels.json` (class order) · `preprocess.json` (`size` 224, mean/std, NCHW) · `threshold.json` (`temperature`, `min_prob`, `min_margin`).
- Same names as the dummy, so Zoha's code needs no change.
- Measure on Zoha's cheap phone: load time + per-photo time.

### Section 7 — Backend (fit in while training runs, ~1 h total)
- `GET /api/context` from seeded `backend/mocks/context_sirajganj.json` (`seeded: true`), `POST /api/sync` (idempotent on `case_id`, reject without consent), `GET /api/cases`; SQLModel `Case` table in `backend/app/models.py`, reuse `get_session` from `db.py`; tests in `tests/test_smoke.py` style; `make smoke` green. Agree `contract/api.md` with Zoha first.

### Section 8 — Numbers + freeze (05:15–07:00)
- `docs/results.md`: datasets + licences, per-source counts, leave-one-dataset-out table, risk-coverage, not-rice test, size (MB), phone latency, confusion pair, what the data does NOT cover (flood-stress images, BPH, stem borer, false smut, Boro season, seedlings).
- `make smoke`, `make tag` at ~06:30. **07:00 model frozen — no retraining after this.**

### After 07:00 until 09:00 — what you can work on
1. Help Zoha record the demo (airplane mode run ×3) and the technical part of the video (pipeline + numbers, ~30 s).
2. README: how to run, data table, results, limitations.
3. Answer the hard Q&A with numbers (`docs/redteam/README.md` §5).
4. Only if all done: a "second-photo" or Grad-CAM heatmap screenshot for the video (no app change).

## Pacing rules
- Every section has a **time-box**; when it's hit, take the fallback and move on.
- **Always have a working model in the app** (dummy → frozen → fine-tuned). Never break the one Zoha uses: new files only replace old ones after the parity check.
- Run training in the background and do the backend/docs while it trains.
- Push after every section (`make smoke` first). Short break every ~2 h; eat at ~02:00.

## What Claude will write when you say go
`ml/prepare.py`, `ml/train.py`, `ml/eval.py`, `ml/export.py`, `ml/make_dummy.py`, `ml/requirements.txt`, `docs/data.md` skeleton. Then you run them on your machine (the cloud box can't download the datasets or pretrained weights).

## Verification
- `python ml/make_dummy.py` → 4 files load in Zoha's `classify.ts`.
- `ml/eval.py` prints the leave-one-dataset-out table + thresholds; non-rice set → ≥ 90% "not sure".
- Exported ONNX matches PyTorch within ~1 point; ≤ 5 MB; ≤ 1.5 s per photo on the cheap phone.
- `make smoke` green; `docs/results.md` filled.
