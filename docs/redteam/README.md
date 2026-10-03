# Red-team summary (5 agents, Sat 3 Oct night) — read before building

Agents: brief compliance · technical feasibility · agronomy & safety · development & adoption · hostile judge Q&A. Plus our own benchmark (`00-model-feasibility.md`).
Verdict: **GO**, with the scope and wording changes below. Nothing is disqualifying; the risks are in scoring and the pass/fail gate.

## 1. Must-fix (ranked)
1. **Device & persona.** _Updated after team input: in rice the field worker is usually a man who owns a cheap Android (~Tk 6,000 class); keypad phones are still common → target the cheapest Android + SMS fallback for keypad phones. Keep the gender gap as one honest sentence, not the headline._ Original finding: never claim "farmers already have the device". Bangladesh has the widest smartphone gender gap GSMA measures (40%, GSMA 2025 — verify primary). Plantix's BD pilot struggled to enrol women. → The app runs on the **household or SAAO/co-op smartphone**; the farmer gets the result by **SMS on her own basic phone**; the SAAO is in the loop. Show one basic-phone path in the demo. Open with a Noor-equivalent and a slide mapping Noor's constraints to ours (brief l.246: "Noor is fictional; her constraints are not").
2. **AI value + one problem.** The flood advisor is a rule table — say so ("deliberately not AI; AI only where SMS can't go: looking at a leaf"). Spine = *"My rice is damaged: what is it, what do I do now, who do I ask?"* Lead with the advisor + human hand-off; the classifier is the supporting AI. BRRI already has an AI rice app ("Rice Solution", ~1k downloads) — name it.
3. **Evidence + calibrated abstention.** Report leave-one-dataset-out macro-F1 (literature: 0.72 in-dataset → 0.44 cross-dataset, arXiv 2609.31709), a risk-coverage curve ("answers X% of photos, Y% right"), a "not rice" test on 30 photos, size + latency on a real cheap Android. Never say "accuracy 95%".
4. **Data grounding (scored).** Licence table for every dataset (drop NC/unknown or flag research-only); pHash dedup across datasets; "what our data does not cover" slide; label all synthetic/seeded data and the **simulated demo date** (Aman deadlines have passed today); primary sources for every problem number; use common datasets too (GSMA, Findex, CHIRPS, Common Voice/SLR53).
5. **Pass/fail responsible AI.** One page: inference on device; nothing leaves the phone unless the farmer taps "share with SAAO" (consent screen in Bangla + audio); strip photo GPS/EXIF; anonymous case ID; extension office is data controller (Bangladesh Personal Data Protection Act 2026 — verify); lost/shared phone; bias by region/variety/season; a human decides.

## 2. Technical findings
- **No usable ready-made BD rice model** (no licence, no weights, or untested on BD). Train our own: measured 1.6 min (frozen backbone) / 4.7 min per epoch on 20k images on a 4-core CPU; 1.1 MB TFLite; 4 ms/image CPU.
- **Taxonomy mismatch across datasets** (biggest risk): BanglaRiceLeaf has no brown spot/tungro; RiceLeafDiseaseBD has no BLB; no BD hispa data. → Class map: **Healthy, Blast, Brown spot, Sheath blight, Tungro, BLB (+ Leaf scald if supported)** + **"not sure / not a rice leaf"**. Drop hispa. Cap per (dataset, class) so the model can't learn "which dataset".
- RiceLeafDiseaseBD (9,769 imgs, 1024px) is a **YOLO-box** dataset → crop boxes (time-box 2 h, else skip).
- Resize everything once to 256 px; pHash dedup (Hamming ≤ 8, union-find clusters), split by cluster; hold out whole datasets. Extra held-out set: HF `Project-AgML/rice_leaf_disease_classification_bd` (773 iPhone field photos).
- Calibrate temperature on a **held-out dataset**; threshold on max-prob + top1–top2 margin; OOD via a "not rice" class or embedding distance.
- Browser: **onnxruntime-web, WASM backend** (WebGL deprecated), self-host the .wasm, `navigator.storage.persist()`, offline self-check, `<input type="file" accept="image/*" capture="environment">` + gallery + bundled sample photos, persist the photo to IndexedDB before inference, downscale before decode, unlock audio on first tap.
- **Real cheap-Android test in the first 2 h** with a stub model; native app only if >1.5 s or crashes. Decide once.
- Cuts: Vosk ASR, Piper in-browser TTS, iOS, native app, hispa, second crop (slide only). Audio = 25–40 clips recorded by Zoha.

