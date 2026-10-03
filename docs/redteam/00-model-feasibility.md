# Can we run a rice classifier on a phone? — measured, Sat 3 Oct

Measured in the cloud dev box (4 CPU cores, no GPU) with `scripts/bench_classifier.py`
(MobileNetV3-Small, 224×224, 7 classes, random weights — pretrained download was blocked there; speed and size are the same with real weights):

| What | Result |
|---|---|
| Frozen-backbone feature extraction | 214 img/s → **20k images in 1.6 min** |
| Full fine-tune | 71 img/s → **1 epoch of 20k in 4.7 min** (10 epochs ≈ 47 min) |
| TFLite model, weight-quantised | **1.13 MB** |
| One image on CPU (TFLite) | **4 ms** (phones: tens of ms; TF.js MobileNet on Pixel 4 ≈ 76–182 ms per published benchmark) |

Conclusion: training our own small model is **not** the hard part (an M-series Mac is faster than this box). The hard parts are downloading/cleaning the 6 datasets, removing near-duplicates, the leave-one-dataset-out evaluation, and calibrating the "not sure" threshold.
