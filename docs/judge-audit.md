# Judge audit: Agronomy vs the World Bank Challenge 04 brief

Written Sun 4 Oct 2026 (deadline 15:00 Vienna, video by 13:00) as the Agriculture panel chair. Sources: the brief (`docs/challenges/04-...md`, §05-§09, Annex B), every doc in this repo, the code, and a Playwright walk of https://dhansathi-gilt.vercel.app at Pixel 5 size in Bangla and English (home, leaf check end to end with `blast-1.jpg`, flood, calendar, cases, profile). Owners: O = Omar, Z = Zoha. Code changes are listed, not made (frontend and backend belong to other agents).

## Verdict in five lines
1. The product is strong on the thing that is pass/fail: fixed answers, "not sure, ask a person", no pesticide doses, nothing leaves the phone without consent. Keep it.
2. The submission is currently **not shortlist-eligible**: no video exists ("entries without this will not make it to the shortlist"), and the GitHub repo is **PRIVATE** while the brief asks for "the code, or a link to it".
3. The two "must" claims we cannot yet evidence are **"runs on a device the user already has"** (no real-phone run, no latency number) and **"≥1 interaction in a local language by voice or text"** is met only as Bangla UI text and played-back audio. Offline Bangla speech input is not in the app (see finding 4).
4. We have the best honest-evidence story in the field (held-out 74% when answering, LODO table, "does not cover"). It scores only if it is **on screen in the video**, not just in the README.
5. A scaffold page (`/demo`, "BUILDING BLOCKS, UI demo") is live on the production URL. Remove it before a judge finds it.

---

## 1. Requirement matrix

Status: ✅ met, ⚠️ partial, ❌ missing. Effort in minutes.

### Rules (§06) and what you build (§05)

| # | Requirement (brief) | Where we satisfy it | Status | Fix | Owner | Min |
|---|---|---|---|---|---|---|
| R1 | One sector, one Small AI tool addressing one or more of Noor's challenges | Agriculture; leaf photo + flood advisor + SAAO hand-off (README, DEMO) | ✅ | In the video, map Noor to Rahim in one sentence ("same constraints, rice, Bangladesh: slow extension, no independent reference"). Say plainly that the **price reference** half of Noor's problem is not built (honest scope) | Z | 5 |
| R2 | Working prototype (app/chatbot/SMS/voice line) | Live PWA + Railway backend + SAAO dashboard; 66 unit tests, 2 Playwright golden paths | ✅ | Live walk worked. `/api/health` answers `{"ok":true,"provider":"mock"}` (fine, no LLM in path) | - | 0 |
| R3 | "Code, or a link to it" is deliverable 1 | Repo `omarjku/BengaliPharaohs` | ❌ | `gh repo view` says **PRIVATE**. Make it public (check no secrets in history: `.env` is gitignored) or add the judges' GitHub handles / give a zip. Put the URL in README top | O | 10 |
| R4 | A clear answer: what AI is used and how it beats other digital tools; "if SMS, a spreadsheet or search could do the same job, AI may not be the best tool" | README "How it works", `video-script.md` §2. Honest split: leaf photo = AI, flood advice = rule table | ⚠️ | Good logic but it exists only in text. Needs one slide: three columns SMS / spreadsheet / search vs "photo of a leaf, offline, in Bangla". Also name BAMIS and BRRI Rice Solution as existing AI photo apps and state our delta | Z | 20 |
| R5 | Proof it works on at least one sector (an image it helps classify) | `docs/results.md`: held-out AgML-BD 74% right when answering / 63% coverage; 60/60 bean leaves NOT SURE | ✅ | Show the table in the video (10 s), and the confidently-wrong case honestly | Z | 10 |
| R6 | **Runs on a device the user already has** | Persona claim: cheapest Android in Chrome, PWA | ⚠️ -> ❌ for evidence | No real-phone run exists; latency is a laptop number (11-14 ms, M4). The checklist itself marks it ❌. Borrow any cheap Android, install from the live URL, airplane mode, time one inference, screen-record. If no cheap phone: Chrome DevTools 4x CPU throttle + Pixel emulation as a labelled fallback, and say "not yet measured on hardware" | O+Z | 40 |
| R7 | **Core feature works offline** | SW precaches ~27 MB; Playwright offline test passes; DEMO has an airplane-mode segment | ⚠️ | Desktop-proven only. Record the real phone in airplane mode (this footage is also the video demo). Verify on a **force-stopped, relaunched** PWA, not a warm tab | Z | 30 (shared with R6) |
| R8 | Model files small enough to side-load / send over weak link | ONNX fp32 **5.8 MB on disk** (README says 6.1 MB; MB vs MiB, make one number); ~27 MB total precache | ✅ | Use one number everywhere. Add one sentence: "27 MB is about 25 MB of mobile data at about Tk 0.3 per MB" only if you can source the price; otherwise skip. Mention int8 tried and rejected (shows engineering honesty) | O | 5 |
| R9 | **At least one interaction in a local language, by voice or text; name the language** | Default UI language is Bangla (`i18n.tsx` default `bn`); cards in Bangla text + 57 pre-recorded audio clips; Bangla question audio | ⚠️ | Text: met. Voice **input**: not shipped (`asr/match.ts` is imported by no screen; no sherpa/WASM in `package.json`; `stt-plan.md` is a plan). Voice **output**: clips exist. Decide now (finding 4). Also resolve provenance: CLAUDE.md says "ElevenLabs pre-generated clips", DEMO says "recorded by Zoha". If synthetic, label it ("synthetic Bangla voice") per §7.2's own rule; if Zoha's own voice, say that | Z+O | 15 (labelling) |
| R10 | "Expect to be asked how the tool would fare in a **less-supported language**" | Only a half-sentence in `video-script.md` §6 ("Chakma and Marma left behind") | ⚠️ | Prepare a real answer (text below in section 3). Add it to README (done in this branch) and to Q&A card | Z | 10 |
| R11 | Guardrail: human-in-the-loop, tool flags unsureness, does not act for the user | NOT SURE card (C8), "Do not spray before talking to your SAAO", share only on tap, SAAO decides. Seen live: result page says "not certain", "could also be brown spot", "computer advice from a photo, it can be wrong" | ✅ | Show it on screen in the video, in the first 60 s | Z | 0 |
| R12 | Guardrail: avoid hallucinations | No LLM in farmer path; fixed 16 cards; deterministic rules | ✅ | Say the glossary phrase "fixed list of answers" literally, it is a scored term | Z | 0 |
| R13 | Agentic workflows must check in with the user | Not agentic | ✅ | Say "not agentic, by design" | Z | 0 |

