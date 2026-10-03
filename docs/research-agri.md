# Agriculture research notes (verified Sat 3 Oct evening)

Confidence H/M/L. Many sites were blocked to the research agent, so several items rest on search snippets: re-check licenses before relying on them.

## Datasets to build with
| Dataset | What | License | Conf | Link |
|---|---|---|---|---|
| **Uganda coffee leaf (Feb 2025)** | 3,312 imgs (256px) from Ugandan farms: Healthy 1,179 · Rust 1,023 · Phoma 1,110; partly augmented | **unverified — check** | M | https://data.mendeley.com/datasets/k36wnd6knb/1 |
| BRACOL | 1,747 Arabica leaf photos (smartphone, Brazil): healthy, miner, rust, phoma, cercospora; whole-leaf + cropped versions | CC BY 4.0 | M | https://data.mendeley.com/datasets/yy2k5y8mxg/1 |
| RoCoLe | 1,560 Robusta field photos (Ecuador): healthy / rust + severity | CC BY 4.0 | H | https://www.sciencedirect.com/science/article/pii/S2352340919307693 |
| JMuBEN | ~58.5k cropped/augmented Arabica images (Kenya), 5 classes; not real field shots | unverified | M | https://data.mendeley.com/datasets/t2r6rszp5c/1 |
| iBean (Makerere) | 1,296 bean field photos (Uganda) | MIT | H | https://github.com/AI-Lab-Makerere/ibean |

**Plan:** train on BRACOL + RoCoLe (+ Uganda train split if license OK); **hold out Ugandan field photos as the test set** and report the studio→field gap (the brief scores this).

## Language: Luganda (stress-test answer: Kinyarwanda; avoid Amharic)
- Common Voice Luganda ≈ 435 validated h (v18) — M.
- `facebook/mms-tts-lug` (VITS, 36.3M params, ~40 MB int8 est.) — **CC-BY-NC 4.0** (prototype OK; say so on stage). Permissive route to deployment: Sunbird Luganda TTS (Apache 2.0, ≥1 model), Meta Omnilingual ASR (Apache 2.0, ~325M params — too big for offline PWA).
- Kinyarwanda ~1,900 validated h in Common Voice; Amharic only ~1.9 h → weak.
- Design consequence: **voice output from fixed cards (TTS or pre-recorded), no free-form ASR in the core.**

## Offline in the browser
- TF.js MobileNet on Pixel 4: WASM 182 ms · WASM+SIMD 82 ms · WebGL 76 ms (H). MobileNetV3-Small int8 ≈ 1–3 MB (est.).
- Chromium allows an origin up to ~60% of disk; call `navigator.storage.persist()` so the cached model isn't evicted (M).
- No measured onnxruntime-web latency on a low-end Android found: **measure our own**.

## Problem evidence (cite in pitch/README)
- Rust: ~20% loss in Central American Arabica 2012; production −16% (2013); Colombia −31% (Avelino et al. 2015, H) https://repositorio.catie.ac.cr/handle/11554/7223
- PlantwisePlus (Tanzania factsheet): losses up to 70%; **preventive copper oxychloride at start of rains (Sept & March)**; threshold ~2 spots/leaf; spray leaf undersides (M) https://plantwiseplusknowledgebank.org/doi/full/10.1079/pwkb.20127801774
- Uganda: ~1.8M coffee households; Robusta/Arabica ≈ 85/15 by production (USDA FAS 2024/25); 17% of farmers grow Arabica (M).
- Extension ratio **1:1,800 vs recommended 1:500** (MoFPED BMAU briefing paper, Dec 2022, M).
- **UCDA dissolved Nov 2024** → now MAAIF Department of Coffee Development (DCD). Cite DCD.

## Price reference
- DCD monthly report, July 2025 farm-gate: Arabica parchment UGX 13,750/kg · Kiboko 5,250 · FAQ 10,250 (PDF, M). Bundle as a dated table.
- WFP HDX Uganda prices (2006–Mar 2025) cover staples; coffee likely absent → don't rely on it.

## Prior art to address
- PlantVillage Nuru (offline crop diagnosis app) — prepare a one-line "how we differ" (from training; verify).

## Not verified
Licenses of JMuBEN and the Uganda dataset · current CV hours (Swahili, Luganda) · Omnilingual ASR Luganda coverage · low-end Android latency · Uganda-specific spray calendar from MAAIF/DCD.
