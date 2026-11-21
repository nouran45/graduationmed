"""
Phase 1 data migration.  DRY-RUN BY DEFAULT.

    python -m scripts.migrate_phase1            # report only
    python -m scripts.migrate_phase1 --apply    # perform changes

What it does
  1. Removes the plaintext `password` / `confirmPassword` fields that the old
     /register stored in `users`.
  2. Reports users that have no bcrypt hash (they cannot log in).
  3. Lower-cases e-mail addresses; REPORTS (never auto-merges) duplicates.
  4. Ensures every user has a role ("patient" by default).
  5. Reports prescriptions whose patient_id is not a real user id
     (created with the old demo header, e.g. "demo-patient-001").
  6. Creates the indexes Phase 1 relies on.

AFTER running with --apply you must ALSO (a script cannot do this for you):
  * rotate the MongoDB Atlas database user's password
  * rotate SECRET_KEY (invalidates every old token)
  * assume plaintext passwords may survive in Atlas backups / snapshots / logs;
    tell real users to choose new passwords (change-password endpoint)
"""
import argparse
from collections import defaultdict

from database import db, prescriptions_collection, users
from security.indexes import ensure_indexes


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()
    mode = "APPLY" if args.apply else "DRY-RUN"
    print(f"== Phase 1 migration [{mode}] on database '{db.name}' ==")

    # 1 ---------------------------------------------------------------------
    plain = users.count_documents({"$or": [{"password": {"$exists": True}},
                                           {"confirmPassword": {"$exists": True}}]})
    print(f"[1] users storing a plaintext password field: {plain}")
    if args.apply and plain:
        r = users.update_many({}, {"$unset": {"password": "", "confirmPassword": ""}})
        print(f"    removed from {r.modified_count} documents")

    # 2 ---------------------------------------------------------------------
    nohash = list(users.find({"hashed_password": {"$exists": False}}, {"email": 1}))
    print(f"[2] users WITHOUT hashed_password: {len(nohash)}")
    for u in nohash:
        print("    -", u.get("email"), "(cannot log in; delete or set a password via admin_cli)")

    # 3 ---------------------------------------------------------------------
    groups = defaultdict(list)
    for u in users.find({}, {"email": 1}):
        groups[(u.get("email") or "").strip().lower()].append(u)
    dups = {e: v for e, v in groups.items() if len(v) > 1}
    to_fix = [u for e, v in groups.items() if len(v) == 1 for u in v
              if u.get("email") != e]
    print(f"[3] e-mails needing lower-casing: {len(to_fix)}; duplicate accounts: {len(dups)}")
    for e, v in dups.items():
        print(f"    DUPLICATE {e}: ids {[str(x['_id']) for x in v]}  -> resolve manually, then re-run")
    if args.apply:
        for u in to_fix:
            users.update_one({"_id": u["_id"]}, {"$set": {"email": u["email"].strip().lower()}})

    # 4 ---------------------------------------------------------------------
    norole = users.count_documents({"role": {"$exists": False}})
    print(f"[4] users without a role: {norole}")
    if args.apply and norole:
        users.update_many({"role": {"$exists": False}}, {"$set": {"role": "patient"}})

    # 5 ---------------------------------------------------------------------
    real_ids = {str(u["_id"]) for u in users.find({}, {"_id": 1})}
    orphans = [p["prescription_id"] for p in prescriptions_collection.find({}, {"patient_id": 1, "prescription_id": 1})
               if p.get("patient_id") not in real_ids]
    print(f"[5] prescriptions whose patient_id is not a real user id: {len(orphans)}")
    print("    (legacy demo data; nobody can read these any more. Delete them on staging.)")

    # 6 ---------------------------------------------------------------------
    if args.apply:
        problems = ensure_indexes()
        print(f"[6] indexes created; problems: {problems or 'none'}")
    else:
        print("[6] indexes: skipped in dry-run")

    if dups:
        print("\n!! Duplicates present: the unique e-mail index cannot be built until they are resolved.")
        return 1
    print("\nDone." + ("" if args.apply else "  Re-run with --apply to make changes."))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
