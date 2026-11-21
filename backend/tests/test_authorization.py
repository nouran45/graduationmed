import database
from tests.conftest import PDF, auth, png_bytes


def make_admin(email):
    database.users.update_one({"email": email}, {"$set": {"role": "admin"}})


def setup_pharmacy(client, owner_h, approve_with_admin_h=None, name="City Pharmacy"):
    ph = client.post("/api/pharmacies", headers=owner_h, json={
        "name": name, "license_number": "LIC-1", "phone": "01000000"}).json()
    br = client.post(f"/api/pharmacies/{ph['id']}/branches", headers=owner_h, json={
        "pharmacy_id": ph["id"], "branch_name": "Main", "address": "1 Street"}).json()
    client.patch(f"/api/branches/{br['branch_id']}", headers=owner_h, json={"storefront_status": "online"})
    if approve_with_admin_h:
        client.post(f"/api/admin/pharmacies/{ph['id']}/verification", headers=approve_with_admin_h,
                    json={"status": "approved"})
    return ph["id"], br["branch_id"]


def full_setup(client):
    owner_h, owner_id = auth(client, "owner@x.com")
    admin_h, _ = auth(client, "admin@x.com"); make_admin("admin@x.com")
    pid, bid = setup_pharmacy(client, owner_h, admin_h)
    return owner_h, owner_id, admin_h, pid, bid


# ---------------- prescriptions: the original Critical finding ----------------
def test_prescription_endpoints_require_authentication(client):
    for method, url in [("post", "/api/prescriptions"), ("get", "/api/prescriptions/x"),
                        ("get", "/api/prescriptions/pharmacy/queue"),
                        ("get", "/api/prescriptions/pharmacy/x"),
                        ("post", "/api/prescriptions/x/review")]:
        r = getattr(client, method)(url, headers={"X-Patient-ID": "p", "X-Actor-ID": "a", "X-Branch-ID": "b"})
        assert r.status_code == 401, (method, url, r.status_code)


def upload(client, h, bid, data=None, name="rx.png"):
    return client.post("/api/prescriptions", headers=h, data={"branch_id": bid},
                       files={"file": (name, data or png_bytes(), "image/png")})


def test_patient_identity_comes_from_session_not_header(client):
    owner_h, _, _, pid, bid = full_setup(client)
    pa, a_id = auth(client, "pa@x.com")
    r = client.post("/api/prescriptions", headers={**pa, "X-Patient-ID": "victim"},
                    data={"branch_id": bid}, files={"file": ("rx.png", png_bytes(), "image/png")})
    assert r.status_code == 201
    assert r.json()["patient_id"] == a_id


def test_bola_other_patient_cannot_read_prescription(client):
    owner_h, _, _, pid, bid = full_setup(client)
    pa, _ = auth(client, "pa@x.com"); pb, _ = auth(client, "pb@x.com")
    rx = upload(client, pa, bid).json()["prescription_id"]
    assert client.get(f"/api/prescriptions/{rx}", headers=pa).status_code == 200
    r = client.get(f"/api/prescriptions/{rx}", headers={**pb, "X-Patient-ID": "whatever"})
    assert r.status_code == 404                       # no existence oracle
    assert client.get("/api/prescriptions/doesnotexist", headers=pb).status_code == 404


def test_upload_rejects_unavailable_branch(client):
    pa, _ = auth(client, "pa@x.com")
    assert upload(client, pa, "br_nonexistent").status_code == 400
    # existing but not approved/online
    owner_h, _ = auth(client, "owner@x.com")
    _, bid = setup_pharmacy(client, owner_h)          # pending approval
    assert upload(client, pa, bid).status_code == 400


def test_upload_validates_content_not_client_claims(client):
    owner_h, _, _, pid, bid = full_setup(client)
    pa, _ = auth(client, "pa@x.com")
    r = client.post("/api/prescriptions", headers=pa, data={"branch_id": bid},
                    files={"file": ("rx.png", b"<html><script>alert(1)</script></html>", "image/png")})
    assert r.status_code == 400
    assert upload(client, pa, bid, data=PDF, name="rx.pdf").status_code == 201
    big = b"%PDF-" + b"0" * (11 * 1024 * 1024)
    assert upload(client, pa, bid, data=big, name="big.pdf").status_code == 413


