"""Teammate's public pharmacy catalogue, after the security merge."""
import json

import pytest

import database
from tests.conftest import auth, last_request_events, stored_events, types
from tests.test_authorization import make_admin


@pytest.fixture()
def catalogue():
    database.db["pharmacy_catalogue"].insert_many([
        {"_id": "ph1:1", "external_id": "1", "pharmacy_id": "ph1", "pharmacy_name": "Alpha", "name": "Paracetamol 500",
         "price": 20, "old_price": 25, "availability": "in_stock", "category": {"id": 3, "name": "TABLETS"}, "barcode": "6221234567890",
         "source_item_id": 77, "_sync_updated_at": "x"},
        {"_id": "ph2:9", "external_id": "9", "pharmacy_id": "ph2", "pharmacy_name": "Beta", "name": "Paracetamol 500",
         "price": 18, "availability": "out_of_stock", "category": {"id": 3, "name": "TABLETS"}, "barcode": "6221234567890",
         "source_item_id": 77},
        {"_id": "ph1:2", "external_id": "2", "pharmacy_id": "ph1", "pharmacy_name": "Alpha", "name": "Vitamin C",
         "price": 50, "availability": "in_stock", "category": {"id": 5, "name": "VITAMINS"}, "barcode": "1"},
    ])


def test_public_reads_work_without_login(client, catalogue):
    r = client.get("/api/catalogue/products", params={"q": "para"})
    assert r.status_code == 200 and r.json()["total"] == 2
    assert all("_id" not in i and "_sync_updated_at" not in i for i in r.json()["items"])
    assert client.get("/api/catalogue/categories").json()["items"][0]["product_count"] >= 1
    assert client.get("/api/catalogue/products/1").json()["name"] == "Paracetamol 500"
    offers = client.get("/api/catalogue/products/1/offers").json()["offers"]
    assert [o["price"] for o in offers] == [18, 20]
    assert client.get("/api/catalogue/products/404").status_code == 404


def test_regex_input_is_escaped(client, catalogue):
    # a regex metacharacter payload must be treated literally (no ReDoS / pattern injection)
    assert client.get("/api/catalogue/products", params={"q": "(a+)+$"}).json()["total"] == 0
    assert client.get("/api/catalogue/products", params={"q": ".*"}).json()["total"] == 0


def test_input_limits(client, catalogue):
    assert client.get("/api/catalogue/products", params={"q": "x" * 101}).status_code == 422
    assert client.get("/api/catalogue/products", params={"pharmacy_id": "p" * 65}).status_code == 422
    assert client.get("/api/catalogue/products", params={"offset": 10_000_000}).status_code == 422
    assert client.get("/api/catalogue/products/" + "9" * 65).status_code == 422
    assert client.get("/api/catalogue/products", params={"availability": "bogus"}).status_code == 400


def test_public_reads_are_rate_limited_per_ip(client, catalogue):
    codes = [client.get("/api/catalogue/categories").status_code for _ in range(121)]
    assert codes[:120] == [200] * 120 and codes[120] == 429
    assert "resource.rate_limited" in types(last_request_events(client.get("/api/catalogue/categories")))


def test_catalogue_requests_are_logged_as_pharmacy_traffic(client, catalogue):
    r = client.get("/api/catalogue/products", params={"q": "vitamin"})
    mw = [e for e in last_request_events(r) if e["source"] == "middleware"][0]
    assert mw["event_type"] == "pharmacy.request" and mw["service_name"] == "catalogue_search"
    assert "vitamin" not in json.dumps(stored_events(), default=str)          # query text is never logged


