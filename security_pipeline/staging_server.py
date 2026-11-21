"""
Staging launcher: the REAL FastAPI app + fast mock models + a synthetic population.

    python -m security_pipeline.staging_server --batch pilot --db embedded          # no MongoDB needed
    python -m security_pipeline.staging_server --batch pilot --db mongo             # local mongod on :27017
    python -m security_pipeline.staging_server --batch pilot --db mongo --reset     # wipe that batch and start over
    python -m security_pipeline.staging_server --batch faults --db embedded --fault rx_read_idor,branch_hop,admin_bypass

Real: authentication, sessions, authorization, rate limits, validation, security logging, signatures.
Mocked: ONLY utils.predict* (constant-time, fixed answers, optional random 500s) - see --mock-fail-rate.
Binds to 127.0.0.1 only. Refuses to run unless this is clearly a staging setup.
"""
from __future__ import annotations

import argparse
import json
import os
import random
import sys
import types

from . import common as C


LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1", "[::1]"}


def _check_mongo_batch(a) -> None:
    """Real MongoDB keeps data between runs (embedded mode never did). Guard against the two ways that goes wrong."""
    import shutil
    from urllib.parse import urlsplit

    import pymongo

    host = (urlsplit(a.mongo_uri).hostname or "").lower()
    if not a.mongo_uri.startswith("mongodb://") or host not in LOCAL_HOSTS:
        raise SystemExit(
            f"refusing --mongo-uri {a.mongo_uri!r}: staging traffic (including attacks) must go to a LOCAL "
            "MongoDB only (mongodb://localhost:27017), never Atlas or a shared server.")

    client = pymongo.MongoClient(a.mongo_uri, serverSelectionTimeoutMS=4000)
    try:
        client.admin.command("ping")
    except Exception as exc:  # noqa: BLE001
        raise SystemExit(f"cannot reach MongoDB at {a.mongo_uri}: {exc.__class__.__name__}. "
                         "Is mongod running? (sudo systemctl start mongod)")

    names = [f"medicheck_staging_{a.batch}", f"medicheck_security_staging_{a.batch}"]
    raw = C.DATA / "raw" / a.batch
    if a.reset:
        for n in names:
            client.drop_database(n)
        if raw.exists():
            shutil.rmtree(raw)
        print(f"reset: dropped {names[0]}, {names[1]} and removed {raw}")
        return

    has_data = any(client[n].list_collection_names() for n in names)
    if has_data and not (raw / "population.json").exists():
        raise SystemExit(
            f"MongoDB already holds data for batch '{a.batch}' from an earlier attempt, but {raw} is gone.\n"
            f"Use a NEW batch name, or start over with --reset (deletes that batch's data).")
    if has_data:
        print(f"note: batch '{a.batch}' already exists in MongoDB; reusing it (export works, the runner will "
              "refuse to add traffic to a finished batch).")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--batch", required=True)
    ap.add_argument("--port", type=int, default=8000)
    ap.add_argument("--db", choices=["embedded", "mongo"], default="embedded")
    ap.add_argument("--mongo-uri", default="mongodb://localhost:27017")
    ap.add_argument("--patients", type=int, default=200)
    ap.add_argument("--attackers", type=int, default=60)
    ap.add_argument("--fault", default="", help="comma list: rx_read_idor,branch_hop,admin_bypass (evaluation batch only)")
    ap.add_argument("--mock-fail-rate", type=float, default=0.02, help="share of model calls answered with a 500 (benign operational anomaly)")
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--reset", action="store_true",
                    help="--db mongo only: DELETE this batch's two staging databases and its datasets/raw/<batch> folder first")
    a = ap.parse_args()

    if a.db == "mongo":
        _check_mongo_batch(a)

    bd = C.batch_dir(a.batch)
    token = "tok_" + os.urandom(8).hex()
    (bd / ".staging_token").write_text(token)

    os.environ.update(
        APP_ENV="staging", SECRET_KEY=C.STAGING_SECRET, EVENT_SIGNING_KEY=C.STAGING_SIGNING_KEY,
        TRUSTED_PROXY_COUNT="0", DOCS_ENABLED="false", SECURITY_SINK_MODE="async",
        MONGO_URI=a.mongo_uri if a.db == "mongo" else "mongodb://localhost:27017",
        MONGO_DB_NAME=f"medicheck_staging_{a.batch}", SECURITY_DB_NAME=f"medicheck_security_staging_{a.batch}",
        SECURITY_SPILL_PATH=str(bd / "spill.jsonl"), PRIVATE_UPLOAD_ROOT=str(bd / "private_uploads"),
        STAGING_FAULT_INJECTION=a.fault, RATE_LIMITS_ENABLED="true",
    )
    sys.path.insert(0, str(C.BACKEND))

    if a.db == "embedded":
        import mongomock
        import pymongo.mongo_client
        pymongo.mongo_client.MongoClient = mongomock.MongoClient

    # ---- mocked models (ONLY these are replaced) ---------------------------------
    rng = random.Random(a.seed)

    def _wrap(result):
        def fn(*args, **kwargs):
            if rng.random() < a.mock_fail_rate:
                raise RuntimeError("mock model failure")        # -> real 500 path -> inference.failed
            return dict(result)
        return fn

    generic = {"success": True, "prediction": "Low risk", "risk_level": "Low", "confidence": 0.88,
               "probability": 0.12, "has_anemia": False, "diagnosis": "mock", "message": "mock", "recommendations": []}
    heart = {"success": True, "prediction": 0, "has_heart_disease": False, "confidence": 91.0,
             "probability_no_disease": 0.91, "probability_disease": 0.09, "risk_level": "Low",
             "disease": "Heart disease", "diagnosis": "mock", "recommendations": [], "threshold_used": 0.5}
    anemia = {"success": True, "prediction": 0, "has_anemia": False, "confidence": 92.5,
              "probability_no_anemia": 0.92, "probability_anemia": 0.08, "risk_level": "Low",
              "disease": "Anemia", "diagnosis": "mock", "notes": "mock"}
    skin = {"success": True, "disease": "Eczema", "confidence": 0.91, "route_used": "clean_skip", "detector_class": 0}
    for name, attrs in {
        "utils.predict": {"predict_skin_disease": _wrap(skin)},
        "utils.predict_skin_defense": {"predict_skin_defense": _wrap(skin), "get_pipeline_status": lambda: {"loaded": False}},
        "utils.predict_diabetes": {"predict_diabetes": _wrap(generic)},
        "utils.predict_kidney": {"predict_kidney_disease": _wrap(generic)},
        "utils.predict_fracture": {"predict_fracture": _wrap(generic)},
        "utils.predict_heart": {"predict_heart_disease": _wrap(heart)},
        "utils.predict_anemia": {"predict_anemia": _wrap(anemia), "generate_anemia_recommendations": lambda *x, **k: []},
    }.items():
        m = types.ModuleType(name)
        for k, v in attrs.items():
            setattr(m, k, v)
        sys.modules[name] = m

    from . import seed_population
    pop = seed_population.seed(a.batch, n_patients=a.patients, n_attackers=a.attackers)
    print(f"population ready: {len(pop['patients'])} patients, {len(pop['attackers'])} attackers, "
          f"{len(pop['victims'])} victims, {len(pop['staff']['pharmacist'])} pharmacists")

    import app as backend_app
    import security.logging_middleware as lm
    from database import security_events_collection
    from security.event_schema import document_to_json_line
    from security.event_sink import get_sink

    # staging-only control routes: not logged, token protected, never part of the dataset
    lm._SKIP_PATHS = lm._SKIP_PATHS | {"/__staging/export", "/__staging/health"}
    app = backend_app.app

    @app.get("/__staging/health")
    def _health():
        return {"ok": True, "batch": a.batch, "faults": a.fault, "db": a.db}

    @app.get("/__staging/export")
    def _export(tok: str = ""):
        if tok != token:
            return {"error": "bad token"}
        import hashlib
        get_sink().flush(timeout=60)
        out = bd / "events.jsonl"
        n = 0
        with open(out, "w", encoding="utf-8") as fh:
            for d in security_events_collection.find({}).sort([("timestamp", 1), ("seq", 1)]):
                fh.write(document_to_json_line(d) + "\n")
                n += 1
        digest = hashlib.sha256(out.read_bytes()).hexdigest()
        (bd / "events.sha256").write_text(digest)
        return {"events": n, "sha256": digest, "path": str(out), "sink": get_sink().stats()}

    (bd / "batch.json").write_text(json.dumps(
        {"batch": a.batch, "db": a.db, "faults": a.fault, "mock_fail_rate": a.mock_fail_rate, "port": a.port}, indent=1))
    if a.fault:
        print(f"\n!!! FAULT INJECTION ACTIVE: {a.fault}  (evaluation batch only; staging security checks are DISABLED) !!!\n")
    print(f"staging server on http://127.0.0.1:{a.port}   export token: {token}\n")

    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=a.port, log_level="warning")


if __name__ == "__main__":
    main()
