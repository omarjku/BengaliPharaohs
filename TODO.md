# TODO — Challenge 04 Agriculture, Bangladesh rice

Read `docs/redteam/README.md` first. Keep this list short. Team = **Omar + Zoha**; research/drafting tasks are done by Claude and reviewed by Zoha (agronomy, Bangla) or Omar (data).

## Tonight, first 2 hours (GO/NO-GO at ~23:00)
- [ ] **Omar:** start ALL dataset downloads in parallel now (resume-capable: `aria2c`/`curl -C -`): RiceLeafDiseaseBD, BanglaRiceLeaf, BRRI Disease & Pest, RiceLeafBD, SIP, Dhan-Shomadhan (field half), HF Project-AgML BD (held-out). Record licence + size per dataset in `docs/data.md`.
- [ ] **Omar:** fix the class map (Healthy, Blast, Brown spot, Sheath blight, Tungro, BLB, [+Leaf scald]) + "not rice"; preprocessing script: resize 256 px, pHash dedup + clusters, manifest CSV (source, class, cluster).
- [ ] **Zoha:** stub PWA on a **real cheap Android**: `<input capture>`, service worker offline, onnxruntime-web WASM with a dummy model, `storage.persist()`, audio after first tap. Report latency. Decide PWA vs native once.
- [ ] **Claude → Zoha reviews:** advisor rule table (`docs/advisor-rules.md`): every row with BRRI/DAE primary source + year; resolve the [VERIFY] items; "too late" logic; never a survival %.
- [ ] **Claude:** prior-art comparison (`docs/prior-art.md`) from public sources. **Zoha:** install BRRI Rice Solution + Dr.Chashi on her phone and screenshot (10 min).
- [ ] **Omar:** confirm both ages 18–35, registration, exact submission portal + deadline.

## Night (to ~04:00)
- [ ] **Omar:** frozen-backbone baseline + leave-one-dataset-out table → fine-tune MobileNetV3-Small (strong augmentation, class weights) → temperature scaling on a held-out dataset → threshold → "not rice" test (30 photos) → export ONNX → measure size/latency. FastAPI `/sync` endpoint.
- [ ] **Zoha:** result card, not-sure state, advisor screens, consent screen, offline self-check; record 25–40 Bangla clips from D's card texts (manifest).
- [ ] **Claude → Zoha reviews/translates:** action cards in the safe template (EN + Bangla text) for each class + advisor outcomes; privacy/consent/data-flow page. **Zoha:** message ≥1 agronomist/SAAO/farmer she knows for a comment.
- [ ] **Claude:** primary-source evidence (cheap-Android + farmer phone ownership, BBS 2019 census, 2024 flood damage, SAAO ratio + year) → `PITCH.md` draft; problem sentence; preconditions slide; "does not cover" slide. **Zoha** owns the final pitch.

## Sun 04:00–07:00 (freeze at 07:00)
- [ ] Integrate, airplane-mode drills ×3, `make smoke`, `make tag`; README numbers.
## Sun 07:00–13:00
- [ ] Record video (structure in `docs/redteam/README.md` §6), rehearse 3×, upload by 13:00; submit by 15:00.
