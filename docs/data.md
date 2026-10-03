# Datasets used (scored by the judges: name, source, licence, size, what it does NOT cover)

Licences read from each repository's API on 2026-10-04. Images shrunk to 512 px on download (`ml/fetch_data.py`, `ml/unpack_zip.py`), then 256 px + near-duplicate grouping (`ml/prepare.py`). Augmented/studio copies are excluded.

| Source (folder) | Dataset | URL | Licence | Kept / downloaded | Classes kept | Collected | Role |
|---|---|---|---|---|---|---|---|
| RiceLeafDiseaseBD | RiceLeafDiseaseBD — field smartphone images (`Original images/` only) | https://data.mendeley.com/datasets/86s4jzj2m4/3 | CC BY 4.0 | 9,045 / 9,771 | healthy 1575, blast 1326, brown_spot 2178, sheath_blight 1722, tungro 2244 | Bangladesh field, smartphone | train/val |
| BanglaRiceLeaf | BanglaRiceLeaf (Data in Brief 2026) | https://doi.org/10.7910/DVN/XAOBYW | **CC0 1.0** | 3,097 / 4,152 | blast 1086, blb 1093, healthy 500, sheath_blight 418 | BRRI Gazipur fields, iPhone | train/val |
| SIP | Rice Leaf Bacterial and Fungal Disease Dataset (`Original` only) | https://data.mendeley.com/datasets/hx6f852hw4/2 | CC BY 4.0 | 1,180 / 1,701 | blast 305, blb 180, brown_spot 267, healthy 157, sheath_blight 271 | Sirajganj–Pabna | train/val |
| DhanShomadhan | Dhan-Shomadhan (field-background half only) | https://data.mendeley.com/datasets/znsxdctwtt/1 | CC BY 4.0 | 263 / 337 | blast 74, brown_spot 49, sheath_blight 64, tungro 76 | Bangladesh field | train/val |
| AgML_BD | Project-AgML rice_leaf_disease_classification_bd | https://huggingface.co/datasets/Project-AgML/rice_leaf_disease_classification_bd | CC BY 4.0 | 549 / 773 | blast 133, blb 116, brown_spot 190, healthy 110 | Bangladesh field, iPhone 12 | **held-out test only** |
| NotRice | Bangladeshi non-rice leaves: chilli 400 (tm3v4zmh7c), banana 182 (9tb7k297ff), bean/cowpea 138 (ykvcrjffzd), lemon 22 (smz8ffbthy), jackfruit 5 (6d4y69dv9x) — `ml/fetch_notrice.py` | https://data.mendeley.com/datasets/<id> | CC BY 4.0 (all five) | 747 | not_rice | Bangladesh | train/val: teaches "this is not a rice leaf" → app says NOT SURE |
| nonrice/beans | iBean (bean leaves, Uganda) — 60 test images | https://huggingface.co/datasets/AI-Lab-Makerere/beans | MIT | 60 | — | Uganda field | "not rice" → must say *not sure* |

Totals: **14,881 images** incl. 747 not_rice (rice: **14,134**) (13,585 train/val + 549 held-out), 11,832 unique after grouping 2,302 near-duplicates.
Dropped on purpose: bacterial leaf streak, leaf smut, leaf scald, narrow brown spot, hispa (not in our classes / too few images).

## Known biases (say them)
- **Tungro: 97% from one dataset** (RiceLeafDiseaseBD) and **BLB: 87% from one dataset** (BanglaRiceLeaf) → the model may learn the camera, not the disease. Measured by leave-one-dataset-out (`docs/results.md`).
- Held-out set has no sheath_blight or tungro images, so those two are only tested on validation clusters.

## What this data does NOT cover
Flood/submergence/drought-stress photos · brown planthopper hopperburn · stem borer · false smut, neck/panicle blast · seedlings · Boro season (photos mostly Jul–Dec) · nutrient deficiencies · hispa, leaf scald · whole-plant or field photos · districts outside Gazipur, Sirajganj–Pabna and the collection sites · cheap low-resolution phone cameras.
