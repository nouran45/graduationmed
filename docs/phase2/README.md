# Phase 2 — FastAPI security log collection

**Status:** implemented and tested (76 automated tests = 44 from Phase 1 + 32 new). Not yet run on your real Hugging Face / Atlas deployment.

| Document | Content |
|---|---|
| `01_event_catalogue.md` | All 58 event types (53 in Phase 2 + 5 added by the pharmacy merge), when each is emitted, rule ids, vocabularies |
| `02_schema_and_privacy.md` | Event fields, pseudonyms, what is / is not logged and why |
| `03_pipeline_reliability.md` | Queue, durable storage, duplicates, failure modes, configuration |
| `04_phase3_handoff.md` | How Phase 3 turns these events into XGBoost / GRU data; known gaps |
| `05_phase2_runbook.md` | Apply, verify, deploy |

## What was built (mapped to the plan)

| Plan step | Delivered in |
|---|---|
| 2.1 central middleware | `security/logging_middleware.py` (+ `request_context.py`) |
| 2.2 instrument authentication | `routers/auth.py`, `security/identity.py` (`get_current_principal`), `security/rate_limit.py` |
| 2.3 instrument every `/predict*` route | middleware-derived `inference.completed / rejected / failed`, `resource.rate_limited`; `model_route` for skin-defense |
| 2.4 database-sensitive operations | `security/authorization.py` (decisions), `routers/prescriptions.py`, `inventory.py`, `pharmacies.py`, `app.py` (history, users) |
| 2.5 event schema | `security/event_schema.py` |
| 2.6 protect the pipeline | `security/event_sink.py` (+ unique `event_id`, signatures, no write endpoint) |

## Not in the plan (additions, each small)
1. `routers/security_events.py` — admin-only **read** endpoints (`GET /api/security/events`, `/stats`). Needed to verify the acceptance test on a running server; reused by the Phase 7 dashboard. No write endpoint exists.
2. Event **signatures** (HMAC) — lets later phases reject rows edited or inserted directly in MongoDB.
3. `seq`, `subject_id`, `ip_hash`, `target_ref`, `staff_role`, `route_sensitivity`, `schema_version` fields (needed by Phase 3–5 features; see 02).
4. Two scripts: `phase2_acceptance_demo.py` (runs the plan's acceptance workflow over HTTP) and `show_events.py` (view / verify / export).
5. Two new rule ids (PHARM-02, ADMIN-01).
6. Session documents now store the actor/session pseudonyms (so the Phase 6 response engine can map an alert back to a session).

## Measured (sandbox, in-memory DB, so treat as an upper bound on CPU cost only)
Median latency of `POST /predict-diabetes`: 3.00 ms with events off → 3.58 ms on (≈ +0.6 ms for 2 events). With the async writer, the database round-trip is not on the request path. Real Atlas latency was **not** measured.
