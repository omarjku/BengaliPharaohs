# Submission checklist (deadline Sun 4 Oct 15:00 Vienna)

Status as of the judge walk-through, Sun 4 Oct. Owner: O = Omar, Z = Zoha.

## Required by the brief
| Item | Status | Who | Notes |
|---|---|---|---|
| Prototype link | ✅ | O | https://dhansathi-gilt.vercel.app, backend on Railway; `/api/health` ok |
| Code | ❌ | O | Repo is PRIVATE (checked 4 Oct). Make public or share with judges, then paste the URL in README |
| Video 2-5 min, uploaded | ❌ | Z | Script: `docs/video-script.md`. Upload by 13:00, test the link in a private window |
| Video: problem sentence (one sentence, with evidence) | ❌ | Z | Draft in the script; verify the 200,000 ha and SAAO ratio sources |
| Video: AI capabilities + why not SMS/spreadsheet/search + guardrails | ❌ | Z/O | Script section 2 |
| Video: demo, end-to-end journey | ❌ | Z | Record `DEMO.md` on a real phone, airplane mode visible |
| Video: where it sits in the user's day + tech stack | ❌ | Z | Script section 5, needs a simple timeline graphic |
| Video: "what localizing AI means to you" | ❌ | Z | Zoha writes in her own words |
| Works offline, core feature | ✅ (desktop) / ❌ (phone) | O/Z | Playwright offline test passes; no real-phone airplane test recorded |
| Named local language, at least one interaction | ✅ | Z | Bangla UI + voice cards; Bangla text is a Claude draft pending Zoha review |
| Runs on a device the user already has | ❌ | O/Z | Not tested on a cheap Android; measure and write the number into `docs/results.md` |
| Model small enough to side-load | ✅ | O | 6.1 MB fp32 ONNX (27 MB total precache) |
| Fixed answer list, no hallucination | ✅ | Z | 16 cards, no LLM in the farmer path |
| Responsible AI: "not sure, ask a person", human decides | ✅ | Z | Verified live: bean leaf and `blb-1` give NOT SURE |
| Say what the data does NOT cover (scored) | ✅ | O | `docs/data.md`, README; add to video/slide |
| Data sources cited, licences, synthetic labelled | ✅ | O | `docs/data.md` licence table; seeded cases tagged |
| Evidence it works (a real number, how measured) | ✅ | O | Held-out AgML-BD 74% when answering / 63% coverage, in README and `docs/results.md` |

## Strongly recommended
| Item | Status | Who |
|---|---|---|
| Real-phone latency and offline run on a cheap Android | ❌ | O+Z |
| Agronomist/SAAO comment, even one line | ❌ | Z |
| Backup recording `demo/backup.mp4` | ❌ | Z |
| Zoha reviews Bangla card text and `strings.ts` | ❌ | Z |
| Decision on context rescue below min_prob (`docs/e2e-report.md` finding 4) | ❌ | Z+O |
| README judge-ready | ✅ | O (this branch) |
| `make smoke` green and tag `demo-ok` before the final push | ❌ | O |
| Railway SQLite on a persistent volume (`/data`); verified a case survives redeploys | ✅ | O |
| Stage-safe SAAO code (never visible on screen or in the repo) | ✅ | O |
| Name BAMIS and BRRI Rice Solution as closest tools on a slide | ❌ | Z |
| Entrants aged 18-35 confirmed on the form | ❌ | O+Z |

## Added by the judge audit (`docs/judge-audit.md`)
| Item | Status | Who |
|---|---|---|
| Delete `/demo` scaffold page from production | ❌ | frontend owner |
| Strip raw source ids "(S_MOA)" from calendar text; Latin digits for 16123 in English | ❌ | frontend owner |
| Reconcile claims: model 5.8 vs 6.1 MB, audio recorded vs ElevenLabs (label synthetic), STT shipped or not | ❌ | O+Z |
| Slides: SMS/spreadsheet/search comparison, problem data with year+country, "does not cover", day timeline + stack, Responsible AI | ❌ | Z |
| Rehearsed answer on a less-supported language (Chakma/Marma) | ❌ | Z |
