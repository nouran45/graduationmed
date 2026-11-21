"""
Operator tool. There was previously NO way to create an admin or give someone
a role other than editing MongoDB by hand.

    python -m scripts.admin_cli create-user  you@x.com --role admin --first Ada --last Admin
    python -m scripts.admin_cli set-role     you@x.com admin
    python -m scripts.admin_cli set-password you@x.com          (revokes all sessions)
    python -m scripts.admin_cli disable      you@x.com
    python -m scripts.admin_cli enable       you@x.com

Passwords are always prompted for (never passed on the command line, so they
do not land in shell history).
"""
import argparse
import getpass
import sys

from database import users
from models import UserInDB
from security.passwords import hash_password, password_policy_errors
from security.sessions import revoke_all_user_sessions

ROLES = ("patient", "admin")


def _ask_password(email: str) -> str:
    while True:
        a = getpass.getpass("Password: ")
        errs = password_policy_errors(a, email)
        if errs:
            print(" ".join(errs)); continue
        if a != getpass.getpass("Repeat:   "):
            print("Does not match."); continue
        return a


def _user(email):
    u = users.find_one({"email": email.strip().lower()})
    if not u:
        sys.exit(f"No such user: {email}")
    return u


def main() -> None:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("create-user"); c.add_argument("email"); c.add_argument("--role", choices=ROLES, default="patient")
    c.add_argument("--first", default="Admin"); c.add_argument("--last", default="User")
    r = sub.add_parser("set-role"); r.add_argument("email"); r.add_argument("role", choices=ROLES)
    for name in ("set-password", "disable", "enable"):
        sub.add_parser(name).add_argument("email")
    a = ap.parse_args()
    email = a.email.strip().lower()

    if a.cmd == "create-user":
        if users.find_one({"email": email}):
            sys.exit("User already exists.")
        doc = UserInDB(firstName=a.first, lastName=a.last, email=email,
                       hashed_password=hash_password(_ask_password(email)), role=a.role).model_dump()
        users.insert_one(doc); print("created", email, a.role)
    elif a.cmd == "set-role":
        u = _user(email); users.update_one({"_id": u["_id"]}, {"$set": {"role": a.role}})
        revoke_all_user_sessions(u["_id"], "role_changed"); print("role set; sessions revoked")
    elif a.cmd == "set-password":
        u = _user(email)
        users.update_one({"_id": u["_id"]}, {"$set": {"hashed_password": hash_password(_ask_password(email))}})
        print("password set; sessions revoked:", revoke_all_user_sessions(u["_id"], "admin_password_reset"))
    elif a.cmd in ("disable", "enable"):
        u = _user(email); dis = a.cmd == "disable"
        users.update_one({"_id": u["_id"]}, {"$set": {"is_disabled": dis}})
        if dis: revoke_all_user_sessions(u["_id"], "account_disabled")
        print(a.cmd + "d", email)


if __name__ == "__main__":
    main()
