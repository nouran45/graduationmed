"""
Phase 2 - security event collection.

Maps to the plan's acceptance test:
  "A controlled login, prediction, and denied-access workflow produces correctly
   correlated events, and no sensitive medical content appears in those events."
"""
import json
from dataclasses import replace

import pytest

import database
from security.event_schema import ALLOWED_DETAIL_KEYS, EVENT_TYPES, classify_route, verify_document
from tests.conftest import PASSWORD, PDF, auth, login, last_request_events, png_bytes, register, stored_events, types
from tests.test_authorization import full_setup, make_admin, setup_pharmacy, upload

DIABETES = {"age": 40, "bmi": 25, "hypertension": 0, "heart_disease": 0, "smoking_history": 0,
            "HbA1c_level": 5, "blood_glucose_level": 100, "gender": 1}


def by_type(events, t):
    return [e for e in events if e["event_type"] == t]


# =============================================================================
# Acceptance workflow
# =============================================================================
def test_acceptance_login_prediction_denied_access_are_correlated(client):
    register(client, "pa@x.com"); register(client, "pb@x.com")
    r_login = login(client, "pa@x.com")
    h = {"Authorization": "Bearer " + r_login.json()["access_token"]}
    r_pred = client.post("/predict-diabetes", headers=h, json=DIABETES)

    # a second patient owns a prescription; patient A tries to read it (BOLA)
    owner_h, _, _, pid, bid = full_setup(client)
    pb, _ = auth(client, "victim@x.com")
    rx = upload(client, pb, bid).json()["prescription_id"]
    r_denied = client.get(f"/api/prescriptions/{rx}", headers=h)
    assert r_denied.status_code == 404

    login_ev = last_request_events(r_login)
    pred_ev = last_request_events(r_pred)
    denied_ev = last_request_events(r_denied)

    # every request: exactly ONE middleware record (seq 0) + its audit events
    for evs in (login_ev, pred_ev, denied_ev):
        mw = [e for e in evs if e["source"] == "middleware"]
        assert len(mw) == 1 and mw[0]["seq"] == 0
        assert len({e["request_id"] for e in evs}) == 1
        assert all(e["status_code"] == mw[0]["status_code"] for e in evs)
        assert all(e["latency_ms"] is not None for e in evs)

    assert types(login_ev) == ["auth.request", "auth.login.success"]
    assert types(pred_ev) == ["inference.request", "inference.completed"]
    assert types(denied_ev) == ["prescription.request", "prescription.read.denied"]

    # same pseudonymous actor and session across the three requests
    actors = {e["actor_id"] for e in login_ev + pred_ev + denied_ev}
    sessions = {e["session_id"] for e in login_ev + pred_ev + denied_ev}
    assert len(actors) == 1 and None not in actors
    assert len(sessions) == 1 and None not in sessions

    denied = by_type(denied_ev, "prescription.read.denied")[0]
    assert denied["rule_id"] == "RX-01"
    assert denied["target_relation"] == "other_patient"       # the real reason (HTTP said 404)
    assert denied["authorization_result"] == "denied"
    assert denied["target_ref"].startswith("ref_") and rx not in json.dumps(denied, default=str)


# =============================================================================
# Privacy: nothing sensitive may be stored
# =============================================================================
def test_no_sensitive_content_in_any_event(client):
    secret_pw = "Tr0ub4dor-and-3-more-Words"
    email = "very.secret.person@example.com"
    register(client, email, password=secret_pw, first="Alicia", last="Verylongsurname")
    r = login(client, email, password=secret_pw)
    token = r.json()["access_token"]
    user_id = r.json()["user"]["id"]
    sid = database.sessions_collection.find_one({})["session_id"]
    h = {"Authorization": f"Bearer {token}"}

    client.post("/predict-diabetes", headers=h, json={**DIABETES, "HbA1c_level": 7.77777})
    client.post("/predict-skin-defense", headers=h, files={"file": ("MY_PRIVATE_SCAN_name.png", png_bytes(), "image/png")})
    client.post("/save-history", headers=h, json={"condition": "SecretDiagnosisXYZ", "notes": "very private notes"})
    client.get("/history", headers=h)
    login(client, email, password="wrong-password-123")
    client.get("/history", headers={"Authorization": "Bearer " + token[:-3] + "abc"})   # tampered token

    owner_h, _, _, pid, bid = full_setup(client)
    pa, _ = auth(client, "pa@x.com")
    upload(client, pa, bid, name="PRESCRIPTION_for_Alicia.png")

    dump = json.dumps(stored_events(), default=str)
    for forbidden in (secret_pw, "wrong-password-123", email, "Alicia", "Verylongsurname", token, token[:25],
                      user_id, sid, "MY_PRIVATE_SCAN", "SecretDiagnosisXYZ", "very private notes",
                      "7.77777", "PRESCRIPTION_for_Alicia", "very.secret.person", bid, pid):
        assert forbidden not in dump, f"leaked: {forbidden[:30]}"

    # and the structure itself is bounded
    for e in stored_events():
        assert set(e["details"]) <= ALLOWED_DETAIL_KEYS
        assert e["event_type"] in EVENT_TYPES
        assert e["actor_id"] is None or e["actor_id"].startswith("actor_")
        assert e["session_id"] is None or e["session_id"].startswith("session_")


