"""Normal personas (label: normal) and benign anomalies (label: benign_operational_anomaly)."""
from __future__ import annotations

import uuid

from .. import common as C
from .sim import ANEMIA, DIABETES, PNG, predict

BENIGN = "benign_operational_anomaly"
REVIEW_APPROVE = {"decision": "approve", "reviewed_items": [{"line_id": "line-001", "confirmed_name": "Amoxicillin"}]}
REVIEW_REJECT = {"decision": "reject", "review_notes": "image unreadable"}


# ------------------------------------------------------------------ patients
def n_browse(s, pop, rng, al):
    tok = s.login(al.patient())
    if not tok:
        return
    s.get("/users/me", tok); s.think(3)
    s.get("/dashboard-history", tok); s.think(4)
    s.get("/history", tok); s.think(5)
    for _ in range(rng.randint(1, 3)):
        predict(s, tok, rng); s.think(12)
        if rng.random() < 0.5:
            s.post("/save-history", tok, json={"condition": "routine check"}); s.think(3)
    s.get("/history", tok); s.think(4)
    if rng.random() < 0.7:
        s.logout(tok)


def n_rx(s, pop, rng, al):
    tok = s.login(al.patient())
    if not tok:
        return
    branches = s.get("/api/branches/public", tok).json(); s.think(5)
    branch = rng.choice(branches)["branch_id"]
    r = s.post("/api/prescriptions", tok, data={"branch_id": branch}, files={"file": ("rx.png", PNG, "image/png")})
    s.think(6)
    if r.status_code == 201:
        rid = r.json()["prescription_id"]
        for _ in range(rng.randint(1, 3)):
            s.get(f"/api/prescriptions/{rid}", tok); s.think(10)
    if rng.random() < 0.7:
        s.logout(tok)


def n_new(s, pop, rng, al):
    e = f"n{uuid.uuid4().hex[:10]}@{C.DOMAIN}"
    s.post("/register", json={"firstName": "New", "lastName": "User", "email": e,
                              "password": C.PASSWORD, "confirmPassword": C.PASSWORD}); s.think(6)
    tok = s.login(e)
    if not tok:
        return
    s.get("/verify-token", tok); s.think(3)
    predict(s, tok, rng, which=("/predict-diabetes", DIABETES)); s.think(8)
    s.logout(tok)


# ------------------------------------------------------------------ pharmacy staff
def n_pharm(s, pop, rng, al):
    tok = s.login(al.staff("pharmacist")["email"])
    if not tok:
        return
    for _ in range(rng.randint(1, 3)):
        q = s.get("/api/prescriptions/pharmacy/queue", tok).json(); s.think(8)
        for item in q[: rng.randint(0, 3)]:
            s.get(f"/api/prescriptions/pharmacy/{item['prescription_id']}", tok); s.think(15)
            s.post(f"/api/prescriptions/{item['prescription_id']}/review", tok,
                   json=REVIEW_APPROVE if rng.random() < 0.8 else REVIEW_REJECT); s.think(6)
    s.logout(tok)


def n_inv(s, pop, rng, al):
    st = al.staff("inventory")
    tok = s.login(st["email"])
    if not tok:
        return
    items = s.get("/api/inventory", tok).json(); s.think(6)
    s.get("/api/inventory/dashboard", tok); s.think(8)
    for _ in range(rng.randint(1, 4)):
        op = rng.choice(["manual", "quantity", "csv"])
        prod = rng.choice(pop["products"][st["branch_id"]])
        if op == "manual":
            s.post("/api/inventory/intake/manual", tok, json={"product_id": prod, "quantity": rng.randint(1, 20), "price": 9.5})
        elif op == "quantity" and items:
            it = rng.choice(items)
            s.patch(f"/api/inventory/{it['inventory_id']}/quantity", tok, json={"physical_quantity": rng.randint(10, 80)})
        else:
            csv_text = f"product_id,quantity,price\n{prod},{rng.randint(1, 9)},8.25\n"
            v = s.post("/api/inventory/intake/validate-csv", tok, json={"csv_text": csv_text}); s.think(5)
            if v.status_code == 200:
                s.post("/api/inventory/intake/import", tok, json={"rows": [{"product_id": prod, "quantity": 3, "price": 8.25}]})
        s.think(10)
    s.logout(tok)


