import database
from scripts import migrate_phase1
from tests.conftest import PASSWORD, login


def test_migration_removes_plaintext_and_lowercases(monkeypatch, capsys):
    database.users.insert_many([
        {"email": "Old@X.com", "hashed_password": "$2b$x", "password": "plain!", "confirmPassword": "plain!"},
        {"email": "ok@x.com", "hashed_password": "$2b$x", "role": "patient"},
    ])
    monkeypatch.setattr("sys.argv", ["m", "--apply"])
    assert migrate_phase1.main() == 0
    old = database.users.find_one({"hashed_password": "$2b$x", "email": "old@x.com"})
    assert old and "password" not in old and "confirmPassword" not in old and old["role"] == "patient"


def test_migration_reports_duplicates(monkeypatch):
    database.users.insert_many([{"email": "D@x.com", "hashed_password": "h"}, {"email": "d@x.com", "hashed_password": "h"}])
    monkeypatch.setattr("sys.argv", ["m", "--apply"])
    assert migrate_phase1.main() == 1


def test_dry_run_changes_nothing(monkeypatch):
    database.users.insert_one({"email": "a@x.com", "hashed_password": "h", "password": "p"})
    monkeypatch.setattr("sys.argv", ["m"])
    migrate_phase1.main()
    assert "password" in database.users.find_one({"email": "a@x.com"})


def test_seed_staging_and_admin_cli(monkeypatch, client):
    from scripts import seed_staging, admin_cli
    monkeypatch.setenv("APP_ENV", "staging")
    monkeypatch.setenv("SEED_PASSWORD", PASSWORD)
    monkeypatch.setattr("sys.argv", ["s", "--i-know-this-is-staging"])
    seed_staging.main()
    assert login(client, "pharmacist@synthetic.medicheck.dev").status_code == 200
    r = login(client, "pharmacist@synthetic.medicheck.dev").json()
    h = {"Authorization": "Bearer " + r["access_token"]}
    assert client.get("/api/prescriptions/pharmacy/queue", headers=h).status_code == 200

    monkeypatch.setattr("getpass.getpass", lambda *_: PASSWORD)
    monkeypatch.setattr("sys.argv", ["c", "create-user", "boss@x.com", "--role", "admin"])
    admin_cli.main()
    h2 = {"Authorization": "Bearer " + login(client, "boss@x.com").json()["access_token"]}
    assert client.get("/users", headers=h2).status_code == 200


def test_seed_refuses_in_production(monkeypatch):
    import pytest
    from scripts import seed_staging
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setattr("sys.argv", ["s", "--i-know-this-is-staging"])
    with pytest.raises(SystemExit):
        seed_staging.main()


def test_show_events_script_lists_verifies_and_exports(client, monkeypatch, capsys, tmp_path):
    import json as _json
    import database as _db
    from scripts import show_events
    from tests.conftest import auth as _auth, stored_events

    h, _ = _auth(client, "a@x.com")
    client.get("/history", headers=h)
    stored_events()                                                   # flush

    monkeypatch.setattr("sys.argv", ["s", "--last", "10", "--verify"])
    show_events.main()
    out = capsys.readouterr().out
    assert "0 with an INVALID signature" in out and "history.read.allowed" in out

    _db.security_events_collection.update_one({"event_type": "history.read.allowed"}, {"$set": {"actor_role": "admin"}})
    monkeypatch.setattr("sys.argv", ["s", "--last", "50", "--verify"])
    show_events.main()
    assert "1 with an INVALID signature" in capsys.readouterr().out

    path = str(tmp_path / "ev.jsonl")
    monkeypatch.setattr("sys.argv", ["s", "--last", "50", "--jsonl", path])
    show_events.main()
    lines = [_json.loads(l) for l in open(path)]
    assert lines and all("_id" not in l and l["timestamp"].endswith("Z") for l in lines)