# =============================================================================
# Authentication events (plan step 2.2)
# =============================================================================
def test_login_failure_reasons_are_internal_only(client):
    register(client, "a@x.com")
    r1 = login(client, "a@x.com", "Wrong-password-1")
    r2 = login(client, "ghost@x.com", "Wrong-password-1")
    r3 = login(client, "a@x.com", "Wrong-password-2")
    assert r1.status_code == r2.status_code == 401 and r1.json() == r2.json()        # unchanged externally

    e1, e2, e3 = (by_type(last_request_events(r), "auth.login.failure")[0] for r in (r1, r2, r3))
    assert e1["details"]["reason"] == "bad_password"
    assert e2["details"]["reason"] == "unknown_account"
    assert e1["subject_id"] == e3["subject_id"] != e2["subject_id"]              # same target account -> same pseudonym
    assert e1["subject_id"].startswith("acct_")
    assert e1["actor_id"] is None and e1["actor_role"] == "anonymous"


def test_login_lockout_register_and_logout_events(client):
    register(client, "a@x.com")
    for _ in range(5):
        login(client, "a@x.com", "Wrong-password-1")
    locked = login(client, "a@x.com", PASSWORD)
    assert locked.status_code == 429
    assert types(last_request_events(locked)) == ["auth.request", "auth.login.locked"]

    dup = register(client, "a@x.com")
    ev = by_type(last_request_events(dup), "auth.register.failure")[0]
    assert ev["details"]["reason"] == "email_exists"
    weak = register(client, "n@x.com", password="short")
    assert by_type(last_request_events(weak), "auth.register.failure")[0]["details"]["reason"] == "weak_password"

    client.post("/login", json={"email": "ghost@x.com", "password": "x"})            # keep throttle noise out of the way
    h, _ = auth(client, "z@x.com")
    out = client.post("/logout", headers=h)
    assert "auth.logout.success" in types(last_request_events(out))
    ver = client.get("/verify-token", headers=h)                                     # session now revoked
    assert types(last_request_events(ver)) == ["auth.request", "auth.token.invalid"]


def test_token_invalid_reasons(client):
    import datetime as dt
    from jose import jwt
    from security.config import get_settings

    assert by_type(last_request_events(client.get("/history")), "auth.token.invalid")[0]["details"]["reason"] == "missing_token"
    r = client.get("/history", headers={"Authorization": "Bearer garbage"})
    assert by_type(last_request_events(r), "auth.token.invalid")[0]["details"]["reason"] == "invalid_token"

    h, uid = auth(client, "a@x.com")
    sid = database.sessions_collection.find_one({})["session_id"]
    s = get_settings()
    expired = jwt.encode({"sub": uid, "sid": sid, "jti": "1", "typ": "access",
                          "exp": dt.datetime.now(dt.timezone.utc) - dt.timedelta(seconds=5)}, s.secret_key, "HS256")
    r = client.get("/history", headers={"Authorization": f"Bearer {expired}"})
    assert by_type(last_request_events(r), "auth.token.invalid")[0]["details"]["reason"] == "expired_token"

    client.post("/logout", headers=h)                                                # token replay after logout
    r = client.get("/history", headers=h)
    ev = by_type(last_request_events(r), "auth.token.invalid")[0]
    assert ev["details"]["reason"] == "session_inactive"
    assert ev["subject_id"].startswith("actor_")                                    # valid signature -> known subject

    h2, _ = auth(client, "b@x.com")
    database.users.update_one({"email": "b@x.com"}, {"$set": {"is_disabled": True}})
    r = client.get("/history", headers=h2)
    assert by_type(last_request_events(r), "auth.token.invalid")[0]["details"]["reason"] == "user_unavailable"
    # the HTTP answer never differed
    assert {client.get("/history").status_code, client.get("/history", headers=h2).status_code} == {401}


