"""
Event sequences per session for the GRU.

The vocabulary is the CLOSED event-type registry of the backend (not learned from data), so it can
never leak information from the test split. One step = one security event.
  tokens   event_type id          (0 = PAD, 1 = UNK)
  outcomes outcome id             (none / success / failure / denied / rejected / blocked / error)
  status   HTTP status class      (0 none, 2, 3, 4, 5)
  dts      seconds since the previous event of the session (0 for the first)
  step_labels  class index of each step (CLASSES order), for detection-delay analysis
Train the GRU on `split == train` AND `label_class == normal` sessions only.
"""
from __future__ import annotations

from collections import defaultdict

from .. import common as C

OUTCOMES = ["none", "success", "failure", "denied", "rejected", "blocked", "error"]


def build_vocab() -> dict:
    C.setup_signing_env()
    from security.event_schema import EVENT_TYPES
    return {"pad": 0, "unk": 1, "tokens": {t: i + 2 for i, t in enumerate(sorted(EVENT_TYPES))},
            "outcomes": OUTCOMES, "classes": C.CLASSES}


def build_sequences(events: list, sessions: list, vocab: dict) -> list:
    by_key = defaultdict(list)
    for e in events:
        by_key[e["session_key"]].append(e)
    out = []
    for s in sessions:
        evs = by_key[s["session_key"]]
        prev, tokens, outs, status, dts, steps = None, [], [], [], [], []
        for e in evs:
            tokens.append(vocab["tokens"].get(e["event_type"], vocab["unk"]))
            outs.append(OUTCOMES.index(e["outcome"]) if e.get("outcome") in OUTCOMES else 0)
            status.append((e["status_code"] or 0) // 100)
            dts.append(round(e["ts"] - prev, 3) if prev is not None else 0.0)
            steps.append(C.CLASSES.index(e["label_class"]))
            prev = e["ts"]
        out.append({"session_key": s["session_key"], "split": s["split"], "label_class": s["label_class"],
                    "family": s["family"], "length": len(tokens), "tokens": tokens, "outcomes": outs,
                    "status": status, "dts": dts, "step_labels": steps})
    return out
