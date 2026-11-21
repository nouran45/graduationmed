# Phase 2 runbook

## A. Apply to the Phase 1 directory
Use `apply_phase2.sh` from the zip (see `APPLY.md`), or follow `MANUAL_APPLY_GUIDE_PHASE2.md` file by file.

## B. Verify locally (no real database)
```bash
cd backend
python -m pytest -q                       # expect: 76 passed
python -m pytest -q tests/test_security_events.py tests/test_event_sink.py     # Phase 2 only: 31 tests
python /path/to/run_inventory.py          # (optional) route inventory: no unexpected public routes
```
Acceptance workflow on the local demo server (fake DB, real async writer thread):
```bash
python demo_server.py                              # terminal 1
python -m scripts.phase2_acceptance_demo           # terminal 2   -> every line must say PASS
```
Look at raw events: log in as `admin@synthetic.medicheck.dev` and call `GET /api/security/events?limit=20`.

## C. Deploy (after Phase 1 is deployed)
1. Add to the Space variables (names in `.env.example`): at least `SECURITY_DB_NAME=medicheck_security`. Defaults are safe; `SECURITY_SINK_MODE` must stay `async`.
2. Redeploy. The start-up log must show *MongoDB connection established*, no `INDEX FAILED` lines, and the database `medicheck_security` appears in Atlas after the first request.
3. **Staging**, not production: run `python -m scripts.phase2_acceptance_demo --base-url https://<staging>.hf.space --password '<SEED_PASSWORD>'` → all PASS.
4. On staging also check: `GET /api/security/events/stats` shows `dropped: 0`; two different devices produce different `ip_hash` values; `python -m scripts.show_events --verify` reports 0 invalid signatures.
5. Atlas: restrict who can read `medicheck_security` (separate database user) — the events describe security-relevant behaviour of your users.