## 3. Agronomy & safety (could harm a farmer)
- "Seedbed by 31 Aug / transplant by 15 Sep" was BRRI's **2024 eastern-flood** advice (USDA GAIN BG2024-0009), direct-seeding BRRI dhan33/57/66/71/75, BINA dhan7/17 — not universal; **dhan87 is not in it** (it belongs to an earlier window). After ~15 Sep → **"too late for Aman; plan Boro/Rabi; ask your SAAO"**. Show source + year on every rule.
- Advisor inputs: standing variety (Sub1 or not), full vs partial submergence, days, growth stage, date. Non-Sub1 ≈ 4–7 days; Sub1 (dhan51/52/79, BINA 11/12) ≈ 10–14 days, vegetative stage only, not stagnant/deep or repeated floods; flooding at flowering = unrecoverable. Output "usually survives / usually fails / not sure" — never a %. Check recovery 5–7 days after water recedes; gap-fill if losses are partial; seedlings/seed via SAAO/upazila office/BADC. [VERIFY items in the agronomy report before the demo: dhan83 season, dhan97/99 season, survival days, replant threshold.]
- **Pesticides: no brand names, no doses, ever.** Carbofuran is banned (and still sold under other names). Tungro is a virus (no cure; leafhopper control, remove infected hills). BLB: no effective chemical (drain, stop extra urea). BPH: spraying broad-spectrum insecticides makes it worse. Fungicide only for blast/brown spot/sheath blight, and only "a DAE-registered product, ask your SAAO".
- Look-alikes: tungro ↔ N/Zn/S deficiency, cold, salt; brown spot ↔ Zn/K deficiency; BLB ↔ bacterial leaf streak, scald, scorch; hopperburn ↔ drought/stem borer. Sheath blight, neck blast, false smut, stem borer, BPH need a sheath/panicle/base/field photo → ask for it, else "not sure".
- Always route to the SAAO: any spraying, suspected BPH/tungro, replant/abandon decisions, seed sourcing, panicle-stage problems, poisoning (→ doctor). 16123 is 9–5, closed Friday — don't promise "anytime".

### Safe action-card template (every card, Bangla voice + text)
1. **What we see** — "Looks like X (not certain)"; "could also be A or B" where relevant.
2. **How sure and why** — "This photo shows only the leaf. To be sure, send a photo of [sheath/panicle/plant base/field]."
3. **Do now (no chemicals)** — water level, remove infected hills, no extra urea, scout again in 2–3 days.
4. **Do not** — e.g. "Do not spray before talking to your SAAO."
5. **If spraying is needed** — "Only a DAE-registered product, read the label, gloves and mask, never banned products like carbofuran." No names, no doses.
6. **Ask a person** — SAAO / union agriculture office; 16123 (9–5, closed Fri).
7. **Honesty footer** — "Computer advice from a photo. It can be wrong. It does not replace your agriculture officer."
Advisor cards add: the inputs used, "rule from BRRI/DAE advice, [year/region]", the cut-off date, seedling sourcing, "check recovery after 5–7 days".

## 4. Development case (5 lines we can say)
1. Aug 2024 floods damaged ~200,000 ha of Aman rice (USDA GAIN BG2024-0009); DAE reported ~339k ha crops damaged (UN SitRep); FAO ~$478M farm-sector damage. One SAAO serves ~900–2,000 families (verify year).
2. Women do much of the work but hold fewer smartphones (GSMA 2025: widest gap, 40%) → household/SAAO phone + SMS + human.
3. Existing tools identify problems (BRRI Rice Solution, Krishoker Janala, Rice Doctor, Plantix); none we found is an offline Bangla-voice *decision aid after a flood* that hands off to a human when unsure (absence of evidence — check the apps).
4. Phone-based advice: ~4% yield gain in a meta-analysis of 3 RCTs (PxD, via GiveWell). **We claim time-to-advice and safe escalation, not yield.**
5. Plugs into what exists: DAE/BRRI under the World Bank PARTNER programme; extension office as data controller.
**Never mention India/dams or attribute floods to climate change on stage.**

## 5. Three kill questions → pre-empt in the pitch
1. "Your accuracy is a lab number." → Show held-out next to in-dataset + abstention curve + the 0.72→0.44 literature, before they ask.
2. "What does the AI add over existing apps and a call centre?" → Comparison slide; advisor is deliberately rules; AI only for the leaf photo, offline, in Bangla.
3. "What's real vs mocked, and did any agronomist check this?" → Built / Seeded / Pre-existing caption; get ≥1 SAAO/agronomist comment this weekend; licence table; "does not cover" slide.
30 more Q&A with answers: ask Claude to regenerate from the judge report if needed (kept in session); top ones are covered above.

## 6. Video outline (~3:45, brief's required structure)
- 0:00–0:25 Problem sentence: "Because of this tool, a smallholder rice farmer in a flood-hit upazila will decide whether to wait, re-plant or switch variety within a day, which she would otherwise decide late or by guesswork; we know because one SAAO serves ~900–2,000 families and the 16123 helpline runs 9–5, closed Fridays [verify]."
- 0:25–1:05 AI and why not simpler + guardrails.
- 1:05–2:25 Demo in airplane mode: photo → result + Bangla voice; bad photo → "not sure"; advisor (simulated date, labelled); "share with SAAO" queued → syncs → dashboard; SMS preview (labelled simulated).
- 2:25–3:00 Evidence: held-out table, abstention curve, "does not cover", licence table.
- 3:00–3:25 Where it sits in her day + tech stack; built vs mocked.
- 3:25–3:45 Your take (Zoha, personal): localizing = tested on our fields, Bangla by voice, admits what it doesn't know, a local person decides; Bangla-only still leaves Chakma/Marma speakers behind.
