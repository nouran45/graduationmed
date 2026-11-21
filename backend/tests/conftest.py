"""
Test harness.

* MongoDB  -> mongomock (no network, no Atlas, no real data)
* ML utils -> stubbed, so the REAL app.py can be imported without torch /
              tensorflow / model weights
"""
import io
import os
import sys
import types

import pytest

os.environ["SECRET_KEY"] = "test-secret-key-test-secret-key-0123456789"
os.environ["MONGO_URI"] = "mongodb://localhost:27017"
os.environ["APP_ENV"] = "test"
os.environ["TRUSTED_PROXY_COUNT"] = "0"

# ---- Phase 2: security events -------------------------------------------
import tempfile as _tempfile
os.environ["SECURITY_EVENTS_STRICT"] = "true"     # unknown event types / bad events RAISE in tests
os.environ["SECURITY_SINK_MODE"] = "sync"         # deterministic: events are stored before the response returns
os.environ["SECURITY_SPILL_PATH"] = os.path.join(_tempfile.mkdtemp(prefix="mc_spill_"), "events_spill.jsonl")

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import mongomock                       # noqa: E402
import pymongo.mongo_client            # noqa: E402

pymongo.mongo_client.MongoClient = mongomock.MongoClient   # must precede `import database`


def _stub(name, **attrs):
    mod = types.ModuleType(name)
    for k, v in attrs.items():
        setattr(mod, k, v)
    sys.modules[name] = mod
    return mod


ok_result = lambda *a, **k: {"success": True, "disease": "TestDisease", "confidence": 0.9,
                             "has_anemia": False, "diagnosis": "x"}
_stub("utils.predict", predict_skin_disease=ok_result)
_stub("utils.predict_skin_defense", predict_skin_defense=ok_result,
      get_pipeline_status=lambda: {"loaded": False, "models": {"detector": "/secret/path.pt"}})
_stub("utils.predict_diabetes", predict_diabetes=ok_result)
_stub("utils.predict_kidney", predict_kidney_disease=ok_result)
_stub("utils.predict_fracture", predict_fracture=ok_result)
_stub("utils.predict_heart", predict_heart_disease=ok_result)
_stub("utils.predict_anemia", predict_anemia=ok_result,
      generate_anemia_recommendations=lambda *a, **k: [])

import database                        # noqa: E402
from fastapi.testclient import TestClient   # noqa: E402
import app as app_module               # noqa: E402
from security.rate_limit import limiter     # noqa: E402

PASSWORD = "Correct-Horse-Battery-9"


@pytest.fixture(autouse=True)
def clean_db(tmp_path, monkeypatch):
    for name in database.db.list_collection_names():
        database.db[name].delete_many({})
    for name in database.security_db.list_collection_names():
        database.security_db[name].delete_many({})
    limiter.reset()
    monkeypatch.setenv("PRIVATE_UPLOAD_ROOT", str(tmp_path))
    import services.prescription_service as ps
    monkeypatch.setattr(ps, "PRIVATE_UPLOAD_ROOT", tmp_path)
    yield


@pytest.fixture()
def client():
    return TestClient(app_module.app)


def register(client, email, password=PASSWORD, first="Test", last="User"):
    return client.post("/register", json={
        "firstName": first, "lastName": last, "email": email,
        "password": password, "confirmPassword": password})


def login(client, email, password=PASSWORD):
    return client.post("/login", json={"email": email, "password": password})


def auth(client, email):
    """Register + login, return (headers, user_id)."""
    register(client, email)
    r = login(client, email)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}, r.json()["user"]["id"]


@pytest.fixture()
def make_user(client):
    return lambda email: auth(client, email)


def png_bytes():
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", (8, 8), "white").save(buf, "PNG")
    return buf.getvalue()


PDF = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"


# ---------------------------------------------------------------------------
# Phase 2 helpers
# ---------------------------------------------------------------------------
def stored_events(**query):
    """All stored security events (oldest first), optionally filtered."""
    from security.event_sink import get_sink
    get_sink().flush()
    return list(database.security_events_collection.find(query).sort([("timestamp", 1), ("seq", 1)]))


def types(events):
    return [e["event_type"] for e in events]


def last_request_events(client_response):
    """Events of the request that produced `client_response` (by its X-Request-ID)."""
    rid = client_response.headers["X-Request-ID"]
    return stored_events(request_id=rid)
