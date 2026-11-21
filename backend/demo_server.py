"""
LOCAL DEMO BACKEND - for looking at the frontend only.

  * no MongoDB Atlas  -> in-memory fake database (mongomock); data resets on every restart
  * no torch/weights  -> the ML functions return FAKE results
  * runs the REAL app.py, so login, sessions, roles and pharmacy permissions behave for real

Never use this for anything except local viewing.

    python demo_server.py            # http://127.0.0.1:8000
"""
import os
import sys
import types

os.environ["SECRET_KEY"] = "demo-secret-key-demo-secret-key-0123456789"
os.environ["MONGO_URI"] = "mongodb://localhost:27017"
os.environ["APP_ENV"] = "development"
os.environ["TRUSTED_PROXY_COUNT"] = "0"
os.environ["RATE_LIMITS_ENABLED"] = "false"
# Relaxed so you do not lock yourself out while exploring (real default: 5 per e-mail).
os.environ["LOGIN_MAX_FAILURES_PER_EMAIL"] = "30"
os.environ["LOGIN_MAX_FAILURES_PER_IP"] = "300"
os.environ["CORS_ORIGINS"] = ",".join(
    f"http://{h}:{p}" for h in ("localhost", "127.0.0.1") for p in (3000, 3001, 3002)
)

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import mongomock
import pymongo.mongo_client

pymongo.mongo_client.MongoClient = mongomock.MongoClient


def _fake(name, **attrs):
    mod = types.ModuleType(name)
    for k, v in attrs.items():
        setattr(mod, k, v)
    sys.modules[name] = mod


def _skin(*a, **k):
    return {"success": True, "disease": "Eczema (FAKE DEMO RESULT)", "confidence": 0.91,
            "all_probabilities": {"Eczema": 0.91, "Psoriasis": 0.06, "Acne": 0.03}}


def _generic(*a, **k):
    return {"success": True, "prediction": "Low risk (FAKE DEMO RESULT)", "risk_level": "Low",
            "confidence": 0.88, "probability": 0.12, "has_anemia": False,
            "diagnosis": "Demo result", "message": "Demo result", "recommendations": []}


_fake("utils.predict", predict_skin_disease=_skin)
_fake("utils.predict_skin_defense", predict_skin_defense=_skin,
      get_pipeline_status=lambda: {"loaded": False})
_fake("utils.predict_diabetes", predict_diabetes=_generic)
_fake("utils.predict_kidney", predict_kidney_disease=_generic)
_fake("utils.predict_fracture", predict_fracture=_generic)
_fake("utils.predict_heart", predict_heart_disease=_generic)
_fake("utils.predict_anemia", predict_anemia=_generic,
      generate_anemia_recommendations=lambda *a, **k: [])

PASSWORD = "Demo-Password-123"

# ---- seed synthetic accounts + one approved pharmacy/branch ---------------
from scripts import seed_staging   # noqa: E402

os.environ["SEED_PASSWORD"] = PASSWORD
sys.argv = ["seed", "--i-know-this-is-staging"]
seed_staging.main()

print("\n" + "=" * 64)
print("DEMO ACCOUNTS (password for all: %s)" % PASSWORD)
for who, what in [
    ("patient1@synthetic.medicheck.dev", "patient"),
    ("pharmacist@synthetic.medicheck.dev", "pharmacy staff (prescriptions)"),
    ("owner@synthetic.medicheck.dev", "pharmacy owner"),
    ("inventory@synthetic.medicheck.dev", "pharmacy inventory staff"),
    ("admin@synthetic.medicheck.dev", "administrator"),
]:
    print(f"  {who:<38} {what}")
print("=" * 64)
print("Security events (admin only): GET /api/security/events   |   run: python -m scripts.phase2_acceptance_demo\n")

import uvicorn   # noqa: E402
import app as app_module   # noqa: E402

# ---- self-check: log in as every demo account, in-process ----------------
def _self_check() -> None:
    try:
        from importlib.metadata import version
        print("versions: bcrypt", version("bcrypt"), "| passlib", version("passlib"),
              "| pydantic", version("pydantic"), "| python", sys.version.split()[0])
        from fastapi.testclient import TestClient
    except Exception as exc:   # noqa: BLE001
        print("SELF-CHECK skipped (", exc, ") -> pip install httpx")
        return
    c = TestClient(app_module.app)
    bad = []
    for who in ("patient1", "pharmacist", "owner", "inventory", "admin"):
        r = c.post("/login", json={"email": f"{who}@synthetic.medicheck.dev", "password": PASSWORD})
        if r.status_code != 200:
            bad.append((who, r.status_code, r.text[:120]))
    if bad:
        print("SELF-CHECK FAILED:", bad)
        print("  -> copy this whole message to Claude (most likely a bcrypt/passlib version problem)")
    else:
        print("SELF-CHECK OK: all 5 demo accounts can log in. If the browser says 401, the e-mail/password typed is different.")
    print()

_self_check()

uvicorn.run(app_module.app, host="127.0.0.1", port=8000, log_level="info")
