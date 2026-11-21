"""Dataset validation. `fatal` problems stop the build; `warnings` are reported."""
from __future__ import annotations

from collections import Counter, defaultdict


def validate(events, unlabeled, invalid_sig, dup_ids, runs, reqs, splits, evaluation):
    fatal, warn = [], []
    by_req = defaultdict(list)
    for e in events:
        by_req[e["request_id"]].append(e)

    if invalid_sig:
        fatal.append(f"{invalid_sig} events have an INVALID signature (tampered or wrong signing key)")
    if dup_ids:
        fatal.append(f"{dup_ids} duplicate event_id rows")
    if unlabeled:
        fatal.append(f"{len(unlabeled)} events have no ground truth (e.g. request {unlabeled[0]['request_id']})")

    orphan_runs = {r["run_id"] for r in reqs.values()} - set(runs)
    if orphan_runs:
        fatal.append(f"{len(orphan_runs)} runs have requests but no completion record (the runner was interrupted)")

    missing = [rid for rid in reqs if rid not in by_req]
    if missing:
        (fatal if len(missing) > 0.001 * max(len(reqs), 1) else warn).append(
            f"{len(missing)}/{len(reqs)} ground-truth requests have no events (e.g. {missing[:2]})")
    bad_seq0 = [rid for rid in reqs if rid in by_req and sum(1 for e in by_req[rid] if e["seq"] == 0 and e["source"] == "middleware") != 1]
    if bad_seq0:
        fatal.append(f"{len(bad_seq0)} requests without exactly one request record (seq 0)")

    succeeded = sum(1 for r in reqs.values() if r["violation_succeeded"])
    if evaluation and not succeeded:
        fatal.append("fault batch contains NO successful violation: the fault did not take effect")
    if not evaluation and succeeded:
        fatal.append(f"{succeeded} authorization violations SUCCEEDED in a standard batch: the application has a hole (or a fault was active)")

    scales = {r.get("time_scale") for r in runs.values()}
    if scales != {1.0}:
        warn.append(f"time_scale {sorted(s for s in scales if s is not None)} != 1.0: timing features are NOT realistic (fine for a pilot, not for the final dataset)")
    failed = [r["run_id"] for r in runs.values() if r.get("error")]
    if failed:
        warn.append(f"{len(failed)} runs ended with an error (partial traffic): {failed[:3]}")

    # no source address may appear in more than one split (grouping by run must hold)
    ips = defaultdict(set)
    for e in events:
        if e["run_id"] and e.get("ip_hash"):
            ips[e["ip_hash"]].add(splits.get(e["run_id"]))
    shared = [h for h, s in ips.items() if len(s) > 1]
    if shared:
        fatal.append(f"{len(shared)} source addresses appear in more than one split")

    return {
        "fatal": fatal, "warnings": warn,
        "events": len(events), "requests": len(reqs), "runs": len(runs),
        "events_by_class": dict(Counter(e["label_class"] for e in events if e["label_class"])),
        "requests_by_class": dict(Counter(r["label"] for r in reqs.values())),
        "runs_by_family": dict(Counter(r["family"] for r in runs.values())),
        "runs_by_split": dict(Counter(splits.values())),
        "successful_violations": succeeded,
    }