### Data (§07)

| # | Requirement | Where | Status | Fix | Owner | Min |
|---|---|---|---|---|---|---|
| D1 | Cite data sources | `docs/data.md`, README table | ✅ | - | - | 0 |
| D2 | Kind 1, the problem data: cite source, year, country; flag figures from synthetic modelling or an article | Problem sentence cites USDA GAIN BG2024-0009 (200,000 ha), ais.gov.bd (16123 hours). SAAO ratio source is g-fras with "year unclear" | ⚠️ | Verify 200,000 ha against the GAIN page; cut or soften the SAAO ratio ("hundreds of families per officer") unless a dated source is found. Add year and country to each number in the slide. Use 1-2 **common** datasets for the problem (GSMA gender gap 2025, BBS Jul-Sep 2025 smartphone share are already in `prior-art.md`) on one "who has the phone" slide | Z (O verifies) | 25 |
| D3 | Kind 2, data you build with: name every dataset, source, licence, size | `docs/data.md` table with licence, counts, role (excellent) | ✅ | **Missing rows**: the offline speech model (Vosk bn, Apache-2.0, ~28 MB int8) if it ships, the audio clips (synthetic or human?), the BRRI/DAE rule sources and the model init (ImageNet-pretrained MobileNetV3-Small, licence). Add them | O | 10 |
| D4 | "What your data does not cover" (**scored**) | `docs/data.md` + README (comprehensive: flood-stress photos, BPH, stem borer, panicle diseases, Boro season, districts, cheap cameras) | ✅ in text / ❌ on screen | It is in no screen of the app and not yet in the video. One slide, 15 s, read three items aloud | Z | 10 |
| D5 | Label synthetic data | "seeded" tag on dashboard cases; demo date "simulated" | ✅ | Seeded dashboard rows show raw debug chips (`where=middle`, `p=0.81`): cosmetic, fix if time. Also the audio provenance (R9) | Z | 5 |
| D6 | Known dataset gap vs reality ("studio images perform poorly in the field") | LODO table, held-out dataset, bias note (tungro 97% one source) | ✅ | This is our strongest data-grounding evidence. Lead with it | Z | 0 |
| D7 | Use both data layers (common + sector) | Sector: our own picks (BD datasets), iBean. Common: none used in the product; GSMA/BBS only in research notes | ⚠️ | Not required ("suggestions"), but a judge will look for a common dataset. Cheapest win: cite GSMA/BBS device data on the persona slide; mention Common Voice / SLR53 / Vosk as the speech baseline in the local-language answer | Z | 10 |

