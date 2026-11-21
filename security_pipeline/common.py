"""Shared constants and helpers for the Phase 3 dataset pipeline (STAGING ONLY)."""
from __future__ import annotations

import hashlib
import json
import os
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]          # .../medicheck
BACKEND = ROOT / "backend"
DATA = ROOT / "datasets"

# Synthetic staging secrets. They protect NOTHING real; the runner needs the secret
# to forge "expired token" attacks and the builder needs the signing key to verify events.
STAGING_SECRET = "staging-secret-key-staging-secret-key-0000"
STAGING_SIGNING_KEY = "staging-event-signing-key-0000"
PASSWORD = "Synthetic-Pass-123"
DOMAIN = "synthetic.medicheck.dev"

CLASSES = ["normal", "benign_operational_anomaly", "authentication_abuse", "unauthorized_access", "api_abuse"]
ATTACK_CLASSES = {"authentication_abuse", "unauthorized_access", "api_abuse"}
SEVERITY = {"normal": 0, "benign_operational_anomaly": 1, "api_abuse": 2, "authentication_abuse": 3, "unauthorized_access": 4}

# attack family -> class. CS-1 (stolen session used abnormally) is a form of unauthorized access.
FAMILY_CLASS = {
    "AUTH-1": "authentication_abuse", "AUTH-2": "authentication_abuse",
    "AUTH-3": "authentication_abuse", "AUTH-4": "authentication_abuse",
    "UA-1": "unauthorized_access", "UA-2": "unauthorized_access", "UA-3": "unauthorized_access",
    "UA-4": "unauthorized_access", "CS-1": "unauthorized_access",
    "API-1": "api_abuse", "API-2": "api_abuse", "API-3": "api_abuse",
}
HELD_OUT_FAMILIES = {"AUTH-2", "UA-4", "CS-1"}     # never used for training / model selection
SPLIT_RATIOS = (0.6, 0.2, 0.2)                     # train / val / test (known families)


def batch_dir(batch: str) -> pathlib.Path:
    d = DATA / "raw" / batch
    d.mkdir(parents=True, exist_ok=True)
    return d


def setup_signing_env() -> None:
    """Make backend modules importable and give them the staging keys (for verification)."""
    os.environ.setdefault("SECRET_KEY", STAGING_SECRET)
    os.environ.setdefault("EVENT_SIGNING_KEY", STAGING_SIGNING_KEY)
    os.environ.setdefault("MONGO_URI", "mongodb://localhost:27017")     # never contacted by the builder
    os.environ.setdefault("APP_ENV", "staging")
    if str(BACKEND) not in sys.path:
        sys.path.insert(0, str(BACKEND))


def sha256_file(path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def read_jsonl(path):
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                yield json.loads(line)


def write_jsonl(path, rows) -> int:
    n = 0
    with open(path, "w", encoding="utf-8") as fh:
        for r in rows:
            fh.write(json.dumps(r, sort_keys=True, separators=(",", ":")) + "\n")
            n += 1
    return n
