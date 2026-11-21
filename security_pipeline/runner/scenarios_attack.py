"""
Attack scenarios. Setup steps (an attacker logging in to their OWN account) are labelled normal;
the abusive requests carry the attack class. probe=True marks requests that try to cross an
authorization boundary (a 2xx on such a request is a SUCCESSFUL violation: only possible in the fault batch).
"""
from __future__ import annotations

import base64
import json
import time
import uuid

from jose import jwt

from .. import common as C
from .sim import DIABETES, PNG, bomb_png, predict

AUTH, UA, API = "authentication_abuse", "unauthorized_access", "api_abuse"
PROTECTED = ["/history", "/users/me", "/dashboard-history", "/api/prescriptions/pharmacy/queue", "/api/inventory", "/verify-token"]


def _b64(d) -> str:
    return base64.urlsafe_b64encode(json.dumps(d).encode()).rstrip(b"=").decode()


# ------------------------------------------------------------------ authentication abuse
def auth_1(s, pop, rng, al):
    """Brute force one account (fast or slow-and-low)."""
    target = al.victim()["email"]
    slow = rng.random() < 0.4
    for _ in range(rng.randint(8, 18)):
        s.login(target, f"Guess-{rng.randint(0, 99999)}-pw", label=AUTH)
        s.pause(rng.uniform(6, 25) if slow else rng.uniform(0.15, 0.8))


def auth_2(s, pop, rng, al):
    """HELD OUT. Credential stuffing: many different accounts, one attempt each, from one address."""
    emails = al.ghosts(rng.randint(15, 35)) + rng.sample(pop["patients"], rng.randint(8, 20))
    rng.shuffle(emails)
    for e in emails:
        s.login(e, f"Spring{rng.randint(1000, 9999)}!x", label=AUTH)
        s.pause(rng.uniform(0.2, 1.0))


def auth_3(s, pop, rng, al):
    """Forged / malformed / expired tokens against protected endpoints."""
    now = int(time.time())
    for _ in range(rng.randint(12, 30)):
        kind = rng.choice(["garbage", "wrongkey", "none", "expired"])
        if kind == "garbage":
            tok = uuid.uuid4().hex + "." + uuid.uuid4().hex
        elif kind == "wrongkey":
            tok = jwt.encode({"sub": "1" * 24, "sid": "ses_x", "jti": "1", "typ": "access", "exp": now + 3600}, "wrong-key", "HS256")
        elif kind == "none":
            tok = f"{_b64({'alg': 'none', 'typ': 'JWT'})}.{_b64({'sub': '1' * 24, 'sid': 'x', 'jti': '1', 'typ': 'access', 'exp': now + 3600})}."
        else:
            tok = jwt.encode({"sub": "1" * 24, "sid": "ses_x", "jti": "1", "typ": "access", "exp": now - 60}, C.STAGING_SECRET, "HS256")
        s.get(rng.choice(PROTECTED), tok, label=AUTH)
        s.pause(rng.uniform(0.3, 3.0))


def auth_4(s, pop, rng, al):
    """Replay a token after the owner logged out."""
    tok = s.login(al.patient())
    if not tok:
        return
    s.get("/history", tok); s.think(4)
    s.logout(tok); s.think(6)
    t = s.child(al.new_ip())
    for _ in range(rng.randint(5, 14)):
        t.get(rng.choice(PROTECTED[:3]), tok, label=AUTH)
        t.pause(rng.uniform(0.5, 4.0))
    t.close()


# ------------------------------------------------------------------ unauthorized access
def ua_1(s, pop, rng, al):
    """BOLA / IDOR: read other patients' prescriptions (known + guessed ids)."""
    tok = s.login(al.attacker())
    if not tok:
        return
    s.get("/users/me", tok); s.think(3)
    targets = [v["rx_id"] for v in rng.sample(pop["victims"], min(len(pop["victims"]), rng.randint(3, 10)))]
    targets += [uuid.uuid4().hex for _ in range(rng.randint(0, 6))]
    rng.shuffle(targets)
    for rx in targets:
        s.get(f"/api/prescriptions/{rx}", tok, label=UA, probe=True)
        s.pause(rng.uniform(1, 6))


def ua_2(s, pop, rng, al):
    """Staff member probes branches they do not work at (X-Branch-ID hopping)."""
    role = rng.choice(["pharmacist", "inventory"])
    st = al.staff(role)
    tok = s.login(st["email"])
    if not tok:
        return
    others = [b for b in pop["branches"].values() if b != st["branch_id"]]
    path = "/api/prescriptions/pharmacy/queue" if role == "pharmacist" else "/api/inventory"
    s.get(path, tok); s.think(4)
    for _ in range(rng.randint(4, 12)):
        s.get(path, tok, headers={"X-Branch-ID": rng.choice(others)}, label=UA, probe=True)
        s.pause(rng.uniform(1, 5))
        if rng.random() < 0.3:
            s.get(path, tok); s.pause(rng.uniform(1, 4))          # legitimate own-branch request in between


