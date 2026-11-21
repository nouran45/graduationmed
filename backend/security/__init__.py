"""
MediCheck security package (Grad 2 - Phase 1).

Everything that decides *who the caller is* and *what they may do* lives
here, so that later phases (event logging, context rules, response engine)
have exactly one place to hook into:

    config         environment-driven settings, fails fast on weak secrets
    passwords      hashing, verification, password policy
    sessions       server-side sessions (needed for revocation)
    identity       JWT creation + the get_current_user dependency
    authorization  roles, pharmacy/branch membership checks
    login_throttle persistent failed-login throttling
    rate_limit     per-user / per-IP request quotas
    uploads        bounded + content-sniffed upload handling
    requestinfo    trusted client-IP / request-id helpers
    middleware     request-id, body-size cap, security headers, safe 500s
    indexes        MongoDB indexes the above rely on
"""