def test_sync_requires_an_admin_session(client, monkeypatch):
    import routers.pharmacy_catalogue as rc
    monkeypatch.setattr(rc, "start_catalogue_sync", lambda: {"started": True, "message": "ok"})
    monkeypatch.delenv("CATALOGUE_SYNC_ADMIN_KEY", raising=False)

    assert client.post("/api/catalogue/admin/sync/start").status_code == 401
    patient, _ = auth(client, "p@x.com")
    assert client.post("/api/catalogue/admin/sync/start", headers=patient).status_code == 403
    assert client.get("/api/catalogue/admin/sync/status", headers=patient).status_code == 403

    admin, _ = auth(client, "boss@x.com"); make_admin("boss@x.com")
    r = client.post("/api/catalogue/admin/sync/start", headers=admin)
    assert r.status_code == 200
    assert "pharmacy.catalogue_sync.started" in types(last_request_events(r))
    assert client.get("/api/catalogue/admin/sync/status", headers=admin).json()["status"] == "not_started"


def test_sync_key_is_a_second_factor_when_configured(client, monkeypatch):
    import routers.pharmacy_catalogue as rc
    monkeypatch.setattr(rc, "start_catalogue_sync", lambda: {"started": True, "message": "ok"})
    monkeypatch.setenv("CATALOGUE_SYNC_ADMIN_KEY", "k" * 40)
    admin, _ = auth(client, "boss@x.com"); make_admin("boss@x.com")

    r = client.post("/api/catalogue/admin/sync/start", headers=admin)                       # admin but no key
    assert r.status_code == 401 and "pharmacy.catalogue_sync.denied" in types(last_request_events(r))
    assert client.post("/api/catalogue/admin/sync/start", headers={**admin, "X-Catalogue-Sync-Key": "wrong"}).status_code == 401
    assert client.post("/api/catalogue/admin/sync/start", headers={"X-Catalogue-Sync-Key": "k" * 40}).status_code == 401   # key alone is not enough
    assert client.post("/api/catalogue/admin/sync/start", headers={**admin, "X-Catalogue-Sync-Key": "k" * 40}).status_code == 200
    assert "k" * 40 not in json.dumps(stored_events(), default=str)


def test_upstream_records_cannot_inject_mongo_operators():
    from services.pharmacy_catalogue_service import _safe_upstream_document
    dirty = {"name": "ok", "$where": "x", "a.b": 1, "nested": {"$gt": 1, "fine": 2}, "list": [{"$x": 1, "y": 2}]}
    assert _safe_upstream_document(dirty) == {"name": "ok", "nested": {"fine": 2}, "list": [{"y": 2}]}


def test_import_worker_stores_clean_records(monkeypatch):
    import services.pharmacy_catalogue_service as svc

    pages = [
        {"total": 2, "items": [{"id": 1, "pharmacy_id": "phX", "name": "A", "$set": {"price": 0}, "category.name": "evil"}]},
        {"total": 2, "items": [{"id": 2, "pharmacy_id": "phX", "name": "B"}]},
    ]

    class FakeResp:
        def __init__(self, data): self.data = data
        def raise_for_status(self): pass
        def json(self): return self.data

    class FakeSession:
        def get(self, url, headers=None, params=None, timeout=None):
            assert headers["X-MediCheck-Token"] == "tok" and url == "https://upstream.example/api/v1/products"
            return FakeResp(pages.pop(0) if pages else {"total": 2, "items": []})
        def close(self): pass

    monkeypatch.setenv("PHARMASYNC_API_BASE_URL", "https://upstream.example")
    monkeypatch.setenv("MEDICHECK_API_TOKEN", "tok")
    monkeypatch.setattr(svc.requests, "Session", FakeSession)

    # mongomock's bulk_write does not accept the `sort` argument newer pymongo UpdateOne passes;
    # apply the SAME UpdateOne operations one by one (real MongoDB runs them unchanged).
    coll = svc.catalogue_collection
    monkeypatch.setattr(coll, "bulk_write", lambda ops, ordered=False: [
        coll.update_one(op._filter, op._doc, upsert=op._upsert) for op in ops], raising=False)
    svc._import_worker()

    docs = list(database.db["pharmacy_catalogue"].find({}, {"_id": 0, "_sync_updated_at": 0}))
    assert sorted(d["name"] for d in docs) == ["A", "B"]
    assert all("$set" not in d and "category.name" not in d for d in docs)
    assert svc.get_sync_status()["status"] == "completed"
