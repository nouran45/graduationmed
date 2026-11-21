"""
Leakage-safe splits.

* The unit of splitting is the RUN (one scenario instance = its own accounts, its own source IP,
  all its sessions). Rows, sessions or requests of one run are never separated.
* Attack families in HELD_OUT_FAMILIES go ONLY to `test_unseen` (never used for training,
  threshold selection or model selection).
* Other families are split 60/20/20, stratified per family.
* Batches run with a staging fault are an evaluation set: split `eval_fault`.
"""
from __future__ import annotations

import random
from collections import defaultdict

from .. import common as C


def assign_splits(runs: dict, seed: int, evaluation: bool = False) -> dict:
    if evaluation:
        return {rid: "eval_fault" for rid in runs}
    rng = random.Random(seed)
    by_family = defaultdict(list)
    for rid, r in sorted(runs.items()):
        by_family[r["family"]].append(rid)
    out = {}
    for fam, rids in by_family.items():
        if fam in C.HELD_OUT_FAMILIES:
            out.update({rid: "test_unseen" for rid in rids})
            continue
        rng.shuffle(rids)
        n = len(rids)
        n_train, n_val = round(C.SPLIT_RATIOS[0] * n), round(C.SPLIT_RATIOS[1] * n)
        if n >= 3:
            n_train, n_val = min(max(n_train, 1), n - 2), max(n_val, 1)
            n_val = min(n_val, n - n_train - 1)
        else:
            n_train, n_val = n, 0
        for i, rid in enumerate(rids):
            out[rid] = "train" if i < n_train else "val" if i < n_train + n_val else "test"
    return out
