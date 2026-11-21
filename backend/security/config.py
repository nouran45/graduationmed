"""
Central, environment-driven settings.

Design rules
------------
* A missing or placeholder SECRET_KEY must stop the server from starting.
  (The old auth.py silently fell back to "your-secret-key-here", which would
  let anybody forge a valid JWT.)
* Every limit that the Phase 3 scenario generator may need to change on a
  *staging* deployment is an environment variable, never a code edit.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()

_WEAK_SECRETS = {
    "",
    "your-secret-key-here",
    "changeme",
    "change-me",
    "secret",
    "secret-key",
}


def _int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        return int(raw)
    except ValueError as exc:
        raise RuntimeError(f"{name} must be an integer, got {raw!r}") from exc


def _float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        return float(raw)
    except ValueError as exc:
        raise RuntimeError(f"{name} must be a number, got {raw!r}") from exc


def _bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _list(name: str, default: list[str]) -> list[str]:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    return [item.strip() for item in raw.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    # --- environment -------------------------------------------------------
    app_env: str                     # "development" | "staging" | "production"

    # --- JWT / sessions ----------------------------------------------------
    secret_key: str
    jwt_algorithm: str
    access_token_expire_minutes: int

    # --- CORS --------------------------------------------------------------
    cors_origins: list[str]

    # --- uploads / request size -------------------------------------------
    max_image_bytes: int             # skin / x-ray uploads
    max_prescription_bytes: int      # prescription uploads (jpg/png/pdf)
    max_image_pixels: int            # decompression-bomb guard
    max_request_bytes: int           # hard cap on any request body

    # --- login throttling --------------------------------------------------
    login_max_failures_per_email: int
    login_max_failures_per_ip: int
    login_window_seconds: int

    # --- proxy awareness (Hugging Face / Vercel sit behind a proxy) --------
    trusted_proxy_count: int

    # --- rate limits -------------------------------------------------------
    rate_limits_enabled: bool
    predict_per_minute: int
    heavy_predict_per_minute: int    # skin-defense pipeline (GPU/CPU heavy)
    upload_per_hour: int
    register_per_hour_per_ip: int
    admin_write_per_minute: int
    catalogue_per_minute: int          # public product catalogue, per client IP

    # --- Phase 2: security event collection --------------------------------
    security_events_enabled: bool
    security_events_strict: bool       # True = unknown event types RAISE (tests); False = log + count
    security_sink_mode: str            # "async" (bounded queue + writer thread) | "sync" (tests/debug)
    security_queue_size: int
    security_batch_size: int
    security_flush_interval: float     # seconds the writer waits to fill a batch
    security_spill_path: str           # durable local fallback (JSON lines)
    security_spill_max_bytes: int
    security_event_signing_key: str    # signs each event so later phases can detect tampering

    # --- Phase 3: staging-only fault injection ------------------------------
    fault_injection: frozenset         # EMPTY in any real deployment

    # --- misc --------------------------------------------------------------
    docs_enabled: bool


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    secret = os.getenv("SECRET_KEY", "").strip()

    if secret.lower() in _WEAK_SECRETS or len(secret) < 32:
        raise RuntimeError(
            "SECRET_KEY is missing, a known placeholder, or shorter than 32 "
            "characters. Generate one with:\n"
            "    python -c \"import secrets; print(secrets.token_urlsafe(48))\"\n"
            "and set it in the environment (Hugging Face: Space secrets)."
        )

    app_env = os.getenv("APP_ENV", "development").strip().lower()

    # Event-signing key: dedicated EVENT_SIGNING_KEY if provided, otherwise
    # derived from SECRET_KEY (domain-separated, so the two are never the same).
    signing = os.getenv("EVENT_SIGNING_KEY", "").strip()
    if not signing:
        import hashlib
        import hmac as _hmac

        signing = _hmac.new(secret.encode(), b"medicheck:event-signing:v1", hashlib.sha256).hexdigest()
    elif len(signing) < 16:
        raise RuntimeError("EVENT_SIGNING_KEY must be at least 16 characters.")

    faults = frozenset(f.strip() for f in os.getenv("STAGING_FAULT_INJECTION", "").split(",") if f.strip())
    if faults:
        known = {"rx_read_idor", "branch_hop", "admin_bypass"}
        if faults - known:
            raise RuntimeError(f"Unknown STAGING_FAULT_INJECTION entries: {sorted(faults - known)}")
        if app_env != "staging":
            raise RuntimeError(
                "STAGING_FAULT_INJECTION is set but APP_ENV is not 'staging'. "
                "Fault injection deliberately disables security checks and may only run in staging."
            )

    default_spill = str(Path(__file__).resolve().parents[1] / "security_spill" / "events_spill.jsonl")

    return Settings(
        app_env=app_env,
        secret_key=secret,
        jwt_algorithm="HS256",
        access_token_expire_minutes=_int("ACCESS_TOKEN_EXPIRE_MINUTES", 120),
        cors_origins=_list(
            "CORS_ORIGINS",
            [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "https://medical-symptom-checker-five.vercel.app",
            ],
        ),
        max_image_bytes=_int("MAX_IMAGE_BYTES", 10 * 1024 * 1024),
        max_prescription_bytes=_int("MAX_PRESCRIPTION_BYTES", 10 * 1024 * 1024),
        max_image_pixels=_int("MAX_IMAGE_PIXELS", 40_000_000),
        max_request_bytes=_int("MAX_REQUEST_BYTES", 12 * 1024 * 1024),
        login_max_failures_per_email=_int("LOGIN_MAX_FAILURES_PER_EMAIL", 5),
        login_max_failures_per_ip=_int("LOGIN_MAX_FAILURES_PER_IP", 25),
        login_window_seconds=_int("LOGIN_WINDOW_SECONDS", 900),
        trusted_proxy_count=_int("TRUSTED_PROXY_COUNT", 1),
        rate_limits_enabled=_bool("RATE_LIMITS_ENABLED", True),
        predict_per_minute=_int("PREDICT_PER_MINUTE", 20),
        heavy_predict_per_minute=_int("HEAVY_PREDICT_PER_MINUTE", 6),
        upload_per_hour=_int("UPLOAD_PER_HOUR", 20),
        register_per_hour_per_ip=_int("REGISTER_PER_HOUR_PER_IP", 10),
        admin_write_per_minute=_int("ADMIN_WRITE_PER_MINUTE", 60),
        catalogue_per_minute=_int("CATALOGUE_PER_MINUTE", 120),
        security_events_enabled=_bool("SECURITY_EVENTS_ENABLED", True),
        security_events_strict=_bool("SECURITY_EVENTS_STRICT", False),
        security_sink_mode=os.getenv("SECURITY_SINK_MODE", "async").strip().lower(),
        security_queue_size=_int("SECURITY_EVENT_QUEUE_SIZE", 10_000),
        security_batch_size=_int("SECURITY_EVENT_BATCH_SIZE", 100),
        security_flush_interval=_float("SECURITY_EVENT_FLUSH_INTERVAL", 0.5),
        security_spill_path=os.getenv("SECURITY_SPILL_PATH", "").strip() or default_spill,
        security_spill_max_bytes=_int("SECURITY_SPILL_MAX_BYTES", 50 * 1024 * 1024),
        security_event_signing_key=signing,
        fault_injection=faults,
        docs_enabled=_bool("DOCS_ENABLED", app_env != "production"),
    )
