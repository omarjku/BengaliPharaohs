# Bangladesh / Bangla option — research notes (Sat 3 Oct evening)

Confidence H/M/L. Several sources blocked to the research agent; re-check licenses before relying on them.

## Setting: Ruma, Bandarban (Chittagong Hill Tracts)
- Coffee is real but small: DAE coffee + cashew project, Tk 158.54 cr (~$13.5M), 2021–25, 49,500 farmers trained. Bandarban ~544 ha, ~122 t cherry FY24-25, ~1,930 growers, mostly Ruma; many Bawm/Marma hill farmers (M) — https://news.mongabay.com/2024/05/as-coffee-expands-in-bangladesh-hills-conservationists-worry-about-ecosystems/ · https://www.tbsnews.net/agriculture/ctg-farmers-achieve-landmark-coffee-harvest-eyes-set-export-potential-1011531 (area figure conflicts: 544 vs 850 ha)
- Pains match Noor: mealybug, dieback, root rot; no processing locally; raw beans Tk 150–200/kg vs ~Tk 600 dried (M) — https://bdnews24.com/bangladesh/elvw5vxuos
- Languages: Chakma (~600k), Marma, Tripura, Bawm… text-only resources (ChakmaBridge 807 sentences; MELD Chakma/Garo/Marma in Bengali script); **no speech corpus found** (H) — https://aclanthology.org/2025.banglalp-1.21.pdf · https://data.mendeley.com/datasets/dy5dyfygbp/2

## Problem evidence
- 16.8M farm households (2019 census); agriculture 44.67% of employment (LFS 2024) (M) — https://www.thedailystar.net/business/economy/news/results-agriculture-census-unveiled-3206691
- ~14,092 DAE field agents (SAAO), each 900–2,000 farm families (year unclear) (M) — https://www.g-fras.org/en/world-wide-extension-study/92-world-wide-extension-study/asia/southern-asia/284-bangladesh.html
- GSMA 2025: Bangladesh has the **widest smartphone gender gap among surveyed countries, 40%**; phone ownership ~85% men vs ~68% women (secondary) (M) — https://www.gsma.com/gender-gap-2025/
- Findex 2025: account ownership ~33% women vs ~54% men (L, secondary) — https://www.mdpi.com/1911-8074/19/9/732

## Institutions and prior art
- **World Bank PARTNER** (PforR) funds DAE digital extension, target 5M farmers; predecessor NATP-2 → pitch as a plug-in (H) — https://documents1.worldbank.org/curated/en/099013024125520372/pdf/P1815631237b350e19c9a1769dd833adc0.pdf
- **Krishoker Janala** (DAE + a2i): offline, manual symptom-photo matching, 1,000+ problems / 120 crops → our edge: automatic classification + voice + "not sure" (H) — https://www.researchgate.net/publication/331739070
- Krishi Call Centre 16123: ~92k calls FY25-26, 9–5, closed Fri. Plantix USAID pilot in 7 districts, none in CHT (H) — https://www.bssnews.net/special-stories/401845 · https://www.digitalfrontiersdai.com/resources/feed-the-future-bangladesh-digital-agriculture-activity-plantix-pilot-end-line-assessment-report/

## Image datasets (no Bangladeshi coffee set exists)
| Dataset | Size / classes | License | Link |
|---|---|---|---|
| Beans/corn (BD) | 2,032 bean + 706 corn | unchecked | https://data.mendeley.com/datasets/462s4m8w8k/1 |
| Dhan-Shomadhan (rice) | 1,106 imgs, 5 classes, field + white bg | unchecked | https://data.mendeley.com/datasets/znsxdctwtt/1 |
| Jute | 1,390 imgs, 5 classes | unchecked | https://pmc.ncbi.nlm.nih.gov/articles/PMC12720131/ |
| MangoLeafBD | 4,000 imgs | CC BY 4.0 | https://pmc.ncbi.nlm.nih.gov/articles/PMC9932726/ |
| teaLeafBD | 7 classes | CC BY-NC | https://pmc.ncbi.nlm.nih.gov/articles/PMC12221660/ |
Coffee: use BRACOL / RoCoLe / Uganda set (see `research-agri.md`) and state the gap.

## Bangla speech / NLP
- Common Voice Bengali v9: 399 h recorded, only 56 h validated — https://arxiv.org/pdf/2206.14053
- OpenSLR SLR53: ~196k utterances, CC BY-SA 4.0 — https://www.openslr.org/53/
- MMS-TTS ben: **CC-BY-NC 4.0** — https://huggingface.co/facebook/mms-tts-ben
- Whisper large-v3 ≈ 34% WER on FLEURS Bengali — https://arxiv.org/pdf/2507.01931
- BanglaBERT: CC BY-NC-SA — https://github.com/csebuetnlp/banglabert
- Offline ASR: Vosk small-bn; sherpa-onnx Bengali zipformer (~83 MB, secondary) — https://github.com/k2-fsa/sherpa-onnx

## Prices and climate
- DAM daily national/district prices, 271 products (no coffee) — https://market.dam.gov.bd/market_daily_price_report?L=E
- WFP HDX Bangladesh prices 1998–Feb 2025 (no coffee) — https://data.humdata.org/dataset/wfp-food-prices-for-bangladesh
- CHIRPS v3 covers Bangladesh (0.05°, 1981–present) — https://developers.google.com/earth-engine/datasets/catalog/UCSB-CHC_CHIRPS_V3_DAILY_RNL

## Not verified
Exact GSMA BD numbers · Findex primary · national coffee area · project extension past Jun 2025 · licenses (Vosk bn, Dhan-Shomadhan, jute, beans/corn) · SAAO ratio year · any Chakma/Marma speech in Common Voice.
