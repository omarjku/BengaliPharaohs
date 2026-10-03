# TODO — build plan (Omar + Zoha + Claude)

Locked scope: `CLAUDE.md` · demo: `DEMO.md` · rules: `docs/advisor-rules.md` · cards: `docs/action-cards.md` · API: `contract/api.md` (PROPOSED → agree first) · risks: `docs/redteam/README.md`.
Rule: one leaf photo → classifier · taps → field facts · date + context → BRRI rules → fixed card. No LLM on the phone.

## 0. Now (15 min, together)
- [ ] Agree `contract/api.md` (context + sync + cases) → mark it AGREED.
- [ ] Agree the class list: Healthy, Blast, Brown spot, Sheath blight, Tungro, BLB (+ Leaf scald if data) + NOT_SURE.
- [ ] Pick the test phone: the cheapest Android you can borrow (1–2 GB RAM).

## Omar — model + backend
- [ ] **T+0:** start all dataset downloads (resume-capable); record licence + size in `docs/data.md`.
- [ ] **T+0–2h:** `ml/prepare.py`: map labels → common classes, crop YOLO boxes (time-box 2 h, else skip that set), resize 256 px, pHash dedup + clusters, `manifest.csv` (path, class, source, cluster).
- [ ] **T+2h:** baseline: frozen MobileNetV3-Small + linear head; leave-one-dataset-out table → **first ONNX to Zoha** (even if weak).
- [ ] **T+2–4h:** full fine-tune (augmentation, class weights, cap per source); temperature scaling on a held-out dataset; threshold (max-prob + margin); 30 non-rice photos test.
- [ ] **T+4–5h:** export ONNX (fp16/int8, ≤ 5 MB), check accuracy didn't drop; write numbers to `docs/results.md` (LODO macro-F1, risk-coverage, size, latency).
- [ ] Backend: `GET /api/context` from seeded JSON in `backend/mocks/` (labelled `seeded: true`), `POST /api/sync`, `GET /api/cases`; tests; `make smoke`.

## Zoha — app + Bangla + pitch
- [ ] **T+0–1.5h:** stub PWA on the cheap phone: camera (`<input capture>`) + gallery, service worker offline, onnxruntime-web WASM with a dummy model, `storage.persist()`. **Report latency → GO/NO-GO (native app only if >1.5 s or crash).**
- [ ] **T+1.5–4h:** screens: photo → result card (confidence bar, not-sure state) · advisor taps (stage, days under water, full/partial, Sub1?, date picker labelled "simulated") · card view with audio · "share with SAAO" consent → offline queue → sync · offline ✓ self-check.
- [ ] Rule engine in the frontend: load the JSON from `docs/advisor-rules.md`, run its 18 test cases.
- [ ] **Bangla:** translate the 15 cards, record the 33 clips (opus, ~40 KB each); one call to 16123 to confirm hours; message one SAAO/farmer for a quote.
- [ ] Install BAMIS + BRRI Rice Solution + Dr.Chashi, test in airplane mode, screenshot.
- [ ] Simple SAAO dashboard page (list of synced cases) + simulated SMS preview.

## Claude (on request)
- [ ] Write `ml/prepare.py`, `ml/train.py`, `ml/eval.py`, `ml/export.py` skeletons for Omar.
- [ ] Rule-engine TypeScript + tests from the JSON; seeded context JSON for Sirajganj.
- [ ] `PITCH.md` draft + video script (brief's required structure), README with data/licence table and "does not cover".

## Checkpoints
- **~23:30** phone GO/NO-GO · **01:00** first real model running in the app · **03:00** golden path end-to-end, `make smoke`, `make tag` · **05:00** numbers final · **07:00 FREEZE** → record demo (airplane mode) · **13:00** video uploaded · **15:00** submit.