# =============================================================================
# Medical model usage (plan step 2.3)
# =============================================================================
def test_inference_outcomes(client, monkeypatch):
    import app as app_module
    h, _ = auth(client, "a@x.com")

    ok = client.post("/predict-kidney", headers=h, json={})            # stubbed model; payload validity irrelevant to events
    ok = client.post("/predict-diabetes", headers=h, json=DIABETES)
    assert "inference.completed" in types(last_request_events(ok))

    bad = client.post("/predict", headers=h, files={"file": ("a.png", b"MZ not an image", "image/png")})
    ev = by_type(last_request_events(bad), "inference.rejected")[0]
    assert bad.status_code == 415 and ev["details"]["reason"] == "unsupported_type" and ev["details"]["file_kind"] == "unknown"

    big = client.post("/predict", headers=h, files={"file": ("a.png", b"\xff\xd8\xff" + b"0" * (11 * 1024 * 1024), "image/jpeg")})
    ev = by_type(last_request_events(big), "inference.rejected")[0]
    assert big.status_code == 413 and ev["details"]["reason"] == "too_large" and ev["details"]["size_bucket"] == "over_limit"

    good = client.post("/predict", headers=h, files={"file": ("a.png", png_bytes(), "image/png")})
    ev = by_type(last_request_events(good), "inference.completed")[0]
    assert ev["details"] == {"size_bucket": "small", "file_kind": "png"}

    def boom(*a, **k):
        raise RuntimeError("model exploded /secret/path")
    monkeypatch.setattr(app_module, "predict_diabetes", boom)
    fail = client.post("/predict-diabetes", headers=h, json=DIABETES)
    assert fail.status_code == 500
    assert "inference.failed" in types(last_request_events(fail))
    assert "secret/path" not in json.dumps(stored_events(), default=str)


def test_skin_defense_model_route_is_recorded_separately(client, monkeypatch):
    import app as app_module
    h, _ = auth(client, "a@x.com")
    for route_used, det, expected in [("clean_skip", 0, "clean"), ("sparse_sunet", 1, "sparse"), ("sunet_v3", 2, "dense")]:
        monkeypatch.setattr(app_module, "predict_skin_defense",
                            lambda p, r=route_used, d=det: {"success": True, "disease": "x", "confidence": 0.9, "route_used": r, "detector_class": d})
        r = client.post("/predict-skin-defense", headers=h, files={"file": ("a.png", png_bytes(), "image/png")})
        ev = by_type(last_request_events(r), "inference.completed")[0]
        assert ev["details"]["model_route"] == expected
        assert ev["event_type"] != "attack"                                         # never an attack label


def test_rate_limit_is_recorded(client):
    h, _ = auth(client, "a@x.com")
    resp = [client.post("/predict-diabetes", headers=h, json=DIABETES) for _ in range(22)]
    assert resp[20].status_code == 429
    ev = last_request_events(resp[20])
    assert types(ev) == ["inference.request", "resource.rate_limited"]               # no inference.* record for a blocked call
    assert by_type(ev, "resource.rate_limited")[0]["details"]["limiter"] == "predict"
    assert by_type(ev, "inference.request")[0]["outcome"] == "blocked"


# =============================================================================
# Authorization / database-sensitive operations (plan step 2.4)
# =============================================================================
def test_authorization_decisions_are_recorded(client):
    owner_h, owner_id, admin_h, pid, bid = full_setup(client)
    pa, _ = auth(client, "pa@x.com")

    r = client.get("/users", headers=pa)
    ev = by_type(last_request_events(r), "admin.access.denied")[0]
    assert (ev["rule_id"], ev["target_relation"], ev["authorization_result"]) == ("ADMIN-01", "non_admin", "denied")

    r = client.post(f"/api/admin/pharmacies/{pid}/verification", headers=pa, json={"status": "approved"})
    assert by_type(last_request_events(r), "admin.access.denied")[0]["rule_id"] == "PHARM-01"

    r = client.get("/api/prescriptions/pharmacy/queue", headers=pa)
    ev = by_type(last_request_events(r), "prescription.read.denied")[0]
    assert (ev["rule_id"], ev["target_relation"], ev["resource_type"]) == ("RX-02", "no_membership", "pharmacy_branch")

    r = client.get("/api/prescriptions/pharmacy/queue", headers={**owner_h, "X-Branch-ID": "br_other"})
    ev = by_type(last_request_events(r), "prescription.read.denied")[0]
    assert ev["target_relation"] == "not_staff_of_branch" and ev["target_ref"].startswith("ref_")
    assert "br_other" not in json.dumps(ev, default=str)

    r = client.get("/api/prescriptions/pharmacy/queue", headers=owner_h)
    ev = by_type(last_request_events(r), "prescription.read.allowed")[0]
    assert ev["staff_role"] == "owner" and ev["target_relation"] == "staff_of_branch" and ev["actor_role"] == "patient"

    mallory, _ = auth(client, "mallory@x.com")
    r = client.patch(f"/api/pharmacies/{pid}", headers=mallory, json={"name": "Pwned"})
    ev = by_type(last_request_events(r), "pharmacy.manage.denied")[0]
    assert (ev["rule_id"], ev["target_relation"]) == ("PHARM-02", "not_staff_of_pharmacy")


