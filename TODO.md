# TODO — Challenge 04 Agriculture, Bangladesh rice

Read `docs/redteam/README.md` first. Keep this list short. Names: replace P = political scientist, D = digital-health teammate.

## Tonight, first 2 hours (GO/NO-GO at ~23:00)
- [ ] **Omar:** start ALL dataset downloads in parallel now (resume-capable: `aria2c`/`curl -C -`): RiceLeafDiseaseBD, BanglaRiceLeaf, BRRI Disease & Pest, RiceLeafBD, SIP, Dhan-Shomadhan (field half), HF Project-AgML BD (held-out). Record licence + size per dataset in `docs/data.md`.
- [ ] **Omar:** fix the class map (Healthy, Blast, Brown spot, Sheath blight, Tungro, BLB, [+Leaf scald]) + "not rice"; preprocessing script: resize 256 px, pHash dedup + clusters, manifest CSV (source, class, cluster).
- [ ] **Zoha:** stub PWA on a **real cheap Android**: `<input capture>`, service worker offline, onnxruntime-web WASM with a dummy model, `storage.persist()`, audio after first tap. Report latency. Decide PWA vs native once.
- [ ] **D:** advisor rule table (`docs/advisor-rules.md`): every row with BRRI/DAE primary source + year; resolve the [VERIFY] items; "too late" logic; never a survival %.
- [ ] **P:** install + screenshot BRRI Rice Solution, Dr.Chashi, Cropwise Grower BD, Krishoker Janala, Rice Doctor → comparison table (`docs/prior-art.md`). Confirm all four ages 18–35, registration, exact submission portal + deadline.

## Night (to ~04:00)
- [ ] **Omar:** frozen-backbone baseline + leave-one-dataset-out table → fine-tune MobileNetV3-Small (strong augmentation, class weights) → temperature scaling on a held-out dataset → threshold → "not rice" test (30 photos) → export ONNX → measure size/latency. FastAPI `/sync` endpoint.
- [ ] **Zoha:** result card, not-sure state, advisor screens, consent screen, offline self-check; record 25–40 Bangla clips from D's card texts (manifest).
- [ ] **D:** action cards in the safe template (EN + Bangla text) for each class + advisor outcomes; privacy/consent/data-flow page (EXIF strip, opt-in share, lost/shared phone, data controller, PDPA 2026 check); message ≥1 agronomist/SAAO for a comment.
- [ ] **P:** primary-source evidence (GSMA BD + year, Findex 2025, BBS 2019 census, 2024 flood damage, SAAO ratio + year) → `PITCH.md`; problem sentence; preconditions slide (DAE/BRRI/PARTNER); "what our data does not cover" slide.

## Sun 04:00–07:00 (freeze at 07:00)
- [ ] Integrate, airplane-mode drills ×3, `make smoke`, `make tag`; README numbers.
## Sun 07:00–13:00
- [ ] Record video (structure in `docs/redteam/README.md` §6), rehearse 3×, upload by 13:00; submit by 15:00.
