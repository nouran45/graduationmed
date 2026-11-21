"""
Reliable event sink (Phase 2, step 2.6).

Goals
-----
* Medical inference NEVER waits for security storage: emit() is O(1), does not
  touch the network, and never raises.
* Events survive MongoDB outages and bursts: if the bounded queue is full or the
  database keeps failing, events are appended to a local spill file and replayed
  later. Only if the spill file is also full are events dropped - and that is counted.
* Duplicate delivery is harmless: `event_id` has a UNIQUE index; a duplicate
  insert is recognised and counted instead of stored twice (this also makes
  spill replay idempotent).
* Nothing a client sends can reach this module: only server code calls emit().

                      emit()
                        |
          +-------------+--------------+
          | queue has room?            | queue full
          v                            v
   bounded queue ----> writer thread    spill file  (counted)
                         | batch insert_many(ordered=False)
                         |-- ok ------------------------> MongoDB security_events
                         |-- duplicates -> counted, ignored
                         '-- fails x3 ---> spill file ---(replay when DB is back)--> MongoDB

Modes: "async" (default) uses the writer thread. "sync" writes inline and is
used by tests and for debugging only.
"""
from __future__ import annotations

import logging
import os
import queue
import threading
import time
from typing import Optional

from pymongo.errors import BulkWriteError

from .event_schema import document_to_json_line, json_line_to_document

logger = logging.getLogger("medicheck.security.sink")

_DUP_KEY = 11000


