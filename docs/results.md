# Model results (honest numbers for the pitch and README)

Model: MobileNetV3-Small (ImageNet-pretrained), 224×224 input, ONNX fp32 **6.1 MB** (int8 rejected: agreed with fp32 on only ~21% of photos).
Data: `docs/data.md`. Test = **AgML_BD, a Bangladeshi dataset never seen in training** (549 images; blast, blb, brown_spot, healthy).
"Answers" = the app shows a diagnosis; otherwise it says NOT SURE → ask the SAAO. Thresholds are fitted on validation, never on the test set.

## v1 — frozen backbone, 6 classes (shipped 2026-10-04 ~00:40)
| Metric | Validation (same sources, unseen leaf clusters) | Held-out dataset (AgML_BD) |
|---|---|---|
| Macro-F1 | 0.795 | **0.353** |
| Answers (coverage) | 69.5% | 63% |
| Accuracy when it answers | 90.5% | **64.5%** |
| Calibration error (ECE) | 0.055 → 0.022 after temperature scaling | — |
| Bean leaves (never seen) → NOT SURE | — | 66.7% ❌ (fixed in v2 with a not_rice class) |

Held-out confusion (rows = truth): healthy 110/110 · blast 91/133 · brown_spot 57/190 (often called blast) · blb 29/116 (often called healthy — 87% of BLB training images come from one dataset).
Reading: big drop from validation to a new dataset = the "lab vs field" gap (literature: 0.72 → 0.44 macro-F1, arXiv 2609.31709). This is why the app never answers below 60% confidence and asks for context.

## v2 — fine-tuned, 7 classes incl. not_rice (shipped 2026-10-04 ~01:40) ✅ current
Full fine-tune, 12 epochs, strong augmentation, balanced sampling, cap 1,500 per (source, class). Best epoch by validation macro-F1.
Threshold rule (chosen on validation, never on test): answer only if validation accuracy-when-answering ≥ 95% → **min_prob 0.80**, temperature 0.85.

| Metric | v1 frozen | **v2 fine-tuned** |
|---|---|---|
| Validation macro-F1 | 0.795 | **0.912** |
| Validation: answers / right when answering | 69.5% / 90.5% | 76.5% / **95.1%** |
| Held-out dataset (AgML_BD): overall top-1 accuracy | 52.3% | **57.2%** |
| Held-out: answers / right when answering | 63% / 64.5% | 63.4% / **74.4%** |
| Bean leaves (never seen) → NOT SURE | 66.7% | **100%** (60/60) |
| Calibration error after temperature scaling | 0.022 | 0.015 |

Held-out confusion (rows = truth, cols = healthy, blast, brown_spot, sheath_blight, tungro, blb, not_rice):
healthy [103, 0, 0, 7, 0, 0, 0] · blast [7, 81, 11, 21, 8, 3, 2] · brown_spot [11, 41, 106, 5, 14, 2, 11] · blb [29, 15, 9, 19, 20, 24, 0].
Weakest: **bacterial leaf blight** (24/116) — 87% of BLB training images come from one dataset (BanglaRiceLeaf), so the model partly learned that camera. Most-confused pair: brown spot → blast.
(Held-out macro-F1 0.342 vs 0.353 is not comparable: v2's average also includes not_rice and the classes absent from the test set.)

**Pitch line:** "On a Bangladeshi dataset our model never saw, when it answers it's right 3 times out of 4 — and for the other cases, and for anything that isn't a rice leaf, it says *not sure, ask your SAAO*. On the data it was trained on it reaches 95%; the gap is exactly why the app asks for context and never shows certainty."
