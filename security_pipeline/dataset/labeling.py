"""
Ground-truth labelling.

Labels come ONLY from the scenario runner's ground truth, joined to events by the
server-generated request id. They are never derived from status codes, event fields or
model output, and no label exists inside any event.
"""
from __future__ import annotations

import hashlib

from .. import common as C


def load_events(batch: str):
    """Parse the frozen events, verify checksum + every signature. Returns (events, n_invalid_signature, n_duplicate_ids)."""
    C.setup_signing_env()
    from security.event_schema import json_line_to_document, verify_document

    path = C.batch_dir(batch) / "events.jsonl"
    recorded = (C.batch_dir(batch) / "events.sha256").read_text().strip()
    if hashlib.sha256(path.read_bytes()).hexdigest() != recorded:
        raise SystemExit(f"{path} does not match events.sha256: the frozen export was modified")

    events, invalid, seen, dups = [], 0, set(), 0
    for line in open(path, encoding="utf-8"):
        if not line.strip():
            continue
        doc = json_line_to_document(line)
        if not verify_document(doc):
            invalid += 1
            continue
        if doc["event_id"] in seen:
            dups += 1
            continue
        seen.add(doc["event_id"])
        doc["ts"] = doc["timestamp"].timestamp()
        events.append(doc)
    events.sort(key=lambda e: (e["ts"], e["request_id"], e["seq"]))
    return events, invalid, dups


def load_ground_truth(batch: str):
    bd = C.batch_dir(batch)
    runs = {r["run_id"]: r for r in C.read_jsonl(bd / "runs.jsonl")}
    reqs = {r["request_id"]: r for r in C.read_jsonl(bd / "ground_truth.jsonl") if r["request_id"]}
    return runs, reqs


def attach_labels(events: list, reqs: dict):
    """Adds label_class / family / run_id / probe / violation_succeeded. Returns the events that have NO ground truth."""
    unlabeled = []
    for e in events:
        g = reqs.get(e["request_id"])
        if g is None:
            unlabeled.append(e)
            e.update(label_class=None, family=None, run_id=None, probe=False, violation_succeeded=False)
            continue
        e.update(label_class=g["label"], family=g["family"], run_id=g["run_id"], probe=g["probe"],
                 violation_succeeded=g["violation_succeeded"])
    return unlabeled
