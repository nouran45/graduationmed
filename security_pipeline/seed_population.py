"""
Bulk synthetic population for STAGING (users, 2 pharmacies / 3 branches, staff, stock, prescriptions).

Called by staging_server.py at start-up (so it also works with the embedded database).
Idempotent: re-running does nothing if the population already exists.
"""
from __future__ import annotations

import base64
import json
from datetime import datetime, timezone

from . import common as C

PNG_1PX = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==")
N_PRODUCTS = 40


def email(alias: str) -> str:
    # lower-case: the server normalises e-mails to lower case on login
    return f"{alias}@{C.DOMAIN}".lower()


def seed(batch: str, n_patients: int = 200, n_attackers: int = 60, n_victims: int = 30, n_backlog: int = 60) -> dict:
    C.setup_signing_env()
    from database import branches_collection, pharmacies_collection, users
    from models import UserInDB
    from schemas.inventory import InventoryCreate
    from security.authorization import grant_membership
    from security.passwords import hash_password
    from services.inventory_service import create_inventory_item
    from services.prescription_service import create_prescription

    pop_path = C.batch_dir(batch) / "population.json"
    if pop_path.exists() and users.count_documents({}) > 0:
        return json.loads(pop_path.read_text())

    pw_hash = hash_password(C.PASSWORD)                         # one hash for all synthetic accounts (fast seeding)
    now = datetime.now(timezone.utc)

    def make_users(prefix: str, n: int, role: str = "patient") -> list[str]:
        docs, emails = [], []
        for i in range(n):
            e = email(f"{prefix}{i:05d}")
            docs.append(UserInDB(firstName=prefix, lastName="Synthetic", email=e, hashed_password=pw_hash, role=role).model_dump())
            emails.append(e)
        if docs:
            users.insert_many(docs)
        return emails

    pop: dict = {
        "password": C.PASSWORD, "domain": C.DOMAIN,
        "patients": make_users("p", n_patients),
        "attackers": make_users("a", n_attackers),
        "victims_accounts": make_users("v", n_victims),
        "backlog_accounts": make_users("b", n_backlog),
        "ghosts": [email(f"ghost{i:05d}") for i in range(200)],          # never registered
        "staff": {"pharmacist": [], "inventory": [], "owner": [], "admin": []},
        "branches": {}, "pharmacies": {}, "products": {}, "victims": [],
    }

    # ---- pharmacies / branches ------------------------------------------------
    layout = {"A": ["A1", "A2"], "B": ["B1"]}
    ids = {}
    for ph, branches in layout.items():
        pid = f"ph_stg_{ph}"
        pharmacies_collection.insert_one({
            "id": pid, "name": f"Staging Pharmacy {ph}", "license_number": f"STG-{ph}", "phone": "0000000",
            "email": None, "verification_status": "approved", "owner_user_id": "", "created_at": now, "updated_at": now})
        pop["pharmacies"][ph] = pid
        for b in branches:
            bid = f"br_stg_{b}"
            branches_collection.insert_one({
                "branch_id": bid, "pharmacy_id": pid, "branch_name": f"Staging {b}", "address": f"{b} Test Street",
                "phone": None, "latitude": None, "longitude": None, "storefront_status": "online",
                "accepting_reservations": True, "pickup_enabled": True, "delivery_enabled": False,
                "created_at": now, "updated_at": now})
            pop["branches"][b] = bid
            ids[b] = (pid, bid)

    def staff(alias: str, role: str, pharmacy: str, branch_ids):
        e = email(alias)
        users.insert_one(UserInDB(firstName=alias, lastName="Staff", email=e, hashed_password=pw_hash, role="patient").model_dump())
        uid = users.find_one({"email": e})["_id"]
        grant_membership(user_id=uid, pharmacy_id=pharmacy, staff_role=role, branch_ids=branch_ids, granted_by=uid)
        return e

    for ph, branches in layout.items():
        pid = pop["pharmacies"][ph]
        pop["staff"]["owner"].append({"email": staff(f"owner{ph}", "owner", pid, None), "pharmacy": ph, "branch_id": None})
        for b in branches:
            bid = pop["branches"][b]
            for k in range(2):
                pop["staff"]["pharmacist"].append({"email": staff(f"pharm{b}{k}", "pharmacist", pid, [bid]), "branch": b, "branch_id": bid})
            pop["staff"]["inventory"].append({"email": staff(f"inv{b}", "inventory", pid, [bid]), "branch": b, "branch_id": bid})
    users.insert_one(UserInDB(firstName="admin", lastName="Staff", email=email("admin0"), hashed_password=pw_hash, role="admin").model_dump())
    pop["staff"]["admin"].append({"email": email("admin0")})

    # ---- stock -----------------------------------------------------------------
    for b, (pid, bid) in ids.items():
        pop["products"][bid] = [f"PRD{j:03d}" for j in range(N_PRODUCTS)]
        for j, product in enumerate(pop["products"][bid]):
            create_inventory_item(InventoryCreate(product_id=product, branch_id=bid, physical_quantity=50 + j, price=5.0 + j, reorder_level=5), "seed")

    # ---- prescriptions: victims (BOLA targets) + a backlog for the pharmacists --------
    def rx(account_email: str, branch_id: str) -> str:
        uid = users.find_one({"email": account_email})["_id"]
        return create_prescription(patient_id=str(uid), branch_id=branch_id, filename="seed.png", file_bytes=PNG_1PX)["prescription_id"]

    a_branches = [pop["branches"][k] for k in ("A1", "A2", "B1")]
    for i, e in enumerate(pop["victims_accounts"]):
        bid = a_branches[i % 3]
        pop["victims"].append({"email": e, "rx_id": rx(e, bid), "branch_id": bid})
    for i, e in enumerate(pop["backlog_accounts"]):
        rx(e, a_branches[i % 3])

    pop_path.write_text(json.dumps(pop, indent=1))
    return pop
