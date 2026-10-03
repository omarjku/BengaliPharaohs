# Bangladesh crops × datasets — ranking and recommendation (Sat 3 Oct)

Sources: 5 parallel research agents. Most dataset pages (Mendeley, PMC, HF, Kaggle, arXiv) were blocked to them, so figures come from search-result snippets of the primary page. **Confirm every licence on download.** Detail for flood/drought and voice models: see `research-bangladesh.md`.

## 1. Crop importance (BBS / USDA / Census 2019, via snippets)
| Crop | Production | Holdings growing it |
|---|---|---|
| Boro rice | 21.3 MMT (FY25 record), 4.88 M ha | — (16.88 M farm holdings total) |
| Aman rice | 16.4 MMT (FY25) | — |
| Aus rice | 2.79 MMT (FY25) | — |
| Potato | 10.6 MMT | 3.23 M |
| Jute | 9.58 M bales | 5.62 M (check) |
| Maize | 4.88 MMT | 2.28 M |
| Mustard | 1.43 MMT | 2.77 M |
| Wheat | 1.17 MMT | 2.69 M |
| Mango | 2.5 MMT | 3.38 M |
| Lentil | 0.197 MMT (FY23), 135k ha | 1.53 M |

## 2. Bangladeshi FIELD image data per crop
| Crop | Best BD datasets | BD field originals | Licence | Verdict |
|---|---|---|---|---|
| **Rice** | RiceLeafDiseaseBD (Gazipur, 9,769, CC BY) · BanglaRiceLeaf (BRRI, 4,152) · BRRI Disease & Pest (2,753) · RiceLeafBD (Sylhet/Dhaka, 1,555) · SIP (Sirajganj–Pabna, 1,701, CC BY) · Dhan-Shomadhan field half (CC BY) | **~19–20k** | 3 of 6 CC BY; others unconfirmed (BanglaRiceLeaf may be NC) | **Best** |
| Chilli | tm3v4zmh7c + 2 more | ~8.8k+ | CC BY? | Good |
| Brinjal | n67gctmjyj + PMC12552563 + 6k94t3fydy | ~6k | CC BY | Good |
| Bean / cowpea | ykvcrjffzd (Chattogram) + 3km9d246z2 | ~4.5k–8k | CC BY | Good |
| Black gram | IDBGL (Sirajganj) | 4,038 | ? | Good |
| Potato | BD-PlantDX (Bogura/Nilphamari, Sep 2026) | ~4k est. | ? (download unconfirmed) | If downloadable |
| Maize | Seasonal Corn (Natore) | 2,943 (imbalanced, no fall armyworm) | ? | OK |
| Tomato | n67gctmjyj | 2,449 | CC BY | OK |
| Jute | Harvard Dataverse jute (8 districts) | 1,390 | ? | OK |
| Wheat | 5gc7hwydwg | ~900 leaf | ? | Thin |
| Lentil | 7vb77bz2st (Barisal; dates suspect; no Stemphylium) | unknown | ? | Weak |
| Mungbean | hgshn2zg3t | 135 | ? | Too thin |
| Grass pea, chickpea, field pea, onion, cabbage, groundnut, coconut | none | 0 | — | Gap |
Fruit (mango 4k, litchi 11k, jackfruit 8k, papaya 3.6k, guava 3.4k, banana 937, tea 13k) all have BD sets.

## 3. Key evidence for honesty / measurement
- BD rice classifiers: macro-F1 0.72 in-dataset → **0.44 on another BD dataset**; strong augmentation → 0.50 (arXiv 2609.31709; repo Dev100123/Cross-Dataset-Generalisation-of-Rice-Leaf-Disease-Classifiers).
- PlantVillage-trained MobileNetV2 ≈ 48% weighted F1 on PlantDoc field photos (CS231n 2025).
- → Our number: **leave-one-dataset-out accuracy**, plus how often "not sure" catches the errors.

## 4. Prior art (must differentiate; check the apps before the pitch)
Krishoker Janala (DAE, offline picture library, no ML) · BAMIS (DAE, weather/flood alerts, online) · Krishi Call Centre 16123 · BRRI Rice Doctor (symptom picker) · BRRI "Rice Solution" (may do AI images — unverified) · Dr.Chashi (claims offline Bangla AI) · Cropwise Grower BD (Plantix, offline) · Virginia Tech IPM app · KishiNet / AgroIntelli (GitHub TFLite).

## 5. What NO dataset covers (say it on stage)
Flood/submergence/drought stress images · brown planthopper hopperburn, stem borer, gall midge · false smut, neck blast · seedlings · Boro season (nearly all rice photos Jul–Dec) · BD nutrient deficiency · pulses other than black gram/beans.

## 6. Recommendation
**Rice** — largest crop and farmer base, ~20k BD field images, and it is the crop the 2024 floods destroyed (Aman). Product = (1) offline photo diagnosis, 7 classes: Healthy, Blast, Brown Spot, BLB, Sheath Blight, Tungro, Hispa/insect damage; (2) offline **after-flood / drought decision advisor** from BRRI rules (submergence days × growth stage × date → wait / re-plant short-duration variety (BRRI dhan75/87) by deadline (seedbed 31 Aug, transplant 15 Sep) / switch to tolerant variety (dhan51/52/79; drought 56/57/66/71/83)), outside the table → "not sure — call 16123 / SAAO"; Bangla voice (Zoha) for every card. Second crop only as a scalability slide (beans/black gram/maize have data).