def test_inventory_and_pharmacy_domain_events(client):
    owner_h, owner_id, admin_h, pid, bid = full_setup(client)

    created = client.post("/api/inventory", headers=owner_h,
                          json={"product_id": "P1", "branch_id": bid, "physical_quantity": 10, "price": 5.0})
    ev = last_request_events(created)
    assert types(ev) == ["inventory.request", "inventory.write.allowed", "inventory.write.completed"]
    assert by_type(ev, "inventory.write.completed")[0]["details"]["operation"] == "create"

    dup = client.post("/api/inventory", headers=owner_h,
                      json={"product_id": "P1", "branch_id": bid, "physical_quantity": 10, "price": 5.0})
    assert dup.status_code == 409
    assert by_type(last_request_events(dup), "inventory.write.rejected")[0]["details"]["reason"] == "duplicate_item"

    o2, _ = auth(client, "owner2@x.com")
    _, bid2 = setup_pharmacy(client, o2, admin_h, name="Other")
    foreign = client.post("/api/inventory", headers=owner_h,
                          json={"product_id": "P2", "branch_id": bid2, "physical_quantity": 1, "price": 1.0})
    ev = by_type(last_request_events(foreign), "inventory.write.rejected")[0]
    assert ev["authorization_result"] == "denied" and ev["rule_id"] == "INV-01" and ev["target_relation"] == "other_branch"

    ph = auth(client, "pharm@x.com")[0]
    client.post(f"/api/pharmacies/{pid}/staff", headers=owner_h, json={"email": "pharm@x.com", "staff_role": "pharmacist"})
    r = client.patch(f"/api/inventory/{created.json()['inventory_id']}/quantity", headers=ph, json={"physical_quantity": 0})
    ev = by_type(last_request_events(r), "inventory.write.denied")[0]
    assert ev["rule_id"] == "INV-01" and ev["staff_role"] is None                     # denied before a staff role applies

    granted = client.post(f"/api/pharmacies/{pid}/staff", headers=owner_h, json={"email": "pharm@x.com", "staff_role": "inventory"})
    assert "pharmacy.staff.granted" in types(last_request_events(granted))
    assert by_type(last_request_events(granted), "pharmacy.staff.granted")[0]["details"] == {"staff_role": "inventory"}


def test_history_and_prescription_workflow_events(client):
    h, _ = auth(client, "a@x.com")
    client.post("/predict-diabetes", headers=h, json=DIABETES)
    r = client.get("/history", headers=h)
    ev = by_type(last_request_events(r), "history.read.allowed")[0]
    assert ev["rule_id"] == "HIST-01" and ev["target_relation"] == "self" and ev["details"]["record_count"] == 1
    assert "history.read.allowed" in types(last_request_events(client.get("/dashboard-history", headers=h)))
    assert "history.write.allowed" in types(last_request_events(client.post("/save-history", headers=h, json={"condition": "x"})))

    owner_h, _, admin_h, pid, bid = full_setup(client)
    pa, _ = auth(client, "p2@x.com")
    up = upload(client, pa, bid)
    assert types(last_request_events(up)) == ["prescription.request", "prescription.upload.accepted"]
    bad = client.post("/api/prescriptions", headers=pa, data={"branch_id": "br_nope"}, files={"file": ("x.png", png_bytes(), "image/png")})
    assert by_type(last_request_events(bad), "prescription.upload.rejected")[0]["details"]["reason"] == "branch_unavailable"
    html = client.post("/api/prescriptions", headers=pa, data={"branch_id": bid}, files={"file": ("x.png", b"<html>", "image/png")})
    evs = last_request_events(html)
    assert by_type(evs, "prescription.upload.rejected")[0]["details"] == {"reason": "validation_failed"}
    # file facts are stored ONCE, on the request record
    assert [e for e in evs if e["source"] == "middleware"][0]["details"] == {"size_bucket": "small", "file_kind": "unknown"}

    rx = up.json()["prescription_id"]
    rev = client.post(f"/api/prescriptions/{rx}/review", headers=owner_h,
                      json={"decision": "approve", "reviewed_items": [{"line_id": "line-001", "confirmed_name": "Amoxicillin"}]})
    assert rev.status_code == 200
    done = by_type(last_request_events(rev), "prescription.review.completed")[0]
    assert done["details"]["decision"] == "approve" and done["staff_role"] == "owner"
    assert "Amoxicillin" not in json.dumps(stored_events(), default=str)

    other_branch_view = client.get(f"/api/prescriptions/pharmacy/{rx}", headers=admin_h)   # admin has no staff membership
    assert other_branch_view.status_code in (403,)


