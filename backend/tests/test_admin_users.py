"""Admin user & role management."""
import json

import database
from tests.conftest import PASSWORD, auth, last_request_events, login, register, stored_events, types
from tests.test_authorization import full_setup, make_admin

NEW_PW = "Brand-New-Account-7"


def admin_headers(client, email="boss@x.com"):
    h, _ = auth(client, email)
    make_admin(email)
    return h


def body(email, role="patient", staff=None, **kw):
    b = {"firstName": "Ada", "lastName": "Lovelace", "email": email, "password": NEW_PW, "role": role}
    if staff is not None:
        b["staff"] = staff
    b.update(kw)
    return b


def test_only_admins_can_manage_users(client):
    assert client.post("/api/admin/users", json=body("n@x.com")).status_code == 401
    patient, _ = auth(client, "p@x.com")
    r = client.post("/api/admin/users", headers=patient, json=body("n@x.com", role="admin"))
    assert r.status_code == 403 and "admin.access.denied" in types(last_request_events(r))
    assert client.get("/api/admin/pharmacies", headers=patient).status_code == 403
    assert database.users.find_one({"email": "n@x.com"}) is None


def test_admin_creates_patient_and_admin_accounts(client):
    admin = admin_headers(client)
    r = client.post("/api/admin/users", headers=admin, json=body("Pat@X.com"))
    assert r.status_code == 201 and r.json()["role"] == "patient" and r.json()["email"] == "pat@x.com"
    assert login(client, "pat@x.com", NEW_PW).json()["user"]["role"] == "patient"

    r = client.post("/api/admin/users", headers=admin, json=body("admin2@x.com", role="admin"))
    assert r.status_code == 201
    h2 = {"Authorization": "Bearer " + login(client, "admin2@x.com", NEW_PW).json()["access_token"]}
    assert client.get("/users", headers=h2).status_code == 200

    stored = database.users.find_one({"email": "admin2@x.com"})
    assert "password" not in stored and stored["hashed_password"].startswith("$2")


def test_admin_creates_pharmacy_staff(client):
    owner_h, _, admin, pid, bid = full_setup(client)
    staff = {"pharmacy_id": pid, "staff_role": "pharmacist", "branch_ids": [bid]}
    r = client.post("/api/admin/users", headers=admin, json=body("ph@x.com", staff=staff))
    assert r.status_code == 201
    assert r.json()["memberships"] == [{"pharmacy_id": pid, "staff_role": "pharmacist", "branch_ids": [bid]}]
    ph = {"Authorization": "Bearer " + login(client, "ph@x.com", NEW_PW).json()["access_token"]}
    assert client.get("/api/prescriptions/pharmacy/queue", headers=ph).status_code == 200
    assert client.get("/api/inventory", headers=ph).status_code == 200            # pharmacist may read stock
    listing = client.get("/api/admin/pharmacies", headers=admin).json()
    assert listing[0]["pharmacy_id"] == pid and listing[0]["branches"][0]["branch_id"] == bid


def test_create_validation(client):
    owner_h, _, admin, pid, bid = full_setup(client)
    assert client.post("/api/admin/users", headers=admin, json=body("a@x.com", password="short")).status_code == 400
    assert client.post("/api/admin/users", headers=admin, json=body("a@x.com", role="superuser")).status_code == 422
    assert client.post("/api/admin/users", headers=admin, json=body("a@x.com", is_disabled=False)).status_code == 422
    assert client.post("/api/admin/users", headers=admin, json=body("owner@x.com")).status_code == 400          # exists
    r = client.post("/api/admin/users", headers=admin,
                    json=body("b@x.com", role="admin", staff={"pharmacy_id": pid, "staff_role": "owner"}))
    assert r.status_code == 400 and "admin.user.rejected" in types(last_request_events(r))
    assert client.post("/api/admin/users", headers=admin,
                       json=body("c@x.com", staff={"pharmacy_id": "ph_nope", "staff_role": "owner"})).status_code == 400
    assert client.post("/api/admin/users", headers=admin,
                       json=body("d@x.com", staff={"pharmacy_id": pid, "staff_role": "owner", "branch_ids": ["br_other"]})).status_code == 400
    assert database.users.count_documents({"email": {"$in": ["a@x.com", "b@x.com", "c@x.com", "d@x.com"]}}) == 0


def test_role_change_revokes_sessions_and_protects_last_admin(client):
    admin = admin_headers(client)
    patient, pid_ = auth(client, "p@x.com")

    r = client.patch(f"/api/admin/users/{pid_}/role", headers=admin, json={"role": "admin"})
    assert r.status_code == 200 and r.json()["changed"] and r.json()["sessions_revoked"] == 1
    assert client.get("/users", headers=patient).status_code == 401                  # old session ended
    new_h = {"Authorization": "Bearer " + login(client, "p@x.com").json()["access_token"]}
    assert client.get("/users", headers=new_h).status_code == 200                     # new role after re-login

    boss_id = database.users.find_one({"email": "boss@x.com"})["_id"]
    assert client.patch(f"/api/admin/users/{boss_id}/role", headers=new_h, json={"role": "patient"}).status_code == 200
    # p@x.com is now the only admin: it cannot demote itself
    r = client.patch(f"/api/admin/users/{pid_}/role", headers=new_h, json={"role": "patient"})
    assert r.status_code == 409 and "admin.user.rejected" in types(last_request_events(r))

    assert client.patch("/api/admin/users/not-an-id/role", headers=new_h, json={"role": "admin"}).status_code == 404
    assert client.patch(f"/api/admin/users/{pid_}/role", headers=new_h, json={"role": "owner"}).status_code == 422


def test_separation_of_duties(client):
    owner_h, _, admin, pid, bid = full_setup(client)
    staff_h, staff_id = auth(client, "staff@x.com")
    client.post(f"/api/pharmacies/{pid}/staff", headers=owner_h, json={"email": "staff@x.com", "staff_role": "pharmacist"})
    assert client.patch(f"/api/admin/users/{staff_id}/role", headers=admin, json={"role": "admin"}).status_code == 409
    # an existing admin cannot be granted pharmacy staff access either
    r = client.post(f"/api/pharmacies/{pid}/staff", headers=admin, json={"email": "admin@x.com", "staff_role": "owner"})
    assert r.status_code == 400


def test_user_list_shows_roles_and_memberships(client):
    owner_h, owner_id, admin, pid, bid = full_setup(client)
    rows = {u["email"]: u for u in client.get("/users", headers=admin).json()}
    assert rows["admin@x.com"]["role"] == "admin"
    assert rows["owner@x.com"]["memberships"][0]["staff_role"] == "owner"
    assert rows["owner@x.com"]["isDisabled"] is False


def test_events_record_the_change_without_secrets(client):
    admin = admin_headers(client)
    client.post("/api/admin/users", headers=admin, json=body("new@x.com", role="admin"))
    ev = [e for e in stored_events() if e["event_type"] == "admin.user.created"][0]
    assert ev["details"] == {"platform_role": "admin"} and ev["subject_id"].startswith("acct_")
    dump = json.dumps(stored_events(), default=str)
    assert NEW_PW not in dump and "new@x.com" not in dump and PASSWORD not in dump


def test_self_registration_still_cannot_choose_a_role(client):
    r = client.post("/register", json={"firstName": "a", "lastName": "b", "email": "z@x.com", "password": PASSWORD,
                                       "confirmPassword": PASSWORD, "role": "admin"})
    assert r.status_code == 422
    register(client, "z@x.com")
    assert database.users.find_one({"email": "z@x.com"})["role"] == "patient"
