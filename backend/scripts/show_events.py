"""
View / verify / export security events straight from MongoDB (staging or production).

    python -m scripts.show_events --last 30
    python -m scripts.show_events --request-id req_abc123
    python -m scripts.show_events --type auth.login.failure --last 100
    python -m scripts.show_events --verify                      # re-check every signature
    python -m scripts.show_events --jsonl events.jsonl --last 5000   # export (Phase 3 will use this)

Needs MONGO_URI, SECRET_KEY (and optionally SECURITY_DB_NAME) in the environment.
The signature key is derived from SECRET_KEY (or EVENT_SIGNING_KEY): use the SAME values as the server.
"""
import argparse
import json

from database import security_events_collection
from security.event_schema import iso, verify_document


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--last", type=int, default=30)
    ap.add_argument("--request-id")
    ap.add_argument("--type")
    ap.add_argument("--actor")
    ap.add_argument("--verify", action="store_true")
    ap.add_argument("--jsonl")
    a = ap.parse_args()

    query = {k: v for k, v in {"request_id": a.request_id, "event_type": a.type, "actor_id": a.actor}.items() if v}
    docs = list(security_events_collection.find(query).sort([("timestamp", -1), ("seq", -1)]).limit(a.last))
    docs.reverse()

    if a.verify:
        bad = [d["event_id"] for d in docs if not verify_document(d)]
        print(f"checked {len(docs)} events: {len(bad)} with an INVALID signature")
        for b in bad[:20]:
            print("  tampered/forged:", b)

    if a.jsonl:
        with open(a.jsonl, "w", encoding="utf-8") as fh:
            for d in docs:
                d = {k: v for k, v in d.items() if k != "_id"}
                d["timestamp"] = iso(d["timestamp"])
                fh.write(json.dumps(d, sort_keys=True) + "\n")
        print(f"wrote {len(docs)} events to {a.jsonl}")
        return

    for d in docs:
        print(f"{iso(d['timestamp'])} {d['request_id'][-8:]} s{d['seq']} {d['event_type']:<30} {d['method']:<6} "
              f"{d['endpoint_template']:<38} {d['status_code']} {d['actor_role']:<9} "
              f"rule={d.get('rule_id')} rel={d.get('target_relation')} {d.get('details') or ''}")


if __name__ == "__main__":
    main()
