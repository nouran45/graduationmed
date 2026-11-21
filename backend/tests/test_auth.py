import time
from datetime import datetime, timedelta, timezone

import pytest
from jose import jwt

import database
from security.config import get_settings
from tests.conftest import PASSWORD, auth, login, register


def test_register_never_stores_plaintext_password(client):
    assert register(client, "a@x.com").status_code == 201
    doc = database.users.find_one({"email": "a@x.com"})
    assert "password" not in doc and "confirmPassword" not in doc
    assert doc["hashed_password"].startswith("$2")
    assert PASSWORD not in str(doc)
    assert doc["role"] == "patient"


def test_register_rejects_role_injection_and_mismatch_and_weak(client):
    r = client.post("/register", json={"firstName": "a", "lastName": "b", "email": "b@x.com",
                    "password": PASSWORD, "confirmPassword": PASSWORD, "role": "admin"})
    assert r.status_code == 422
    assert register(client, "c@x.com", password="short").status_code == 400
    r = client.post("/register", json={"firstName": "a", "lastName": "b", "email": "d@x.com",
                    "password": PASSWORD, "confirmPassword": PASSWORD + "x"})
    assert r.status_code == 400


def test_email_is_case_insensitive_and_unique(client):
    assert register(client, "Case@X.com").status_code == 201
    assert register(client, "case@x.com").status_code == 400
    assert login(client, "CASE@x.com").status_code == 200


def test_login_generic_error_same_for_unknown_and_wrong_password(client):
    register(client, "a@x.com")
    r1 = login(client, "a@x.com", "Wrong-password-1")
    r2 = login(client, "nobody@x.com", "Wrong-password-1")
    assert r1.status_code == r2.status_code == 401
    assert r1.json() == r2.json()


def test_lockout_after_repeated_failures(client):
    register(client, "a@x.com")
    for _ in range(5):
        assert login(client, "a@x.com", "Wrong-password-1").status_code == 401
    r = login(client, "a@x.com", PASSWORD)        # even the right password is blocked
    assert r.status_code == 429 and "Retry-After" in r.headers
    # same lock for an address that does not exist (no enumeration)
    for _ in range(5):
        login(client, "ghost@x.com", "x")
    assert login(client, "ghost@x.com", "x").status_code == 429


def test_protected_endpoint_needs_token(client):
    assert client.get("/history").status_code == 401
    assert client.get("/users/me").status_code == 401
    assert client.get("/history", headers={"Authorization": "Bearer garbage"}).status_code == 401


def test_forged_and_legacy_tokens_rejected(client):
    h, uid = auth(client, "a@x.com")
    s = get_settings()
    # wrong signing key
    forged = jwt.encode({"sub": uid, "sid": "ses_x", "jti": "1", "typ": "access",
                         "exp": datetime.now(timezone.utc) + timedelta(hours=1)}, "other-key", "HS256")
    assert client.get("/history", headers={"Authorization": f"Bearer {forged}"}).status_code == 401
    # OLD format token (sub = e-mail, no sid) signed with the REAL key
    legacy = jwt.encode({"sub": "a@x.com", "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
                        s.secret_key, "HS256")
    assert client.get("/history", headers={"Authorization": f"Bearer {legacy}"}).status_code == 401
    # alg=none
    import base64, json
    b = lambda d: base64.urlsafe_b64encode(json.dumps(d).encode()).rstrip(b"=").decode()
    none_tok = f'{b({"alg":"none","typ":"JWT"})}.{b({"sub":uid,"sid":"x","jti":"1","typ":"access","exp":9999999999})}.'
    assert client.get("/history", headers={"Authorization": f"Bearer {none_tok}"}).status_code == 401


def test_role_claim_in_token_is_ignored(client):
    h, uid = auth(client, "a@x.com")
    sid = database.sessions_collection.find_one({})["session_id"]
    s = get_settings()
    tok = jwt.encode({"sub": uid, "sid": sid, "jti": "1", "typ": "access", "role": "admin",
                      "exp": datetime.now(timezone.utc) + timedelta(hours=1)}, s.secret_key, "HS256")
    r = client.get("/users", headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 403          # role comes from the DB, not the token


def test_expired_token_rejected(client):
    h, uid = auth(client, "a@x.com")
    sid = database.sessions_collection.find_one({})["session_id"]
    s = get_settings()
    tok = jwt.encode({"sub": uid, "sid": sid, "jti": "1", "typ": "access",
                      "exp": datetime.now(timezone.utc) - timedelta(seconds=5)}, s.secret_key, "HS256")
    assert client.get("/history", headers={"Authorization": f"Bearer {tok}"}).status_code == 401


def test_logout_revokes_session_server_side(client):
    h, _ = auth(client, "a@x.com")
    assert client.get("/verify-token", headers=h).status_code == 200
    assert client.post("/logout", headers=h).status_code == 200
    assert client.get("/verify-token", headers=h).status_code == 401   # same JWT now dead


def test_change_password_revokes_other_sessions(client):
    h1, _ = auth(client, "a@x.com")
    h2 = {"Authorization": f"Bearer {login(client, 'a@x.com').json()['access_token']}"}
    new = "Another-Strong-Pass-7"
    r = client.post("/auth/change-password", headers=h1,
                    json={"current_password": PASSWORD, "new_password": new})
    assert r.status_code == 200 and r.json()["other_sessions_revoked"] == 1
    assert client.get("/verify-token", headers=h1).status_code == 200
    assert client.get("/verify-token", headers=h2).status_code == 401
    assert login(client, "a@x.com", new).status_code == 200


def test_disabled_user_loses_access(client):
    h, uid = auth(client, "a@x.com")
    database.users.update_one({"email": "a@x.com"}, {"$set": {"is_disabled": True}})
    assert client.get("/verify-token", headers=h).status_code == 401
    assert login(client, "a@x.com").status_code == 401


def test_admin_only_routes(client):
    h, _ = auth(client, "a@x.com")
    assert client.get("/users", headers=h).status_code == 403
    assert client.get("/predict-skin-defense/health", headers=h).status_code == 403
    database.users.update_one({"email": "a@x.com"}, {"$set": {"role": "admin"}})
    assert client.get("/users", headers=h).status_code == 200


def test_history_is_scoped_to_caller(client):
    ha, _ = auth(client, "a@x.com")
    hb, _ = auth(client, "b@x.com")
    client.post("/predict-diabetes", headers=ha, json={
        "age": 40, "bmi": 25, "hypertension": 0, "heart_disease": 0, "smoking_history": 0,
        "HbA1c_level": 5, "blood_glucose_level": 100, "gender": 1})
    assert len(client.get("/history", headers=ha).json()) == 1
    assert client.get("/history", headers=hb).json() == []


def test_security_headers_and_request_id(client):
    r = client.get("/")
    assert r.headers["X-Request-ID"].startswith("req_")
    assert r.headers["X-Content-Type-Options"] == "nosniff"


def test_unhandled_error_does_not_leak(client, monkeypatch):
    import app as m
    def boom(*a, **k): raise RuntimeError("secret internal path /etc/passwd")
    monkeypatch.setattr(m, "predict_diabetes", boom)
    h, _ = auth(client, "a@x.com")
    r = client.post("/predict-diabetes", headers=h, json={
        "age": 40, "bmi": 25, "hypertension": 0, "heart_disease": 0, "smoking_history": 0,
        "HbA1c_level": 5, "blood_glucose_level": 100, "gender": 1})
    assert r.status_code == 500 and "passwd" not in r.text
