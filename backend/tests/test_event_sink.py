"""Event pipeline reliability (plan step 2.6): bounded queue, durable storage, duplicates, never blocking."""
import threading
import time

import mongomock
import pytest
from pymongo import ASCENDING

from security.event_schema import SecurityEvent
from security.event_sink import EventSink


def make_doc(i=0, **kw):
    return SecurityEvent(event_type="http.request", source="middleware", request_id=f"req_{i}", **kw).to_document()


@pytest.fixture()
def coll():
    c = mongomock.MongoClient()["sinktest"]["events"]
    c.create_index([("event_id", ASCENDING)], unique=True)
    return c


def wait_for(cond, timeout=5.0):
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        if cond():
            return True
        time.sleep(0.02)
    return False


def test_async_batches_are_stored(coll, tmp_path):
    sink = EventSink(coll, mode="async", batch_size=10, flush_interval=0.05, spill_path=str(tmp_path / "s.jsonl"))
    for i in range(55):
        sink.emit(make_doc(i))
    assert sink.flush(5)
    assert coll.count_documents({}) == 55
    st = sink.stats()
    assert st["written"] == 55 and st["dropped"] == 0 and st["spilled"] == 0
    sink.stop()


def test_duplicate_delivery_is_detected_by_event_id(coll, tmp_path):
    sink = EventSink(coll, mode="sync", spill_path=str(tmp_path / "s.jsonl"))
    d = make_doc(1)
    sink.emit(d); sink.emit(dict(d)); sink.emit(dict(d))
    assert coll.count_documents({"event_id": d["event_id"]}) == 1
    assert sink.stats()["duplicates"] == 2 and sink.stats()["written"] == 1


def test_emit_never_waits_for_a_slow_database_and_loses_nothing(coll, tmp_path):
    gate = threading.Event()

    class SlowCollection:
        def insert_many(self, docs, ordered=False):
            gate.wait(10)                                  # the "database" hangs
            return coll.insert_many(docs, ordered=ordered)

    sink = EventSink(SlowCollection(), mode="async", queue_size=3, batch_size=1, flush_interval=0.01,
                     spill_path=str(tmp_path / "s.jsonl"), retry_backoff=())
    docs = [make_doc(i) for i in range(40)]
    started = time.perf_counter()
    for d in docs:
        sink.emit(d)                                       # must return immediately even though storage is stuck
    assert time.perf_counter() - started < 2.0
    st = sink.stats()
    assert st["spilled"] >= 30 and st["dropped"] == 0      # overflow went to the durable spill file

    gate.set()                                             # database recovers
    assert wait_for(lambda: coll.count_documents({}) == 40)
    assert {d["event_id"] for d in docs} == {e["event_id"] for e in coll.find()}      # nothing lost, nothing duplicated
    sink.stop()


def test_database_outage_spills_then_replays_exactly_once(coll, tmp_path):
    state = {"down": True}

    class Flaky:
        def insert_many(self, docs, ordered=False):
            if state["down"]:
                raise ConnectionError("mongo down")
            return coll.insert_many(docs, ordered=ordered)

    sink = EventSink(Flaky(), mode="sync", spill_path=str(tmp_path / "s.jsonl"), retry_backoff=(0, 0))
    docs = [make_doc(i) for i in range(5)]
    for d in docs:
        sink.emit(d)                                       # must not raise
    st = sink.stats()
    assert st["spilled"] == 5 and st["write_failures"] >= 5 and st["last_error"] == "ConnectionError"
    assert coll.count_documents({}) == 0 and st["spill_file_bytes"] > 0

    state["down"] = False
    assert sink.replay_spill() == 5
    assert sink.replay_spill() == 0                        # idempotent
    assert coll.count_documents({}) == 5
    assert {e["event_id"] for e in coll.find()} == {d["event_id"] for d in docs}
    # a replayed event keeps a valid signature (timestamps survive the round-trip)
    from security.event_schema import verify_document
    assert all(verify_document(e) for e in coll.find())


def test_replay_while_database_is_still_down_keeps_the_events(coll, tmp_path):
    class Down:
        def insert_many(self, docs, ordered=False):
            raise ConnectionError("down")

    sink = EventSink(Down(), mode="sync", spill_path=str(tmp_path / "s.jsonl"), retry_backoff=())
    sink.emit(make_doc(1)); sink.emit(make_doc(2))
    assert sink.replay_spill() == 0
    assert sink.stats()["spill_file_bytes"] > 0            # still on disk for the next attempt


def test_spill_file_cap_drops_and_counts(tmp_path):
    class Down:
        def insert_many(self, docs, ordered=False):
            raise ConnectionError("down")

    sink = EventSink(Down(), mode="sync", spill_path=str(tmp_path / "s.jsonl"), spill_max_bytes=600, retry_backoff=())
    for i in range(20):
        sink.emit(make_doc(i))
    st = sink.stats()
    assert st["dropped"] > 0 and st["spilled"] + st["dropped"] == 20


def test_emit_never_raises_even_for_garbage(tmp_path):
    sink = EventSink(object(), mode="sync", spill_path=None, retry_backoff=())       # collection has no insert_many
    sink.emit({"not": "an event"})
    sink.emit(None)
    assert sink.stats()["dropped"] >= 1


def test_events_left_in_the_spill_file_are_replayed_on_start(coll, tmp_path):
    path = str(tmp_path / "s.jsonl")
    class Down:
        def insert_many(self, docs, ordered=False):
            raise ConnectionError("down")
    first = EventSink(Down(), mode="sync", spill_path=path, retry_backoff=())
    docs = [make_doc(i) for i in range(3)]
    for d in docs:
        first.emit(d)

    second = EventSink(coll, mode="async", spill_path=path, flush_interval=0.05)     # "server restart"
    second.start()
    assert wait_for(lambda: coll.count_documents({}) == 3)
    second.stop()


def test_emit_overhead_is_small(coll, tmp_path):
    sink = EventSink(coll, mode="async", queue_size=20_000, flush_interval=0.05, spill_path=str(tmp_path / "s.jsonl"))
    sink.start()
    docs = [make_doc(i) for i in range(2000)]
    t0 = time.perf_counter()
    for d in docs:
        sink.emit(d)
    per_event_us = (time.perf_counter() - t0) / len(docs) * 1e6
    assert per_event_us < 2000        # generous CI-safe bound (typically tens of microseconds)
    assert sink.flush(10) and coll.count_documents({}) == 2000
    sink.stop()
