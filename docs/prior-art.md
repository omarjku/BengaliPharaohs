# Prior art and phone access (Sat 3 Oct night)

Confidence H/M/L. Play Store, RIMES, arXiv and FAO pages were blocked, so several items rest on search snippets. **Zoha: install BAMIS, BRRI Rice Solution and Dr.Chashi and check offline behaviour yourself before the pitch.**

## Competitors (ranked by threat)
| App | What it does | Offline? | Photo AI? | After-flood decisions? | Escalates "not sure"? | Source |
|---|---|---|---|---|---|---|
| **BAMIS app** (DAE/RIMES, relaunched 23 Jul 2025) | 10-day forecast, flood alerts/maps, crop advisories, AI disease detection (rice, potato, tomato), Bangla | Claims "offline access" — unverified for photo AI | Yes | Alerts, not post-flood decision rules (unverified) | Unverified | https://www.rimes.int/Bangladesh-launches-BAMIS-app (M) |
| BRRI Rice Solution | AI image diagnosis of rice pests/diseases, ~1k+ downloads | Unclear | Yes | No (unverified) | Unverified | https://www.onepharmaltd.com/press-release/brri-has-launched-rice-solution-app-made-by-national-agricare-group (M) |
| ধান সুরক্ষা (BRRI) | exists on Play | ? | ? | ? | ? | https://play.google.com/store/apps/details?id=com.brriapps (L) |
| Cropwise Grower BD (Syngenta + Plantix) | photo diagnosis (claims 93%), sells inputs | **Needs internet to diagnose** | Yes | No | No | https://asiafoodjournal.com/ai-enabled-farming-cropwise-grower-reach-asia/ · https://www.engineeringforchange.org/solutions/product/plantix/ (H) |
| Dr.Chashi | 25+ crops, Bangla voice assistant, **gives dosages**, ~15k users | Unknown | Yes | No | Unknown | https://www.drchashi.com/ (M) |
| Krishoker Janala (DAE) | offline picture library, 1,000+ problems / 120 crops | Yes | **No** (manual matching) | No | No | https://observerbd.com/details.php?id=61277 (H) |
| IRRI Rice Doctor | expert key, 90+ problems, for extension workers, 10k+ installs | — | No | No | — | https://www.irri.org/rice-doctor (M) |
| Rice Crop Manager | field-specific fertiliser advice | Needs connection (training) | No | No | — | https://www.cgiar.org/news-events/news/from-science-to-scale-how-rice-crop-manager-is-revolutionizing-farming-for-millions (M) |
| **Krishi Call Centre 16123** | human advisers, **08:00–20:00, closed Fri, Sat and govt holidays** | Needs a call | — | Yes (human) | is the human | https://ais.gov.bd/site/page/d9147061-2995-416f-b355-d7feb0d9f9a1/Krishi-call-centre-(16123) (H) |
| KrishokBondhu (research) | Bangla STT → Gemma-3-4B RAG → TTS phone line; 72.7% good answers | Needs server | No | — | — | https://arxiv.org/abs/2510.18355 (H) |
| iFarmer | finance/inputs, SMS advice, 310k farmers | — | No | No | — | https://afi-global.org/news/supporting-smallholder-farmers-through-technology-an-innovative-approach-from-bangladesh/ (M) |

**Our honest delta:** we are *not* first with rice photo AI in Bangla. We add (1) BRRI after-flood decision rules (wait / gap-fill / re-plant / too late) — none found elsewhere; (2) photo check that runs with **no connection** and **declines** low-confidence answers; (3) "not sure → SAAO" hand-off with store-and-forward — matters on Fri/Sat and evenings when 16123 is closed; (4) no dosages, no product sales. Name BAMIS on stage as the closest public tool and position as complementary.

## Phones and internet (for the persona)
- 69% of rural households own a smartphone (81% urban); 63% of men vs 53% of women own any mobile — BBS, Jul–Sep 2025 (H) https://www.newagebd.net/post/telecom/285700/562pc-of-households-now-internet-users-bbs
- Rural individual smartphone use 26%, rural mobile internet use 27% (GSMA 2024 data) (M) https://meatechwatch.com/2024/12/10/bangladesh-lags-behind-in-smartphone-ownership-and-mobile-internet-usage-gsma-report-shows/
- ~31.5% of agricultural workers own/use a smartphone (IWMI) (M) https://www.iwmi.cgiar.org/2023/12/minding-the-gender-gap-in-digital-innovations-in-bangladeshs-agri-economy/
- Entry Androids Tk 4,990–5,990 (e.g. Walton Primo E12, 1 GB RAM / 8 GB); up to Tk 12k → 2–4 GB RAM (M) https://www.pickaboo.com/blog/blog-smartphone-in-bangladesh/ · https://www.mobiledor.com/price-bdt-0-to-5000-tk/
- 4G "~95% population coverage", but BTRC tests (Jul 2025) found no 4G for Grameenphone in 58% of tested areas (M) https://www.dhakatribune.com/amp/bangladesh/393181/btrc-finds-gaps-in-4g-coverage-operators-fail-to
- Mobile data ≈ $0.23–0.34 per GB (M) https://statranker.org/digital-innovation/top-100-countries-by-price-of-1gb-mobile-data-usd-2025/
- Women ≈ 10–18% of rice/wheat labour; men do seedbed, land prep, spraying (M) https://pearl.plymouth.ac.uk/cgi/viewcontent.cgi?article=2065&context=gees-research

**Design consequence:** target a **1–2 GB RAM Android (Go)** phone; keep model ≤ ~5 MB; test on the cheapest/throttled device; household phone may be shared → PIN-free but consent before sharing.
