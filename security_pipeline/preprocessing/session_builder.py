"""
Session grouping.

* Authenticated traffic            -> the server-side session (`session_id`, a pseudonym)
* Anonymous traffic (failed logins, scans, forged tokens) -> one session per source address
  (`ip_hash`), split into a new session after 30 minutes of silence.
The rules are part of the dataset version (see manifest). Events must be sorted by (ts, request_id, seq).
"""
from __future__ import annotations

from collections import defaultdict

from .. import common as C

ANON_GAP_SECONDS = 1800


def build_sessions(events: list, splits: dict) -> list:
    last: dict = {}
    for e in events:
        if e.get("session_id"):
            e["session_key"] = e["session_id"]
            continue
        h = e.get("ip_hash") or "none"
        ts, n = last.get(h, (None, 0))
        if ts is not None and e["ts"] - ts > ANON_GAP_SECONDS:
            n += 1
        last[h] = (e["ts"], n)
        e["session_key"] = f"anon:{h}:{n}"

    groups = defaultdict(list)
    for e in events:
        groups[e["session_key"]].append(e)

    sessions = []
    for key, evs in groups.items():
        labelled = [e for e in evs if e["label_class"]]
        worst = max(labelled, key=lambda e: C.SEVERITY[e["label_class"]]) if labelled else evs[0]
        run_ids = sorted({e["run_id"] for e in labelled})
        split_set = {splits.get(r) for r in run_ids}
        sessions.append({
            "session_key": key, "anonymous": key.startswith("anon:"),
            "n_events": len(evs), "n_requests": sum(1 for e in evs if e["seq"] == 0 and e["source"] == "middleware"),
            "t_start": evs[0]["ts"], "t_end": evs[-1]["ts"], "run_ids": run_ids,
            "n_source_addresses": len({e.get("ip_hash") for e in evs}),
            "label_class": worst["label_class"], "family": worst["family"],
            "split": split_set.pop() if len(split_set) == 1 else "mixed",
        })
    sessions.sort(key=lambda s: s["t_start"])
    return sessions