# =============================================================================
# Middleware behaviour (plan step 2.1)
# =============================================================================
def test_unmatched_paths_and_early_413_are_logged_without_raw_paths(client):
    r = client.get("/wp-admin/../../etc/passwd?x=SECRETQUERY")
    ev = last_request_events(r)
    assert [e["endpoint_template"] for e in ev] == ["<unmatched>"] and ev[0]["status_code"] == 404
    assert "wp-admin" not in json.dumps(stored_events(), default=str) and "SECRETQUERY" not in json.dumps(stored_events(), default=str)

    r = client.post("/predict-kidney", content=b"x", headers={"Content-Length": str(50 * 1024 * 1024), "Content-Type": "application/json"})
    assert r.status_code == 413
    ev = last_request_events(r)
    assert ev[0]["endpoint_template"] == "/predict-kidney" and ev[0]["status_code"] == 413 and ev[0]["event_type"] == "inference.request"


def test_http_record_fields_follow_the_plan(client):
    h, _ = auth(client, "a@x.com")
    r = client.post("/predict-kidney", headers=h, json={})
    mw = [e for e in last_request_events(r) if e["source"] == "middleware"][0]
    for field in ("timestamp", "request_id", "session_id", "actor_id", "actor_role", "endpoint_template",
                  "method", "status_code", "latency_ms", "service_name", "event_type"):
        assert mw[field] not in (None, ""), field
    assert mw["service_name"] == "kidney_prediction" and mw["event_type"] == "inference.request"
    assert mw["endpoint_template"] == "/predict-kidney" and mw["method"] == "POST"
    assert mw["route_sensitivity"] == "medium" and mw["ip_hash"].startswith("ip_")
    assert mw["event_id"].startswith("evt_")


def test_event_ids_unique_and_timestamps_ms_precision(client):
    h, _ = auth(client, "a@x.com")
    for _ in range(5):
        client.get("/history", headers=h)
    ev = stored_events()
    assert len({e["event_id"] for e in ev}) == len(ev)
    assert all(e["timestamp"].microsecond % 1000 == 0 for e in ev)


def test_logging_failure_never_breaks_a_request(client, monkeypatch):
    import security.logging_middleware as lm

    class Broken:
        def emit(self, doc): raise RuntimeError("storage exploded")
    monkeypatch.setattr(lm, "get_sink", lambda: Broken())
    h, _ = auth(client, "a@x.com")
    assert client.post("/predict-diabetes", headers=h, json=DIABETES).status_code == 200
    assert client.get("/history", headers=h).status_code == 200


def test_events_can_be_switched_off(client, monkeypatch):
    import security.logging_middleware as lm
    from security.config import get_settings
    monkeypatch.setattr(lm, "get_settings", lambda: replace(get_settings(), security_events_enabled=False))
    assert client.get("/").status_code == 200
    assert stored_events() == []