### Deliverables (§08)

| # | Requirement | Where | Status | Fix | Owner | Min |
|---|---|---|---|---|---|---|
| V0 | **Video 2-5 min, uploaded** (no video = not shortlisted) | Script `docs/video-script.md` (4:00), no footage | ❌ | Record on the real phone (airplane mode visible), edit, upload unlisted, test in a private window by 13:00 | Z (O supplies numbers) | 120+ |
| V1 | Problem sentence: "Because of this tool, [user] will [action] by [when] that they would otherwise [not do / do late / do worse]; we know because [evidence]" | Script §1: "...decide whether to wait, re-plant or switch to Boro within a day of the water going down, which he would otherwise decide late or by guesswork. We know because ..." | ⚠️ | Template fits. Weak spots: the evidence is about the problem's size, not that the tool changes the decision. Add the one thing we measured about the tool (60/60 not-rice declined; answers 63%, right 74%). Verify the two numbers first | Z | 10 |
| V2 | AI capabilities, why a simpler tool would not do, **mention the guardrails** | Script §2 | ✅ in script | Needs the SMS / spreadsheet / search comparison slide (R4) | Z | (R4) |
| V3 | Tool demo, clear end-to-end user journey (slides or screen recording) | `DEMO.md` 2:00 path | ⚠️ | The wizard is **6 screens** before an answer on the live app (photo, farm details, where/how many, which leaves, insects, weather/flood context, then Skip). Fine for a farmer, painful in a 90 s video. In the demo tap "Don't know"/Skip fast, or cut to the result with a jump-cut labelled "5 quick taps, sped up". Do not hide that the wizard exists | Z | 10 |
| V4 | Where the tool sits in the user's day: when they open it, what they do, what happens next; **tech stack** | Script §5 (needs a timeline graphic) | ❌ (graphic) | One slide: 6:30 walk the bund -> photo -> card -> (unsure) share -> evening sync; plus stack boxes | Z | 25 |
| V5 | "Your take": what localizing AI development means to you | Script §6 draft by Claude; Zoha to rewrite | ⚠️ | Must be Zoha's own words and cover the trade-offs the brief invites ("candidly, opportunities and risks"): trained on BD fields, Bangla voice, admits ignorance; **risk**: Bangla-only leaves Chakma/Marma out, model weak outside its source districts, a phone does not fix a missing registry | Z | 15 |
| V6 | Video length 2-5 min | Script targets 4:00 | ✅ | Time the read-through; the script is dense (about 600 words of VO plus demo) | Z | 5 |

### Responsible AI (pass/fail) and other

| # | Requirement | Where | Status | Fix | Owner | Min |
|---|---|---|---|---|---|---|
| P1 | "Not sure, ask a person" fail-safe | NOT SURE below 0.80 and for non-rice; follow-up questions can only keep/swap/decline | ✅ | - | - | 0 |
| P2 | Credible **privacy, consent, bias, human oversight** account | Scattered: README guardrails line, EXIF stripped on re-encode (`compress.ts`), consent dialog (DEMO), bias in `data.md`. The red-team asked for "one page"; none exists | ⚠️ | Add one on-screen/README block: inference on device; photo stays unless "Share"; EXIF/GPS stripped; anonymous case id; who reads it (SAAO); bias by district/variety/season (done in this branch, README "Responsible AI"). In-app "About / limits" screen would be ideal (code change, see TODO) | O/Z | 20 |
| P3 | Entrants aged 18-35 | Unconfirmed | ⚠️ | Confirm both on the submission form (CLAUDE.md says required) | O+Z | 2 |
| P4 | Evidence from a domain expert | None. The red-team's kill question 3 | ❌ | One SAAO or agronomist line, even a WhatsApp reply, shown on a slide with the name/role, or say clearly "not yet reviewed by an agronomist, here is how we constrained the content (BRRI/DAE sources, no doses)" | Z | 30 |
| P5 | Public production surface is clean | `/demo` live: "BUILDING BLOCKS / UI demo / Motion" in English. Calendar shows raw source ids "(S_BRRI_RA1718)", "(S_MOA)". English mode shows Bangla digits "১৬১২৩" for 16123 | ❌ | Code changes for the frontend agent (see TODO 5) | Frontend owner | 15 |

