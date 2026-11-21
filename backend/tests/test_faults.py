"""Phase 3 - staging fault injection: safe by default, honest events when active."""
import pytest

from security import faults
from tests.conftest import auth, stored_events
from tests.test_authorization import full_setup, upload


def test_faults_are_refused_outside_staging(monkeypatch):
    from security import config
    monkeypatch.setenv("STAGING_FAULT_INJECTION", "rx_read_idor")
    monkeypatch.setenv("APP_ENV", "production")
    config.get_settings.cache_clear()
    try:
        with pytest.raises(RuntimeError, match="only run in staging"):
            config.get_settings()
        monkeypatch.setenv("APP_ENV", "staging")
        monkeypatch.setenv("STAGING_FAULT_INJECTION", "nonsense")
        config.get_settings.cache_clear()
        with pytest.raises(RuntimeError, match="Unknown"):
            config.get_settings()
    finally:
        monkeypatch.delenv("STAGING_FAULT_INJECTION", raising=False)
        monkeypatch.setenv("APP_ENV", "test")
        config.get_settings.cache_clear()


def test_no_fault_by_default(client):
    owner_h, _, _, pid, bid = full_setup(client)
    pa, _ = auth(client, "pa@x.com"); pb, _ = auth(client, "pb@x.com")
    rx = upload(client, pa, bid).json()["prescription_id"]
    assert client.get(f"/api/prescriptions/{rx}", headers=pb).status_code == 404


def test_rx_read_idor_fault_is_visible_in_the_event(client, monkeypatch):
    owner_h, _, _, pid, bid = full_setup(client)
    pa, _ = auth(client, "pa@x.com"); pb, _ = auth(client, "pb@x.com")
    rx = upload(client, pa, bid).json()["prescription_id"]
    monkeypatch.setattr(faults, "fault_active", lambda name: name == "rx_read_idor")
    r = client.get(f"/api/prescriptions/{rx}", headers=pb)
    assert r.status_code == 200                                  # the violation SUCCEEDED
    ev = [e for e in stored_events(request_id=r.headers["X-Request-ID"]) if e["event_type"] == "prescription.read.allowed"][0]
    assert ev["authorization_result"] == "allowed" and ev["target_relation"] == "other_patient" and ev["rule_id"] == "RX-01"
    r2 = client.get(f"/api/prescriptions/{rx}", headers=pa)      # the legitimate owner is still recorded as "self"
    ev2 = [e for e in stored_events(request_id=r2.headers["X-Request-ID"]) if e["event_type"] == "prescription.read.allowed"][0]
    assert ev2["target_relation"] == "self"


def test_branch_hop_and_admin_bypass_faults(client, monkeypatch):
    from tests.test_authorization import setup_pharmacy
    owner_h, _, admin_h, pid, bid = full_setup(client)
    o2, _ = auth(client, "owner2@x.com")
    _, bid2 = setup_pharmacy(client, o2, admin_h, name="Other")

    assert client.get("/api/inventory", headers={**owner_h, "X-Branch-ID": bid2}).status_code == 403
    monkeypatch.setattr(faults, "fault_active", lambda name: name in ("branch_hop", "admin_bypass"))
    r = client.get("/api/inventory", headers={**owner_h, "X-Branch-ID": bid2})
    assert r.status_code == 200
    ev = [e for e in stored_events(request_id=r.headers["X-Request-ID"]) if e["event_type"] == "inventory.read.allowed"][0]
    assert ev["authorization_result"] == "allowed" and ev["target_relation"] == "not_staff_of_branch"

    pa, _ = auth(client, "plain@x.com")
    r = client.get("/users", headers=pa)
    assert r.status_code == 200
    ev = [e for e in stored_events(request_id=r.headers["X-Request-ID"]) if e["event_type"] == "admin.access.allowed"][0]
    assert ev["target_relation"] == "non_admin"