class EventSink:
    def __init__(
        self,
        collection,
        *,
        mode: str = "async",
        queue_size: int = 10_000,
        batch_size: int = 100,
        flush_interval: float = 0.5,
        spill_path: Optional[str] = None,
        spill_max_bytes: int = 50 * 1024 * 1024,
        retry_backoff: tuple = (0.2, 0.5, 1.0),
    ) -> None:
        if mode not in ("async", "sync"):
            raise ValueError("mode must be 'async' or 'sync'")
        self.collection = collection
        self.mode = mode
        self.batch_size = max(1, batch_size)
        self.flush_interval = flush_interval
        self.spill_path = spill_path
        self.spill_max_bytes = spill_max_bytes
        self.retry_backoff = retry_backoff

        self._q: "queue.Queue[dict]" = queue.Queue(maxsize=max(1, queue_size))
        self._thread: Optional[threading.Thread] = None
        self._start_lock = threading.Lock()
        self._stop = threading.Event()
        self._spill_lock = threading.Lock()
        self._spill_pending = bool(spill_path and os.path.exists(spill_path))
        self._stat_lock = threading.Lock()
        self._stats = dict(
            emitted=0, written=0, duplicates=0, spilled=0, replayed=0,
            dropped=0, write_failures=0, last_error=None,
        )

    # ------------------------------------------------------------------
    # public API
    # ------------------------------------------------------------------
    def start(self) -> None:
        if self.mode == "sync":
            return
        with self._start_lock:
            if self._thread and self._thread.is_alive():
                return
            self._stop.clear()
            self._thread = threading.Thread(target=self._run, name="security-event-writer", daemon=True)
            self._thread.start()

    def stop(self, timeout: float = 5.0) -> None:
        """Flush what we can, then stop the writer thread (called at shutdown)."""
        self.flush(timeout)
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=1.0)

    def emit(self, doc: dict) -> None:
        """Queue one finished event document. Never raises, never blocks."""
        try:
            self._bump("emitted")
            if self.mode == "sync":
                self._write_batch([doc])
                return
            self.start()
            try:
                self._q.put_nowait(doc)
            except queue.Full:
                self._spill([doc], reason="queue_full")
        except Exception as exc:  # noqa: BLE001 - logging must never break a request
            self._bump("dropped")
            self._note_error(exc)

    def flush(self, timeout: float = 5.0) -> bool:
        """Wait until the queue is drained (used by tests and shutdown)."""
        if self.mode == "sync":
            return True
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            if self._q.unfinished_tasks == 0:
                return True
            time.sleep(0.01)
        return self._q.unfinished_tasks == 0

    def stats(self) -> dict:
        with self._stat_lock:
            s = dict(self._stats)
        s.update(
            mode=self.mode,
            queued=self._q.qsize(),
            queue_capacity=self._q.maxsize,
            spill_file_bytes=self._spill_size(),
            writer_alive=bool(self._thread and self._thread.is_alive()),
        )
        return s

    # ------------------------------------------------------------------
    # writer thread
    # ------------------------------------------------------------------
    def _run(self) -> None:
        if self._spill_pending:
            self.replay_spill()
        while not (self._stop.is_set() and self._q.empty()):
            try:
                first = self._q.get(timeout=self.flush_interval)
            except queue.Empty:
                continue
            batch = [first]
            while len(batch) < self.batch_size:
                try:
                    batch.append(self._q.get_nowait())
                except queue.Empty:
                    break
            try:
                ok = self._write_batch(batch)
                if ok and self._spill_pending:
                    self.replay_spill()
            except Exception as exc:  # noqa: BLE001
                self._note_error(exc)
            finally:
                for _ in batch:
                    self._q.task_done()

    # ------------------------------------------------------------------
    # storage
    # ------------------------------------------------------------------
    def _insert(self, docs: list) -> tuple[int, int]:
        """Insert; return (written, duplicates). Raises on a real failure."""
        copies = [dict(d) for d in docs]           # insert_many adds _id: keep originals clean
        try:
            self.collection.insert_many(copies, ordered=False)
            return len(copies), 0
        except BulkWriteError as bwe:
            errors = bwe.details.get("writeErrors", [])
            if errors and all(e.get("code") == _DUP_KEY for e in errors):
                return len(copies) - len(errors), len(errors)
            raise

    def _write_batch(self, docs: list) -> bool:
        last: Optional[Exception] = None
        for attempt in range(len(self.retry_backoff) + 1):
            try:
                written, dups = self._insert(docs)
                self._bump("written", written)
                self._bump("duplicates", dups)
                return True
            except Exception as exc:  # noqa: BLE001
                last = exc
                self._bump("write_failures")
                self._note_error(exc)
                if attempt < len(self.retry_backoff):
                    time.sleep(self.retry_backoff[attempt])
        logger.error("Security event storage failed; spilling %d event(s): %s", len(docs), last)
        self._spill(docs, reason="db_unavailable")
        return False

    # ------------------------------------------------------------------
    # spill file (durable fallback)
    # ------------------------------------------------------------------
    def _spill_size(self) -> int:
        try:
            return os.path.getsize(self.spill_path) if self.spill_path else 0
        except OSError:
            return 0

    def _spill(self, docs: list, reason: str) -> None:
        if not self.spill_path:
            self._bump("dropped", len(docs))
            return
        try:
            with self._spill_lock:
                os.makedirs(os.path.dirname(self.spill_path) or ".", exist_ok=True)
                if self._spill_size() >= self.spill_max_bytes:
                    self._bump("dropped", len(docs))
                    logger.error("Spill file full: dropped %d event(s)", len(docs))
                    return
                with open(self.spill_path, "a", encoding="utf-8") as fh:
                    for d in docs:
                        fh.write(document_to_json_line(d) + "\n")
            self._bump("spilled", len(docs))
            self._spill_pending = True
        except Exception as exc:  # noqa: BLE001
            self._bump("dropped", len(docs))
            self._note_error(exc)

    def replay_spill(self) -> int:
        """Re-insert spilled events. Idempotent because event_id is unique."""
        if not self.spill_path:
            return 0
        work = self.spill_path + ".replaying"
        with self._spill_lock:
            if os.path.exists(self.spill_path):
                if os.path.exists(work):                    # crashed mid-replay earlier: merge
                    with open(work, "a", encoding="utf-8") as dst, open(self.spill_path, encoding="utf-8") as src:
                        dst.write(src.read())
                    os.remove(self.spill_path)
                else:
                    os.replace(self.spill_path, work)
            if not os.path.exists(work):
                self._spill_pending = False
                return 0

        replayed = 0
        try:
            docs = []
            with open(work, encoding="utf-8") as fh:
                for line in fh:
                    line = line.strip()
                    if line:
                        docs.append(json_line_to_document(line))
            for i in range(0, len(docs), self.batch_size):
                chunk = docs[i : i + self.batch_size]
                written, dups = self._insert(chunk)
                replayed += written
                self._bump("duplicates", dups)
            os.remove(work)
            self._bump("replayed", replayed)
            with self._spill_lock:
                self._spill_pending = os.path.exists(self.spill_path)
            return replayed
        except Exception as exc:  # noqa: BLE001
            self._note_error(exc)
            # database still unavailable: put the work file back for the next attempt
            with self._spill_lock:
                if os.path.exists(work):
                    with open(work, encoding="utf-8") as src, open(self.spill_path, "a", encoding="utf-8") as dst:
                        dst.write(src.read())
                    os.remove(work)
            self._spill_pending = True
            return 0

    # ------------------------------------------------------------------
    def _bump(self, key: str, n: int = 1) -> None:
        if n:
            with self._stat_lock:
                self._stats[key] += n

    def _note_error(self, exc: Exception) -> None:
        with self._stat_lock:
            self._stats["last_error"] = f"{type(exc).__name__}"[:80]      # class name only: no data


# --------------------------------------------------------------------------
# process-wide sink
# --------------------------------------------------------------------------
_sink: Optional[EventSink] = None
_sink_lock = threading.Lock()


def get_sink() -> EventSink:
    global _sink
    if _sink is None:
        with _sink_lock:
            if _sink is None:
                from database import security_events_collection
                from .config import get_settings

                s = get_settings()
                _sink = EventSink(
                    security_events_collection,
                    mode=s.security_sink_mode,
                    queue_size=s.security_queue_size,
                    batch_size=s.security_batch_size,
                    flush_interval=s.security_flush_interval,
                    spill_path=s.security_spill_path,
                    spill_max_bytes=s.security_spill_max_bytes,
                )
    return _sink


def set_sink(sink: Optional[EventSink]) -> None:
    """Replace the process-wide sink (tests)."""
    global _sink
    _sink = sink