def ua_3(s, pop, rng, al):
    """A patient calls admin / pharmacy-staff routes."""
    tok = s.login(al.attacker())
    if not tok:
        return
    targets = [("GET", "/users", None), ("GET", "/api/admin/pharmacies/pending", None),
               ("GET", "/api/prescriptions/pharmacy/queue", None), ("GET", "/api/inventory", None),
               ("GET", "/predict-skin-defense/health", None), ("GET", "/api/inventory/dashboard", None),
               ("POST", f"/api/admin/pharmacies/{pop['pharmacies']['A']}/verification", {"status": "approved"}),
               ("GET", "/api/security/events", None), ("GET", f"/api/pharmacies/{pop['pharmacies']['B']}/staff", None)]
    for m, p, body in rng.sample(targets, rng.randint(5, len(targets))):
        s.call(m, p, token=tok, label=UA, probe=True, **({"json": body} if body else {}))
        s.pause(rng.uniform(1, 5))


def ua_4(s, pop, rng, al):
    """HELD OUT. Enumerate ids (prescriptions, branches, pharmacies) to find valid ones."""
    tok = s.login(al.attacker())
    if not tok:
        return
    for _ in range(rng.randint(30, 60)):
        kind = rng.choice(["rx", "rxp", "branch", "pharm"])
        path = {"rx": f"/api/prescriptions/{uuid.uuid4().hex}", "rxp": f"/api/prescriptions/pharmacy/{uuid.uuid4().hex}",
                "branch": f"/api/branches/br_stg_{rng.choice('ABCD')}{rng.randint(1, 4)}",
                "pharm": f"/api/pharmacies/ph_stg_{rng.choice('ABCDE')}"}[kind]
        s.get(path, tok, label=UA, probe=True)
        s.pause(rng.uniform(0.2, 1.5))


def cs_1(s, pop, rng, al):
    """HELD OUT. A valid stolen session is used from another address in an unusual, rapid way."""
    tok = s.login(al.patient())
    if not tok:
        return
    s.get("/users/me", tok); s.think(5)
    s.get("/history", tok); s.think(8)
    t = s.child(al.new_ip())
    for p in ["/users/me", "/history", "/dashboard-history", "/api/me/branches"]:
        t.get(p, tok, label=UA); t.pause(rng.uniform(0.2, 1.0))
    t.get(f"/api/prescriptions/{rng.choice(pop['victims'])['rx_id']}", tok, label=UA, probe=True)
    for _ in range(rng.randint(10, 18)):
        predict(t, tok, rng, label=UA, which=("/predict-diabetes", DIABETES)); t.pause(rng.uniform(0.2, 0.9))
    for _ in range(2):
        t.post("/auth/change-password", tok, json={"current_password": "Wrong-guess-1", "new_password": "Another-Strong-Pw-1"}, label=UA)
        t.pause(rng.uniform(0.5, 1.5))
    t.post("/logout-all", tok, label=UA)
    t.close()


# ------------------------------------------------------------------ API abuse
def api_1(s, pop, rng, al):
    """Inference flood far above the per-user quota."""
    tok = s.login(al.attacker())
    if not tok:
        return
    for _ in range(rng.randint(40, 90)):
        predict(s, tok, rng, label=API, which=("/predict-diabetes", DIABETES))
        s.pause(rng.uniform(0.1, 0.6))


def api_2(s, pop, rng, al):
    """Fake, corrupt, oversized and decompression-bomb uploads."""
    tok = s.login(al.attacker())
    if not tok:
        return
    branch = pop["branches"]["A1"]
    big_used = 0
    bomb = bomb_png()
    for _ in range(rng.randint(10, 20)):
        kind = rng.choice(["fake", "html", "trunc", "big", "bomb"])
        if kind == "big" and big_used >= 2:
            kind = "fake"
        data, ctype = {"fake": (b"MZ\x90\x00" + b"\x00" * 200, "image/png"), "html": (b"<html><script>1</script></html>", "image/png"),
                       "trunc": (PNG[:20], "image/png"), "bomb": (bomb, "image/png"),
                       "big": (b"\xff\xd8\xff" + b"\x00" * (10 * 1024 * 1024 + 4096), "image/jpeg")}[kind]
        big_used += kind == "big"
        route = rng.choice(["/predict", "/predict-fracture", "/predict-skin-defense", "/api/prescriptions"])
        if route == "/api/prescriptions":
            s.post(route, tok, data={"branch_id": branch}, files={"file": ("x.png", data, ctype)}, label=API)
        else:
            s.post(route, tok, files={"file": ("x.png", data, ctype)}, label=API)
        s.pause(rng.uniform(0.5, 3.0))


def api_3(s, pop, rng, al):
    """Registration flood from one address."""
    for _ in range(rng.randint(14, 25)):
        s.post("/register", json={"firstName": "Bot", "lastName": "Flood", "email": f"bot{uuid.uuid4().hex[:10]}@{C.DOMAIN}",
                                  "password": C.PASSWORD, "confirmPassword": C.PASSWORD}, label=API)
        s.pause(rng.uniform(0.1, 0.5))


ATTACKS = {"AUTH-1": auth_1, "AUTH-2": auth_2, "AUTH-3": auth_3, "AUTH-4": auth_4,
           "UA-1": ua_1, "UA-2": ua_2, "UA-3": ua_3, "UA-4": ua_4, "CS-1": cs_1,
           "API-1": api_1, "API-2": api_2, "API-3": api_3}
