"""
Password hashing, verification and policy.

Why a dummy hash?
-----------------
If /login returned immediately for an unknown e-mail but spent ~250 ms
bcrypt-hashing for a known one, an attacker could enumerate accounts by timing.
verify_password_or_dummy() always performs one bcrypt verification.
"""
from __future__ import annotations

import secrets

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Computed once at import time; its plaintext is random and never stored.
_DUMMY_HASH = pwd_context.hash("dummy-" + secrets.token_hex(16))

# bcrypt only uses the first 72 BYTES; longer passwords would be silently
# truncated, so the policy rejects them instead.
BCRYPT_MAX_BYTES = 72
MIN_LENGTH = 10

_COMMON = {
    "password", "password1", "password123", "1234567890", "12345678910",
    "qwertyuiop", "qwerty12345", "iloveyou123", "admin12345", "letmein1234",
    "welcome1234", "abc1234567", "1q2w3e4r5t", "medicheck123",
}


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str | None) -> bool:
    if not hashed:
        return False
    try:
        return pwd_context.verify(plain, hashed)
    except (ValueError, TypeError):
        # malformed / unknown hash format -> treat as a failed login
        return False


def verify_password_or_dummy(plain: str, hashed: str | None) -> bool:
    """Constant-work verification (see module docstring)."""
    if not hashed:
        pwd_context.verify(plain, _DUMMY_HASH)
        return False
    return verify_password(plain, hashed)


def password_policy_errors(password: str, email: str | None = None) -> list[str]:
    errors: list[str] = []

    if len(password) < MIN_LENGTH:
        errors.append(f"Password must be at least {MIN_LENGTH} characters long.")

    if len(password.encode("utf-8")) > BCRYPT_MAX_BYTES:
        errors.append(f"Password must be at most {BCRYPT_MAX_BYTES} bytes long.")

    if password.strip() == "":
        errors.append("Password must not be blank.")

    if password.lower() in _COMMON:
        errors.append("Password is too common.")

    if email:
        local = email.split("@", 1)[0].lower()
        if len(local) >= 4 and local in password.lower():
            errors.append("Password must not contain your e-mail name.")

    return errors
