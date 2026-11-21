# Hand-off to Phase 3 (dataset generation)

## What Phase 3 can rely on
* Order events by `(timestamp, request_id, seq)`. Group into sessions by `session_id`; anonymous traffic (login attempts, scans) has no session —
  group it by `ip_hash` and, for authentication events, by `subject_id`.
* Labels must come from the **scenario runner** (it knows which accounts/time windows it attacked with), **never** from `status_code` or from
  any event field, and no scenario id is stored in an event (so it cannot leak into the features). Join runner logs to events by `actor_id`
  (the runner knows the pseudonym by calling `actor_pseudonym(user_id)` with the server key) or by time window.
* Verify `sig` before using an event; discard invalid rows.
* Export: `python -m scripts.show_events --last 100000 --jsonl events.jsonl`.

## Planned feature sources (Phase 4A) → fields
| Feature in the plan | Computed from |
|---|---|
| failed logins in 5 min | count of `auth.login.failure` by `subject_id` and by `ip_hash` |
| recent denied operations | `authorization_result == "denied"` (+ `auth.token.invalid`) per session/actor |
| request frequency | `seq == 0` records per minute per session / `ip_hash` |
| endpoint diversity | distinct `endpoint_template` per session |
| error rate | share of `status_code >= 400` |
| mean request interval | differences of `timestamp` of `seq == 0` records |
| sensitive operation count | `route_sensitivity == "high"` |
| role and operation category | `actor_role`, `staff_role`, `event_category` |
| enumeration | distinct `target_ref` per session among denied events |

GRU alphabet: `event_type` (58 symbols since the pharmacy merge; the vocabulary is saved per dataset in vocab.json) optionally combined with `outcome`; time gap from `timestamp`; status class from `status_code`.
Context rules (4C): `rule_id`, `target_relation`, `authorization_result`, `resource_type`.

## Known gaps
* **Blocked attempts only.** Phase 1 enforcement blocks every scenario, so events describe attempts. To evaluate invariants on a *successful* violation, Phase 3/4C needs a
  staging-only defect-injection switch (see `docs/phase0/04_threat_model.md`).
* No benign-fault injection yet (needed for `benign_operational_anomaly`).
* `route_sensitivity` values are initial guesses; Phase 5 should tune them.
* No retention policy / TTL on `security_events` (research data is kept). Decide before production.
* Pharmacy-portal reads of the *queue* produce authorization events but no per-record events (no record ids are logged by design).
