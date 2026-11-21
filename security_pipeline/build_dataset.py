"""
Build a versioned, validated dataset from frozen batches.

    python -m security_pipeline.build_dataset --version v0.1-pilot --batches pilot
    python -m security_pipeline.build_dataset --version v1.0 --batches main --eval-batches faults

Outputs (datasets/<version>/ and, for fault batches, datasets/<version>/eval_faults/):
  events_labeled.jsonl   every event with its ground-truth label
  sessions.jsonl         derived sessions
  xgb_features.csv       one row per request (columns: f_* pre-response, cur_* post-response, labels)
  gru_sequences.jsonl    one sequence per session
  vocab.json  split_manifest.json  validation_report.json  manifest.json (checksums, seeds, rules)
"""
from __future__ import annotations

import argparse
import csv
import json
import time

from . import common as C
from .dataset import labeling, splitting, validation
from .preprocessing import gru_sequences, session_builder, xgboost_features


def auc(pos: list, neg: list) -> float:
    """Rank-based AUC (Mann-Whitney) for one feature."""
    if not pos or not neg:
        return float("nan")
    allv = sorted([(v, 1) for v in pos] + [(v, 0) for v in neg])
    ranks, i = [0.0] * len(allv), 0
    while i < len(allv):
        j = i
        while j + 1 < len(allv) and allv[j + 1][0] == allv[i][0]:
            j += 1
        for k in range(i, j + 1):
            ranks[k] = (i + j) / 2 + 1
        i = j + 1
    rank_pos = sum(r for r, (_, y) in zip(ranks, allv) if y == 1)
    return (rank_pos - len(pos) * (len(pos) + 1) / 2) / (len(pos) * len(neg))


def load_batches(batches: list, seed: int, evaluation: bool):
    events, runs, reqs, inv, dup = [], {}, {}, 0, 0
    unlabeled = []
    for b in batches:
        ev, i, d = labeling.load_events(b)
        r, q = labeling.load_ground_truth(b)
        unlabeled += labeling.attach_labels(ev, q)
        events += ev; runs.update(r); reqs.update(q); inv += i; dup += d
    events.sort(key=lambda e: (e["ts"], e["request_id"], e["seq"]))
    splits = splitting.assign_splits(runs, seed, evaluation)
    return events, runs, reqs, splits, unlabeled, inv, dup


def write_outputs(out, events, runs, reqs, splits, unlabeled, inv, dup, evaluation, versions_meta):
    out.mkdir(parents=True, exist_ok=True)
    report = validation.validate(events, unlabeled, inv, dup, runs, reqs, splits, evaluation)
    (out / "validation_report.json").write_text(json.dumps(report, indent=1))
    if report["fatal"]:
        print("\nFATAL validation problems:")
        for f in report["fatal"]:
            print("  x", f)
        raise SystemExit(2)

    sessions = session_builder.build_sessions(events, splits)
    rows = xgboost_features.build_rows(events, splits)
    vocab = gru_sequences.build_vocab()
    seqs = gru_sequences.build_sequences(events, sessions, vocab)

    for e in events:                                                  # serialisable copy
        e["timestamp"] = e["timestamp"].strftime("%Y-%m-%dT%H:%M:%S.") + f"{e['timestamp'].microsecond // 1000:03d}Z"
    files = {
        "events_labeled.jsonl": C.write_jsonl(out / "events_labeled.jsonl", ({k: v for k, v in e.items() if k != "ts"} for e in events)),
        "sessions.jsonl": C.write_jsonl(out / "sessions.jsonl", sessions),
        "gru_sequences.jsonl": C.write_jsonl(out / "gru_sequences.jsonl", seqs),
    }
    cols = list(rows[0])
    with open(out / "xgb_features.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=cols)
        w.writeheader()
        w.writerows(rows)
    files["xgb_features.csv"] = len(rows)
    (out / "vocab.json").write_text(json.dumps(vocab, indent=1))
    (out / "split_manifest.json").write_text(json.dumps(splits, indent=1, sort_keys=True))

    # single-feature AUC probe on training data: a feature that separates attack from normal almost perfectly
    # on its own deserves a look (it may be a generator artefact rather than behaviour)
    probe = []
    train = [r for r in rows if r["split"] in ("train", "val")]
    for c in [c for c in cols if c.startswith("f_")]:
        a = auc([r[c] for r in train if r["label_binary"] == 1], [r[c] for r in train if r["label_binary"] == 0])
        if a == a:
            probe.append((max(a, 1 - a), c))
    probe.sort(reverse=True)
    report["single_feature_auc_top8"] = [{"feature": c, "auc": round(a, 3)} for a, c in probe[:8]]
    (out / "validation_report.json").write_text(json.dumps(report, indent=1))

    manifest = {
        **versions_meta, "built_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "evaluation_set": evaluation,
        "classes": C.CLASSES, "held_out_families": sorted(C.HELD_OUT_FAMILIES), "split_ratios": C.SPLIT_RATIOS,
        "anonymous_session_gap_s": session_builder.ANON_GAP_SECONDS,
        "feature_columns": [c for c in cols if c.startswith("f_")], "post_response_columns": [c for c in cols if c.startswith("cur_")],
        "label_columns": ["label_class", "label_binary", "family", "run_id", "split", "violation_succeeded", "request_id", "session_key", "timestamp"],
        "rows": files, "files": {p.name: C.sha256_file(p) for p in sorted(out.iterdir()) if p.is_file() and p.name != "manifest.json"},
    }
    (out / "manifest.json").write_text(json.dumps(manifest, indent=1))
    return report, rows, sessions


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--version", required=True)
    ap.add_argument("--batches", nargs="+", required=True)
    ap.add_argument("--eval-batches", nargs="*", default=[])
    ap.add_argument("--seed", type=int, default=42)
    a = ap.parse_args()
    C.setup_signing_env()

    for b in a.batches + a.eval_batches:
        d = C.batch_dir(b)
        for need in ("run_meta.json", "events.jsonl", "events.sha256", "ground_truth.jsonl", "runs.jsonl"):
            if not (d / need).exists():
                raise SystemExit(f"batch {b!r} is incomplete: {need} is missing. "
                                 f"(runner finished? events exported while the server was still running?) "
                                 f"An interrupted batch cannot be repaired: run it again under a NEW batch name.")
    meta = {"version": a.version, "batches": a.batches, "seed": a.seed, "schema_version": "1.0"}
    for b in a.batches:
        meta[f"run_meta_{b}"] = json.loads((C.batch_dir(b) / "run_meta.json").read_text())
    root = C.DATA / a.version

    report, rows, sessions = write_outputs(root, *load_batches(a.batches, a.seed, False), False, meta)
    print(f"\n== {a.version}: {report['events']} events, {report['requests']} requests, {report['runs']} runs, {len(sessions)} sessions")
    print("events by class  :", report["events_by_class"])
    print("requests by class:", report["requests_by_class"])
    print("runs by split    :", report["runs_by_split"])
    for w in report["warnings"]:
        print("  warning:", w)
    print("top single-feature AUCs (check for generator artefacts):", json.load(open(root / "validation_report.json"))["single_feature_auc_top8"])

    for b in a.eval_batches:
        emeta = {**meta, "batches": [b], f"run_meta_{b}": json.loads((C.batch_dir(b) / "run_meta.json").read_text())}
        er, erows, _ = write_outputs(root / "eval_faults", *load_batches([b], a.seed, True), True, emeta)
        print(f"\n== evaluation set {b}: {er['events']} events, successful violations: {er['successful_violations']}")
    print(f"\nwritten to {root}")


if __name__ == "__main__":
    main()