# =============================================================================
# Trust: clients cannot create or forge audit records (plan step 2.6)
# =============================================================================
def test_clients_cannot_forge_or_submit_events(client):
    h, _ = auth(client, "a@x.com")
    forged = {"X-Request-ID": "req_EVIL", "X-Event-Type": "auth.login.success", "X-Actor-ID": "victim-actor",
              "X-Forwarded-For": "6.6.6.6", "User-Agent": "EVIL-AGENT"}
    r = client.get("/history", headers={**h, **forged})
    assert r.headers["X-Request-ID"] != "req_EVIL"
    dump = json.dumps(stored_events(), default=str)
    for bad in ("req_EVIL", "victim-actor", "6.6.6.6", "EVIL-AGENT"):
        assert bad not in dump

    # no route lets anyone WRITE security events
    import app as app_module
    from fastapi.routing import APIRoute
    writers = [(r_.path, m) for r_ in app_module.app.routes if isinstance(r_, APIRoute)
               if r_.path.startswith("/api/security") for m in r_.methods if m not in ("GET", "HEAD", "OPTIONS")]
    assert writers == []
    assert client.post("/api/security/events", headers=h, json={"event_type": "auth.login.success"}).status_code in (403, 405)


def test_signatures_detect_tampering(client):
    h, _ = auth(client, "a@x.com")
    client.get("/history", headers=h)
    assert all(verify_document(e) for e in stored_events())

    victim = database.security_events_collection.find_one({"event_type": "history.read.allowed"})
    database.security_events_collection.update_one({"_id": victim["_id"]}, {"$set": {"actor_role": "admin"}})
    assert not verify_document(database.security_events_collection.find_one({"_id": victim["_id"]}))

    forged = dict(victim); forged.pop("_id"); forged["event_id"] = "evt_forged"; forged["sig"] = "0" * 64
    database.security_events_collection.insert_one(forged)
    assert not verify_document(database.security_events_collection.find_one({"event_id": "evt_forged"}))


def test_actor_pseudonyms_map_back_to_sessions_for_the_response_engine(client):
    h, uid = auth(client, "a@x.com")
    client.get("/history", headers=h)
    ev = by_type(stored_events(), "history.read.allowed")[0]
    sess = database.sessions_collection.find_one({"session_pseudonym": ev["session_id"]})
    assert sess is not None and sess["actor_pseudonym"] == ev["actor_id"] and str(sess["user_id"]) == uid


# =============================================================================
# Admin read API
# =============================================================================
def test_admin_can_read_events_and_others_cannot(client):
    h, _ = auth(client, "a@x.com")
    r = client.get("/history", headers=h)
    admin_h, _ = auth(client, "boss@x.com"); make_admin("boss@x.com")

    assert client.get("/api/security/events").status_code == 401
    denied = client.get("/api/security/events", headers=h)
    assert denied.status_code == 403
    assert "admin.access.denied" in types(last_request_events(denied))

    rid = r.headers["X-Request-ID"]
    got = client.get(f"/api/security/events?request_id={rid}", headers=admin_h)
    assert got.status_code == 200
    body = got.json()
    assert {e["event_type"] for e in body} == {"history.request", "history.read.allowed"}
    assert all(e["sig_valid"] is True and "sig" not in e and "_id" not in e for e in body)
    assert "security.events.read" in types(last_request_events(got))                 # reading the log is itself audited

    assert client.get("/api/security/events?event_type=made.up", headers=admin_h).status_code == 400
    assert len(client.get("/api/security/events?limit=3", headers=admin_h).json()) == 3
    stats = client.get("/api/security/events/stats", headers=admin_h).json()
    assert stats["sink"]["written"] >= 1 and stats["sink"]["dropped"] == 0 and stats["stored_events"] >= 1


# =============================================================================
# Registry
# =============================================================================
def test_every_application_route_is_in_the_registry():
    import app as app_module
    from fastapi.routing import APIRoute
    unknown = [r.path for r in app_module.app.routes if isinstance(r, APIRoute) and classify_route(r.path).service == "unknown"]
    assert unknown == []


# =============================================================================
# End-to-end through the REAL async writer thread (other tests use sync mode)
# =============================================================================
def test_app_with_the_async_sink_stores_everything(client, tmp_path):
    from security.event_sink import EventSink, get_sink, set_sink
    previous = get_sink()
    sink = EventSink(database.security_events_collection, mode="async", batch_size=20,
                     flush_interval=0.05, spill_path=str(tmp_path / "spill.jsonl"))
    set_sink(sink)
    try:
        h, _ = auth(client, "a@x.com")
        for _ in range(15):
            client.post("/predict-diabetes", headers=h, json=DIABETES)
        assert sink.flush(5)
        evs = list(database.security_events_collection.find({"event_type": "inference.completed"}))
        assert len(evs) == 15
        assert sink.stats()["dropped"] == 0 and sink.stats()["spilled"] == 0 and sink.stats()["writer_alive"]
    finally:
        sink.stop()
        set_sink(previous)