def test_stored_file_name_is_server_generated(client, tmp_path):
    owner_h, _, _, pid, bid = full_setup(client)
    pa, _ = auth(client, "pa@x.com")
    r = upload(client, pa, bid, name="../../etc/evil.php")
    assert r.status_code == 201
    names = [p.name for p in tmp_path.iterdir()]
    assert names and all(n.startswith("prescription_") and n.endswith(".png") for n in names)
    assert r.json()["file"]["original_name"] == "evil.php"


# ---------------- pharmacy staff / branch scoping ----------------
def test_patient_cannot_use_pharmacy_queue_or_forge_branch(client):
    owner_h, _, _, pid, bid = full_setup(client)
    pa, _ = auth(client, "pa@x.com")
    for h in (pa, {**pa, "X-Branch-ID": bid}):
        assert client.get("/api/prescriptions/pharmacy/queue", headers=h).status_code == 403


def test_pharmacist_flow_and_cross_branch_isolation(client):
    owner_h, owner_id, admin_h, pid, bid = full_setup(client)
    # second, unrelated pharmacy
    o2_h, _ = auth(client, "owner2@x.com")
    pid2, bid2 = setup_pharmacy(client, o2_h, admin_h, name="Other")
    # staff
    ph_h, ph_id = auth(client, "pharm@x.com")
    r = client.post(f"/api/pharmacies/{pid}/staff", headers=owner_h,
                    json={"email": "pharm@x.com", "staff_role": "pharmacist", "branch_ids": [bid]})
    assert r.status_code == 201
    pa, _ = auth(client, "pa@x.com")
    rx = upload(client, pa, bid).json()["prescription_id"]

    q = client.get("/api/prescriptions/pharmacy/queue", headers=ph_h)
    assert q.status_code == 200 and len(q.json()) == 1

    # forging the other branch fails, X-Actor-ID is ignored
    bad = client.get("/api/prescriptions/pharmacy/queue", headers={**ph_h, "X-Branch-ID": bid2})
    assert bad.status_code == 403
    # owner2 legitimately works at ANOTHER branch: that branch simply has no such prescription
    assert client.get(f"/api/prescriptions/pharmacy/{rx}", headers=o2_h).status_code == 404

    rev = client.post(f"/api/prescriptions/{rx}/review", headers={**ph_h, "X-Actor-ID": "someone-else"},
                      json={"decision": "approve", "reviewed_items": [
                          {"line_id": "line-001", "confirmed_name": "Amoxicillin"}]})
    assert rev.status_code == 200 and rev.json()["reviewed_by"] == ph_id


def test_inventory_requires_membership_and_records_real_actor(client):
    owner_h, owner_id, admin_h, pid, bid = full_setup(client)
    pa, _ = auth(client, "pa@x.com")
    assert client.get("/api/inventory", headers=pa).status_code == 403
    assert client.get("/api/inventory").status_code == 401

    body = {"product_id": "P1", "branch_id": bid, "physical_quantity": 10, "price": 5.0}
    r = client.post("/api/inventory", headers={**owner_h, "X-Actor-ID": "forged"}, json=body)
    assert r.status_code == 201
    mv = database.stock_movements_collection.find_one({})
    assert mv["actor"] == owner_id

    # pharmacist role may read but not write
    ph_h, _ = auth(client, "pharm@x.com")
    client.post(f"/api/pharmacies/{pid}/staff", headers=owner_h,
                json={"email": "pharm@x.com", "staff_role": "pharmacist"})
    assert client.get("/api/inventory", headers=ph_h).status_code == 200
    inv_id = r.json()["inventory_id"]
    assert client.patch(f"/api/inventory/{inv_id}/quantity", headers=ph_h,
                        json={"physical_quantity": 0}).status_code == 403

    # creating stock for ANOTHER branch is refused
    o2_h, _ = auth(client, "owner2@x.com")
    pid2, bid2 = setup_pharmacy(client, o2_h, admin_h, name="Other")
    r = client.post("/api/inventory", headers=owner_h, json={**body, "branch_id": bid2})
    assert r.status_code == 403
    assert client.get("/api/inventory", headers={**owner_h, "X-Branch-ID": bid2}).status_code == 403


