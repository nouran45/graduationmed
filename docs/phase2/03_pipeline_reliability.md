# Pipeline reliability (plan step 2.6)

```
request ──> SecurityLoggingMiddleware ──> events built in memory (RequestContext)
                                              │ after the response status is known
                                              v
                                   EventSink.emit()  — O(1), never raises, never touches the network
                       ┌──────────────────────┴───────────────────────┐
                 queue has room                                  queue full
                       v                                              v
            bounded queue (10 000)                          spill file (durable, JSON lines)
                       v  writer thread, batches of ≤100, insert_many(ordered=False)
          ┌────────────┼───────────────────────────────┐
        stored     duplicate event_id            3 retries failed
     security_events   → counted, ignored                 v
   (medicheck_security)                          spill file ── replayed when the DB answers again
```

| Requirement | How it is met | Test |
|---|---|---|
| Inference never waits for security storage | `emit()` only does `queue.put_nowait`; the database write happens on a background thread | `test_emit_never_waits_for_a_slow_database_and_loses_nothing`, `test_emit_overhead_is_small` |
| Durable storage | MongoDB collection `medicheck_security.security_events`; indexes created at start-up | `test_app_with_the_async_sink_stores_everything` |
| No loss during a database outage or burst | queue overflow and failed writes go to a spill file; replayed automatically (and at start-up) | `test_database_outage_spills_then_replays_exactly_once`, `test_events_left_in_the_spill_file_are_replayed_on_start` |
| Duplicate delivery detected | unique index on `event_id`; duplicates are counted, not stored twice; makes replay idempotent | `test_duplicate_delivery_is_detected_by_event_id` |
| Logging can never break a request | every step is wrapped; failures only reach the server log | `test_logging_failure_never_breaks_a_request`, `test_emit_never_raises_even_for_garbage` |
| Clients cannot submit audit records | no write route; client headers are never copied; request ids are server-made | `test_clients_cannot_forge_or_submit_events` |
| Tampering is detectable | HMAC signature per event, verified by the admin API (`sig_valid`) and `show_events --verify` | `test_signatures_detect_tampering` |

## When events ARE lost (be honest in the defence)
1. The spill file reaches `SECURITY_SPILL_MAX_BYTES` (50 MB) while MongoDB is still down → further events are dropped and counted (`dropped`).
2. The process is killed while events are still in the in-memory queue (not yet written). Normal shutdown flushes (≤ 5 s).
3. On Hugging Face the default spill location is **ephemeral**: a restart while MongoDB is down loses what was spilled. Use persistent storage (`SECURITY_SPILL_PATH`) or keep the database reachable.
4. Several server processes each have their own queue/spill file (fine for correctness; `event_id` stays unique).
`GET /api/security/events/stats` shows `written, duplicates, spilled, replayed, dropped, write_failures, queued, spill_file_bytes, writer_alive`.
**Alert on `dropped > 0` and on a growing `spill_file_bytes`.**

## Configuration (`.env.example`)
`SECURITY_EVENTS_ENABLED`, `SECURITY_SINK_MODE` (`async` | `sync`), `SECURITY_EVENT_QUEUE_SIZE`, `SECURITY_EVENT_BATCH_SIZE`, `SECURITY_EVENT_FLUSH_INTERVAL`,
`SECURITY_SPILL_PATH`, `SECURITY_SPILL_MAX_BYTES`, `SECURITY_DB_NAME`, `EVENT_SIGNING_KEY`. Tests also use `SECURITY_EVENTS_STRICT=true` (unknown event types raise).

## Not verified (cannot be, without your infrastructure)
Behaviour against real Atlas (the duplicate-key error shape of `insert_many` is standard but was only exercised with mongomock), the Hugging Face proxy
(check on staging that two different clients get different `ip_hash` values — otherwise adjust `TRUSTED_PROXY_COUNT`), and real-load throughput.
