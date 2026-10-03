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

## v2 — fine-tuned, 7 classes incl. not_rice
_(training)_