def n_owner(s, pop, rng, al):
    st = al.staff("owner")
    tok = s.login(st["email"])
    if not tok:
        return
    mine = s.get("/api/me/branches", tok).json(); s.think(4)
    pid = mine[0]["pharmacy_id"]
    s.get(f"/api/pharmacies/{pid}", tok); s.think(5)
    s.get(f"/api/pharmacies/{pid}/branches", tok); s.think(5)
    s.get(f"/api/pharmacies/{pid}/staff", tok); s.think(6)
    s.get("/api/inventory/dashboard", tok, headers={"X-Branch-ID": mine[0]["branch_id"]}); s.think(5)
    s.logout(tok)


def n_admin(s, pop, rng, al):
    tok = s.login(pop["staff"]["admin"][0]["email"])
    if not tok:
        return
    s.get("/api/admin/pharmacies/pending", tok); s.think(6)
    s.get("/predict-skin-defense/health", tok); s.think(5)
    s.logout(tok)


# ------------------------------------------------------------------ benign anomalies
def b_typo(s, pop, rng, al):
    e = al.patient()
    for _ in range(rng.randint(1, 2)):
        s.login(e, "Wrong-Password-1", label=BENIGN); s.think(4)
    tok = s.login(e)
    if tok:
        s.get("/history", tok); s.think(5)
        predict(s, tok, rng); s.logout(tok)


def b_burst(s, pop, rng, al):
    tok = s.login(al.staff("pharmacist")["email"])
    if not tok:
        return
    q = s.get("/api/prescriptions/pharmacy/queue", tok).json()
    for item in q[:8]:
        s.post(f"/api/prescriptions/{item['prescription_id']}/review", tok, json=REVIEW_APPROVE, label=BENIGN); s.think(1.2)
    s.logout(tok)


def b_retry(s, pop, rng, al):
    tok = s.login(al.patient())
    if not tok:
        return
    branch = rng.choice(s.get("/api/branches/public", tok).json())["branch_id"]
    s.post("/api/prescriptions", tok, data={"branch_id": branch}, files={"file": ("rx.png", b"<html>oops</html>", "image/png")}, label=BENIGN); s.think(5)
    s.post("/api/prescriptions", tok, data={"branch_id": branch}, files={"file": ("rx.png", PNG, "image/png")}); s.think(4)
    s.logout(tok)


def b_mistake403(s, pop, rng, al):
    tok = s.login(al.patient())
    if not tok:
        return
    s.get("/history", tok); s.think(6)
    for _ in range(rng.randint(1, 2)):
        s.get("/api/prescriptions/pharmacy/queue", tok, label=BENIGN); s.think(8)
    s.get("/dashboard-history", tok); s.logout(tok)


def b_heavy(s, pop, rng, al):
    tok = s.login(al.patient())
    if not tok:
        return
    for _ in range(rng.randint(10, 16)):
        predict(s, tok, rng, label=BENIGN, which=("/predict-diabetes", DIABETES) if rng.random() < .6 else ("/predict-anemia", ANEMIA))
        s.think(2.5)
    s.logout(tok)


NORMAL = {"N-BROWSE": n_browse, "N-RX": n_rx, "N-NEW": n_new, "N-PHARM": n_pharm, "N-INV": n_inv, "N-OWNER": n_owner, "N-ADMIN": n_admin}
BENIGN_SCENARIOS = {"B-TYPO": b_typo, "B-BURST": b_burst, "B-RETRY": b_retry, "B-403": b_mistake403, "B-HEAVY": b_heavy}
