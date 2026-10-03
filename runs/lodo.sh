#!/bin/zsh
# Leave-one-dataset-out: frozen model trained without each source, tested on it.
export PYTORCH_ENABLE_MPS_FALLBACK=1
for s in BanglaRiceLeaf DhanShomadhan RiceLeafDiseaseBD SIP; do
  ../.venv-ml/bin/python train.py --manifest ../data/manifest.csv --mode frozen --epochs 4 --holdout "$s" --workers 6 --out "../runs/lodo_$s"
done
echo LODO-DONE
