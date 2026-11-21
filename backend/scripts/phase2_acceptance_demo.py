"""
Phase 2 acceptance workflow, run against a RUNNING server (demo or STAGING).

    python demo_server.py                                       # terminal 1
    python -m scripts.phase2_acceptance_demo                     # terminal 2

    # against staging (seeded by scripts/seed_staging.py):
    python -m scripts.phase2_acceptance_demo --base-url https://<staging>.hf.space --password '<SEED_PASSWORD>'

It performs a controlled login -> prediction -> denied-access workflow with the
synthetic accounts, then reads the resulting security events through the
admin-only API and checks that they are correlated and contain no sensitive data.
NEVER point it at production (it creates test prescriptions and logins).
"""
import argparse
import base64
import json
import sys

import httpx

PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
)
DOMAIN = "synthetic.medicheck.dev"
DIABETES = {"age": 40, "bmi": 25, "hypertension": 0, "heart_disease": 0, "smoking_history": 0,
            "HbA1c_level": 5, "blood_glucose_level": 100, "gender": 1}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-url", default="http://127.0.0.1:8000")
    ap.add_argument("--password", default="Demo-Password-123")
    a = ap.parse_args()
    c = httpx.Client(base_url=a.base_url.rstrip("/"), timeout=30)
    checks: list[tuple[str, bool]] = []

    def login(who: str) -> tuple[dict, dict]:
        r = c.post("/login", json={"email": f"{who}@{DOMAIN}", "password": a.password})
        if r.status_code != 200:
            sys.exit(f"login as {who} failed ({r.status_code}): {r.text[:150]} -> check --password / seeding")
        return {"Authorization": "Bearer " + r.json()["access_token"]}, {"rid": r.headers["X-Request-ID"], "token": r.json()["access_token"]}

    print("1) login patient2 and upload a prescription (the 'victim')")
    p2, _ = login("patient2")
    branch = c.get("/api/branches/public").json()[0]["branch_id"]
    up = c.post("/api/prescriptions", headers=p2, data={"branch_id": branch}, files={"file": ("rx.png", PNG, "image/png")})
    if up.status_code != 201:
        sys.exit(f"upload failed {up.status_code}: {up.text[:150]}")
    rx = up.json()["prescription_id"]

    print("2) login patient1 -> prediction -> try to read patient2's prescription")
    p1, info = login("patient1")
    r_login_rid = info["rid"]
    r_pred = c.post("/predict-diabetes", headers=p1, json=DIABETES)
    r_denied = c.get(f"/api/prescriptions/{rx}", headers=p1)
    print(f"   login=200  predict={r_pred.status_code}  read-other-prescription={r_denied.status_code}")

    print("3) read the events as admin")
    admin, _ = login("admin")

    def events_of(rid: str) -> list[dict]:
        return c.get("/api/security/events", params={"request_id": rid, "limit": 50}, headers=admin).json()

    chain = []
    for label, rid in [("login", r_login_rid), ("predict", r_pred.headers["X-Request-ID"]), ("denied", r_denied.headers["X-Request-ID"])]:
        evs = sorted(events_of(rid), key=lambda e: e["seq"])
        chain.append((label, evs))
        print(f"\n   --- {label}  request_id={rid}")
        for e in evs:
            print(f"   seq{e['seq']} {e['event_type']:<28} status={e['status_code']} actor={str(e['actor_id'])[-6:]} "
                  f"session={str(e['session_id'])[-6:]} rule={e['rule_id']} relation={e['target_relation']} {e['details'] or ''}")

    allev = [e for _, evs in chain for e in evs]
    checks.append(("each request has exactly one middleware record", all(sum(1 for e in evs if e["source"] == "middleware") == 1 for _, evs in chain)))
    checks.append(("login, prediction and denied access share ONE actor", len({e["actor_id"] for e in allev}) == 1 and None not in {e["actor_id"] for e in allev}))
    checks.append(("...and ONE session", len({e["session_id"] for e in allev}) == 1 and None not in {e["session_id"] for e in allev}))
    denied = [e for e in chain[2][1] if e["event_type"] == "prescription.read.denied"]
    checks.append(("denied access recorded with rule RX-01 / other_patient", bool(denied) and denied[0]["rule_id"] == "RX-01" and denied[0]["target_relation"] == "other_patient"))
    checks.append(("prediction recorded as inference.completed", any(e["event_type"] == "inference.completed" for e in chain[1][1])))
    checks.append(("every stored signature is valid", all(e["sig_valid"] for e in allev)))
    blob = json.dumps(allev)
    secrets = [a.password, info["token"][:30], f"patient1@{DOMAIN}", f"patient2@{DOMAIN}", rx, "HbA1c", "7.0"]
    checks.append(("no password / token / e-mail / prescription id / medical field in the events", not any(s in blob for s in secrets)))

    print("\n=== RESULT ===")
    for name, ok in checks:
        print(("PASS  " if ok else "FAIL  ") + name)
    return 0 if all(ok for _, ok in checks) else 1


if __name__ == "__main__":
    sys.exit(main())