---

## 2. Per-criterion view

### The built solution, Small AI fidelity (25%)
- **Judges look for:** one end-to-end run inside the constraints: offline, on a phone, small model, local language.
- **Strongest evidence:** a working PWA with an on-device 5.8 MB ONNX model, a service worker that precaches everything, store-and-forward to a live backend, SAAO dashboard, tests, an offline Playwright path.
- **Biggest gap:** nothing was ever run on a real cheap Android, and Bangla voice input is not shipped. The constraints are the scoring axis, so the unproven constraint (device) is where points are lost.
- **Single change:** 40 minutes on a real phone: airplane mode, force-stop, relaunch, time the inference, screen-record. That one recording becomes the video demo and the latency number.

### Development relevance and impact (20%)
- **Judges look for:** a real problem from the sector brief and an outcome that matters to the person.
- **Strongest evidence:** Aug 2024 flood damage (about 200,000 ha, USDA GAIN), the 16123 helpline closing Fri/Sat/holidays, and an advisor built on BRRI/DAE rules with source and year per rule. It matches Annex B's own examples ("identifying a crop problem", "timing a farming activity", "connecting evidence to an extension-service next step").
- **Biggest gap:** the brief's persona is Noor (coffee, price-blind). We switched crop and country, which is allowed, but the video never says how Noor's constraints carry over, and the price-reference half of Annex B is unaddressed. The evidence for the decision change is "we claim time-to-advice", with no time measured.
- **Single change:** measure one time-to-advice number (stopwatch: leaf photo to card, on the phone, vs "call 16123 or visit the SAAO"), and add the Noor-to-Rahim mapping line.

### Data grounding (15%)
- **Judges look for:** both data layers, licences, sizes, honesty about the lab-to-field gap, "does not cover".
- **Strongest evidence:** `docs/data.md` (licences, counts, role, near-duplicate grouping, known biases) and LODO. This is better than most entries.
- **Biggest gap:** it lives in markdown. The problem-data side (kind 1) leans on one USDA report and an unverifiable SAAO ratio, and no common dataset (GSMA, Findex, CHIRPS, Common Voice) is used or cited in the product story.
- **Single change:** two slides: "the problem data" (with year and country on each figure) and "what our data does not cover" (read 3 items aloud).

### Evidence it works (15%)
- **Judges look for:** a number, how it was measured, honesty.
- **Strongest evidence:** held-out Bangladeshi dataset (549 photos): 63.4% answered, 74.4% right when answering; 95% validation shown beside it; 60/60 unseen bean leaves declined; browser/Python parity 50/50; the cited 0.72 -> 0.44 literature gap.
- **Biggest gap:** the 74% means one answer in four is wrong. BLB is 24/116 and two samples in `DEMO.md` are confidently wrong (sheath blight 0.96 on `brown_spot-2`, tungro 0.997 on `blb-2`). No agronomist has checked the cards. There is no user test with a single farmer or SAAO.
- **Single change:** show the confidently-wrong case on camera once, with the narration "this is why a person decides", and get one SAAO/agronomist sentence. Judges reward the admission more than a clean demo.

### Clarity, design and inclusivity; value of AI (15%)
- **Judges look for:** what the AI does, whether SMS/spreadsheet/search would do the same job, and inclusion.
- **Strongest evidence:** the clean split "AI only for the leaf photo; the advisor is deliberately a rule table" and "no LLM in the farmer's path". Bangla-first UI, large touch targets, audio on every card, the result card is clear (verified live: what we see / how sure / do now / do not / ask SAAO / honesty footer).
- **Biggest gap:** "why not SMS" is argued in prose only. Inclusivity: a male-farmer persona, a Bangla-only product, literacy not addressed beyond audio, and voice input absent.
- **Single change:** the three-column comparison slide, plus the on-screen audio icon in the demo so a judge sees "listen, no reading needed".

### Scalability, replicability, what happens next (10%)
- **Judges look for:** another setting reuses it; honest preconditions (Annex B: registry, phones, trust).
- **Strongest evidence:** architecture is data-driven: 16 cards and rules are JSON (`cards.json`, `rules.json`), the model is swappable, hand-off uses an existing institution (SAAO under DAE), PWA needs no app store.
- **Biggest gap:** the pitch has a "12-week venture plan" row (Venture Lab) but no World-Bank-shaped next step, and no mention of the registry precondition that Annex B stresses.
- **Single change:** 20 seconds: "to scale you need (1) SAAO-labelled photos through the Share button to close the camera/district gap, (2) a language pack = translate 16 cards + record clips, no retraining, (3) the DAE farmer registry for reach; without it any tool pilots only."

