"""
Create SYNTHETIC users + one approved pharmacy/branch for STAGING.
Phase 3's scenario generator logs in as these accounts.

    APP_ENV=staging SEED_PASSWORD='<strong password>' \
        python -m scripts.seed_staging --i-know-this-is-staging

Refuses to run unless APP_ENV is staging/development. NEVER point this at the
database holding real patients.
"""
import argparse
import os
import sys
from datetime import datetime, timezone

from database import branches_collection, db, pharmacies_collection, users
from models import UserInDB
from security.authorization import grant_membership
from security.passwords import hash_password, password_policy_errors

ACCOUNTS = [
    ("patient1@synthetic.medicheck.dev", "patient"),
    ("patient2@synthetic.medicheck.dev", "patient"),
    ("patient3@synthetic.medicheck.dev", "patient"),
    ("owner@synthetic.medicheck.dev", "patient"),
    ("pharmacist@synthetic.medicheck.dev", "patient"),
    ("inventory@synthetic.medicheck.dev", "patient"),
    ("admin@synthetic.medicheck.dev", "admin"),
]


def main() -> None:
    ap = argparse.ArgumentParser(); ap.add_argument("--i-know-this-is-staging", action="store_true")
    if not ap.parse_args().i_know_this_is_staging:
        sys.exit("Refusing: pass --i-know-this-is-staging")
    if os.getenv("APP_ENV", "").lower() not in {"staging", "development"}:
        sys.exit("Refusing: APP_ENV must be 'staging' or 'development'.")
    pw = os.getenv("SEED_PASSWORD", "")
    if password_policy_errors(pw):
        sys.exit("Set SEED_PASSWORD to a policy-compliant password.")
    print(f"Seeding database '{db.name}'")

    ids = {}
    for email, role in ACCOUNTS:
        u = users.find_one({"email": email})
        if not u:
            users.insert_one(UserInDB(firstName=email.split("@")[0], lastName="Synthetic", email=email,
                                      hashed_password=hash_password(pw), role=role).model_dump())
            u = users.find_one({"email": email})
        ids[email.split("@")[0]] = u["_id"]

    now = datetime.now(timezone.utc)
    ph = pharmacies_collection.find_one({"id": "ph_synthetic_01"})
    if not ph:
        pharmacies_collection.insert_one({
            "id": "ph_synthetic_01", "name": "Synthetic Pharmacy", "license_number": "SYN-001",
            "phone": "0000000", "email": None, "verification_status": "approved",
            "owner_user_id": str(ids["owner"]), "created_at": now, "updated_at": now})
        branches_collection.insert_one({
            "branch_id": "br_synthetic_01", "pharmacy_id": "ph_synthetic_01", "branch_name": "Synthetic Main",
            "address": "1 Test Street", "phone": None, "latitude": None, "longitude": None,
            "storefront_status": "online", "accepting_reservations": True, "pickup_enabled": True,
            "delivery_enabled": False, "created_at": now, "updated_at": now})
    for who, role in (("owner", "owner"), ("pharmacist", "pharmacist"), ("inventory", "inventory")):
        grant_membership(user_id=ids[who], pharmacy_id="ph_synthetic_01", staff_role=role,
                         branch_ids=None, granted_by=ids["admin"])
    print("Done. Accounts:", ", ".join(e for e, _ in ACCOUNTS))


if __name__ == "__main__":
    main()