def test_multi_branch_staff_must_choose(client):
    owner_h, _, _, pid, bid = full_setup(client)
    client.post(f"/api/pharmacies/{pid}/branches", headers=owner_h, json={
        "pharmacy_id": pid, "branch_name": "Second", "address": "2 Street"})
    assert client.get("/api/inventory", headers=owner_h).status_code == 400
    assert client.get("/api/inventory", headers={**owner_h, "X-Branch-ID": bid}).status_code == 200
    assert len(client.get("/api/me/branches", headers=owner_h).json()) == 2


# ---------------- pharmacy admin ----------------
def test_pharmacy_admin_endpoints_are_protected(client):
    owner_h, _, admin_h, pid, bid = full_setup(client)
    assert client.get("/api/admin/pharmacies/pending").status_code == 401
    assert client.get("/api/admin/pharmacies/pending", headers=owner_h).status_code == 403
    assert client.post(f"/api/admin/pharmacies/{pid}/verification", headers=owner_h,
                       json={"status": "approved"}).status_code == 403
    assert client.get("/api/admin/pharmacies/pending", headers=admin_h).status_code == 200


def test_user_cannot_edit_someone_elses_pharmacy(client):
    owner_h, _, _, pid, bid = full_setup(client)
    mallory, _ = auth(client, "mallory@x.com")
    assert client.get(f"/api/pharmacies/{pid}", headers=mallory).status_code == 403
    assert client.patch(f"/api/pharmacies/{pid}", headers=mallory, json={"name": "Pwned"}).status_code == 403
    assert client.patch(f"/api/branches/{bid}", headers=mallory, json={"storefront_status": "offline"}).status_code == 403
    assert client.post(f"/api/pharmacies/{pid}/staff", headers=mallory,
                       json={"email": "mallory@x.com", "staff_role": "owner"}).status_code == 403
    assert client.post(f"/api/pharmacies/{pid}/verification", headers=mallory).status_code == 403
    assert client.get("/api/branches/br_nope", headers=mallory).status_code == 403   # same as not-yours


def test_public_branches_visible_without_login_but_only_approved(client):
    owner_h, _, admin_h, pid, bid = full_setup(client)
    o2, _ = auth(client, "o2@x.com")
    setup_pharmacy(client, o2, None, name="Unapproved")
    r = client.get("/api/branches/public")
    assert r.status_code == 200 and [b["branch_id"] for b in r.json()] == [bid]


def test_last_owner_cannot_be_removed_and_revoked_staff_lose_access(client):
    owner_h, owner_id, _, pid, bid = full_setup(client)
    assert client.delete(f"/api/pharmacies/{pid}/staff/{owner_id}", headers=owner_h).status_code == 409
    ph_h, ph_id = auth(client, "pharm@x.com")
    client.post(f"/api/pharmacies/{pid}/staff", headers=owner_h,
                json={"email": "pharm@x.com", "staff_role": "pharmacist"})
    assert client.get("/api/prescriptions/pharmacy/queue", headers=ph_h).status_code == 200
    client.delete(f"/api/pharmacies/{pid}/staff/{ph_id}", headers=owner_h)
    assert client.get("/api/prescriptions/pharmacy/queue", headers=ph_h).status_code == 403


def test_grant_staff_rejects_foreign_branch_ids(client):
    owner_h, _, admin_h, pid, bid = full_setup(client)
    o2, _ = auth(client, "o2@x.com")
    _, bid2 = setup_pharmacy(client, o2, admin_h, name="Other")
    auth(client, "pharm@x.com")
    r = client.post(f"/api/pharmacies/{pid}/staff", headers=owner_h,
                    json={"email": "pharm@x.com", "staff_role": "pharmacist", "branch_ids": [bid2]})
    assert r.status_code == 400