### Responsible AI, data and safety (pass/fail)
- **Judges look for:** fail-safe "not sure, ask a person", human stays in the loop, credible privacy / consent / bias / oversight account.
- **Strongest evidence:** NOT SURE card; no doses or brand names; carbofuran warning; share only after consent; EXIF stripped; seeded data labelled; "could be wrong" footer.
- **Biggest gap:** the account is spread over five files and none is on screen. Three accountability facts are unresolved: audio provenance, who is the data controller for shared cases (Bangladesh personal-data law is flagged "verify" in the red-team), and no expert review.
- **Single change:** one "Responsible AI" slide in the video (10 s per line: on-device, consent, no doses, NOT SURE, bias, SAAO decides) and the same text in README (added in this branch).

---

## 3. Are we building in the right direction?

### Stop investing (judges will not reward it)
- **The `/demo` scaffold page and any further UI motion work.** It is live and visible. Delete.
- **Venture-Lab pitch material** (`PITCH.md` 12-week plan, ask, "Venture Lab selects for ..."). Graded video follows the brief; this is a different audience (10 Oct).
- **SMS preview for keypad phones.** Simulated, no gateway. It is fine as a single slide line, but each polish hour here scores nothing (brief names SMS as a *comparison*, and we already say rules beat SMS only where AI is needed). Keep it clearly labelled, do not extend.
- **Calendar tab, area-update pack, voice-note recording.** Nice, off the golden path; the rubric asks for "one better decision". Do not demo them and do not promise them in the video.
- **int8 / model squeezing.** 5.8 MB is already side-loadable; more work on size is wasted.
- **More model accuracy work** unless it is the held-out photos in the video. The honest 74% is a feature.

### Add, only if at most 2 hours (they reward it, we lack it)
| Item | What the judge wants | Is it in the path? | Do it? |
|---|---|---|---|
| **Local-language interaction, voice** | "by voice or text". Text is there. Voice **output** exists as clips. Voice **input** is only a plan (`stt-plan.md` estimates 4h of WASM work) | Bangla text and Listen button are in the demo path. Speech input is not | **Do not build STT now.** 4h+, risk of breaking the demo; the rule is satisfied by text. Instead: say "Bangla text and Bangla voice playback; offline speech input is designed (gate test CER 7.8% on clean clips) and not yet shipped". Remove the "Reversed: STT is back in" implication from every doc you show judges |
| "Less-supported language" answer | They will ask. Chakma/Marma | Q&A only | **Do, 10 min.** Answer below |
| "Device the user already has" | Evidence, not assertion | No | **Do, 40 min** (R6) |
| Side-loadable size | "6 MB model, 27 MB total" and how it was sent | Number is in docs | Say it on screen; add "can be shared via Bluetooth/SHAREit as a PWA?" only if tested; otherwise skip |
| Guardrails/human-in-loop visible | On screen, early | Yes (NOT SURE, SAAO share) | Make sure the video shows it before 1:00 |
| Data-grounding slide items | problem data with year/country; licences; "does not cover"; synthetic labelled | Not in app | **Do, 35 min** (D2, D4) |
| Problem sentence template | exact form | Script has it | Edit per V1 |
| Why not SMS/spreadsheet/search | explicit | Prose only | **Do, 20 min** (R4) |
| Scalability story | reuse elsewhere + preconditions | Script lacks | **Do, 10 min** |
| Privacy/consent/bias statement | credible account, pass/fail | Scattered | **Do, 20 min**; README block added |
| Required video parts | five parts | Script covers all five | Record it. That is the item that decides shortlist |
| In-app "About and limits" screen | one tap to: sources, what it does not cover, privacy, "ask a person" | Absent | **Do if the frontend owner has 30 min** (TODO 7). Strong for pass/fail and data-grounding |

### The "less-supported language" answer (rehearse, 20 seconds)
> "Bangla is supported by our stack: Vosk Bengali for speech, ElevenLabs/own recordings for voice, plenty of text. Chakma and Marma are not: there is no public speech corpus we found, only small text sets. So we would not fake it. Because our answers are a fixed list of 16 cards with IDs, a new language is a translation and recording job done with local speakers and an extension officer, not a retrained model. Until a card is checked by a native speaker we would keep it in Bangla with icons and audio, and the human officer remains the fallback. A free-text LLM would be worse here, because we could not check what it says in a language our team cannot read."

Verify "no public speech corpus" before saying it (`docs/research-bangladesh.md` marks it as "none found").

### Risks that sink an otherwise strong entry
1. No video / private repo (shortlist eligibility).
2. First judge impression: the Bangla home screen is clean, but the "Checking..." status, the stray `/demo` page and raw source ids in the calendar make it feel unfinished.
3. A judge tries `blb-2.jpg`-style inputs on the live app and gets a confident wrong answer. That is the known 74% (honest) but they should hear "we know, here are the numbers" first. Include one such case in the video to pre-empt.
4. Claims drift: README says 6.1 MB, disk is 5.8 MB (`frontend/public/model/rice.onnx`); DEMO says audio "recorded by Zoha", CLAUDE.md says ElevenLabs; `stt-plan.md` and CLAUDE.md say STT is "back in" while the app has none. Reconcile before any claim is made on camera.

---

## 4. Ranked TODO for today (deadline 15:00; video 13:00)

| # | Task | Owner | Min | Why (score) |
|---|---|---|---|---|
| 1 | Make the GitHub repo public (or share with judges), confirm no secrets in history, paste URL into README and the submission form | O | 10 | Deliverable 1; currently private |
| 2 | Real-phone run: cheap Android, install from live URL, airplane mode, force-stop relaunch, time photo-to-card, record screen. Write the number into `docs/results.md`; if no phone, labelled DevTools-throttled number | O+Z | 40 | Built solution 25%, device claim, offline claim, and it is the demo footage |
| 3 | Record, edit, upload the video (all five parts; real-phone footage; show NOT SURE before 1:00; one confidently-wrong case; slides for problem data, "does not cover", SMS/spreadsheet/search, day timeline + stack, Responsible AI). Test unlisted link in a private window | Z | 150 | Without it no shortlist |
| 4 | Make the slides in 3 faster: copy text from this audit's section 3 and `video-script.md`; verify the 200,000 ha and SAAO ratio numbers (or soften wording) | Z (O verifies) | 40 | Data grounding 15%, clarity 15% |
| 5 | Frontend cleanup (**frontend owner, not done here**): delete `frontend/src/app/demo/`; strip raw source ids like `(S_BRRI_RA1718)` from calendar/flood strings or show them as a "Source" link; use Latin digits for 16123 in English mode; remove debug chips (`where=`, `p=`) from the SAAO dashboard | Frontend owner | 15 | First-impression, polish |
| 6 | Resolve claims drift: audio provenance (label synthetic voice if ElevenLabs), model size (one number), STT status in `CLAUDE.md`/`DEMO.md`/`stt-plan.md` (shipped or not; default: not shipped, text + playback only) | O+Z | 15 | Honesty; responsible-AI credibility |
| 7 | In-app "About and limits" screen (**frontend owner**): sources + licences link, "what the data does not cover" (3-5 lines), privacy (on-device, consent, EXIF stripped), "ask a person" and 16123 hours, language note. Mirrors README | Frontend owner | 30 | Pass/fail + data grounding visible to a judge who only opens the URL |
| 8 | One agronomist/SAAO line: message one person, show reply (or the honest "not yet reviewed" line) on a slide | Z | 30 | Evidence 15%, kill question 3 |
| 9 | Zoha rewrites "your take" in her own words, including the risks and the Chakma/Marma limit; rehearse the 20 s less-supported-language answer | Z | 20 | Required video part; localisation story |
| 10 | Stopwatch time-to-advice: leaf photo to card on the phone vs calling 16123 / visiting the SAAO (estimates labelled as such) | O | 15 | Development relevance: the outcome claim finally has one measured number |
| 11 | Add the missing `docs/data.md` rows (audio clips, speech model if mentioned, ImageNet init, rule sources) and the common datasets used for the problem slide (GSMA 2025, BBS 2025) | O | 15 | Data grounding, licence rule |
| 12 | Submission form hygiene: ages 18-35 confirmed, repo link, live link, video link opened in a private window, `make smoke` green, `make tag`, push by 14:00 | O+Z | 20 | Do not lose it on logistics |

Total about 6.5 hours of person-time across two people, with #3 as the critical path (start it at 09:00 at the latest after the phone recording).

## Cut list if time runs short
Drop #7, #10, #11 first (keep the information in README and slides instead). Never drop #1, #2 (at least the airplane-mode recording), #3, #12.
