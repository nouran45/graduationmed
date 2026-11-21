# Findings register

Status legend: **Fixed** = code changed and covered by an automated test (44 tests, `pytest`).
**Open** = not fixed in Phase 1 (reason given). "Verified by" says how the finding was established.

## Critical

| ID | Finding | Verified by | Phase 1 fix | Test |
|---|---|---|---|---|
| F-01 | `/register` stored the **plaintext password** next to the hash (`user_data.dict()` includes `password`; only `confirmPassword` was removed — original `app.py:161-163`) | Reproduced: building the document with the original code yields keys `[email, firstName, hashed_password, lastName, password]` | `UserInDB` no longer inherits signup fields; document built explicitly; migration `$unset`s existing plaintext | `test_register_never_stores_plaintext_password`, `test_migration_removes_plaintext_and_lowercases` |
| F-02 | **All 5 prescription routes had no authentication at all.** Identity came from `X-Patient-ID`/`X-Actor-ID`/`X-Branch-ID` headers, so any internet client could read any patient's prescription, impersonate a pharmacist and approve prescriptions. (The earlier audit described this as "header identity"; the route table shows it is stronger: there is no JWT dependency.) | Route classifier on the original app: `no JWT check: 9`, five of them `/api/prescriptions*` | JWT + session required; patient = session user; staff = `pharmacy_staff` membership; 404 for other patients' records | `test_prescription_endpoints_require_authentication`, `test_patient_identity_comes_from_session_not_header`, `test_bola_other_patient_cannot_read_prescription`, `test_pharmacist_flow_and_cross_branch_isolation` |

## High

| ID | Finding | Status |
|---|---|---|
| F-03 | Inventory router trusts `X-Branch-ID`/`X-Actor-ID` (stock-movement audit actor was forgeable). Router was **not registered** → latent, not live | **Fixed** before registration. `test_inventory_requires_membership_and_records_real_actor` |
| F-04 | Pharmacy router had **no authentication on any route** (create/edit pharmacies, approve verification). Not registered → latent | **Fixed** (ownership + admin). `test_pharmacy_admin_endpoints_are_protected`, `test_user_cannot_edit_someone_elses_pharmacy` |
| F-05 | Frontend admin area decided by `localStorage.user.role`. *Nuance:* the backend `/users` already checked `role == admin`, so data was not exposed; this was a UI-only weakness | **Fixed**: layout asks `GET /users/me`; backend uses `require_admin` |
| F-09 | No server-side sessions: logout was cosmetic, no token revocation. Blocks the future response engine | **Fixed**: `sessions` collection, `sid` in JWT, `/logout`, `/logout-all`, revoke on password change. `test_logout_revokes_session_server_side` |
| F-10 | Inference/upload endpoints read whole body into memory, trusted extension/Content-Type, no quotas | **Fixed**: 10 MB cap, magic-byte + Pillow validation, pixel cap, per-user rate limits, 12 MB global body cap. `test_image_endpoints_reject_fake_and_oversized`, `test_rate_limit_on_predictions_per_user` |
| F-14 | No brute-force protection on `/login` | **Fixed**: persistent throttle (5/15 min per e-mail, 25 per IP), identical behaviour for unknown e-mails. `test_lockout_after_repeated_failures` |

## Medium / Low (new findings not in the earlier plan)

| ID | Finding | Status |
|---|---|---|
| F-11 | `GET /predict-skin-defense/health` was public and returned server model **file paths** | **Fixed** (admin only). `test_admin_only_routes` |
| F-12 | Endpoints returned `str(exception)` to clients (information disclosure) | **Fixed**: generic message + `request_id`; details only in server log. `test_unhandled_error_does_not_leak` |
| F-13 | Login timing differed for unknown vs known e-mail; e-mail addresses written to INFO logs | **Fixed**: dummy bcrypt verify; logs use user `_id`. |
| F-15 | `/register`: no server-side confirm-password check, no password policy, case-sensitive e-mail (`A@x.com` ≠ `a@x.com` → duplicate accounts) | **Fixed** + unique e-mail index (after migration) |
| F-06 | `frontend/app/middleware.ts` sits in `app/` (Next.js ignores it) and expects an `authToken` cookie nobody sets → it **never ran**; no route protection existed from it | **Removed** (dead code giving false assurance) |
| F-07 | Hard-coded `demo-patient-001` / `demo-pharmacist-001` identities in `lib/api/prescriptions.ts` | **Fixed** |
| F-08 | `backend/auth.py`: never imported, defaults `SECRET_KEY` to `"your-secret-key-here"` | **Deleted**. `config.py` now refuses to start on a weak/missing secret |
| F-16 | `admin/users/page.tsx` logged the token to the console and hard-coded the HF host | **Fixed** |
| F-17 | `app/history/page.tsx` called `http://localhost:8000/history` with no token (broken in production) | **Fixed** |
| F-20 | Backend has only `patient` and `admin`; a *pharmacist/owner* existed only in comments. No way to create an admin or staff without editing MongoDB | **Fixed**: `pharmacy_staff` memberships + `scripts/admin_cli.py` |
| F-21 | CORS `allow_headers=["*"]`, all methods | **Tightened** |
| F-25 | Free-text fields unbounded (`MedicalHistory`, inventory CSV/rows) | **Fixed** (length caps) |
| F-23 | `test_pharmacy_app.py` ran the pharmacy router standalone | **Deleted** |
| F-27 | **Behaviour change:** every existing JWT stops working (old format has no `sid`). Everyone logs in once | Intended |

## Open items

| ID | Finding | Why open / where it goes |
|---|---|---|
| F-19 | Prescription files are saved under the app directory. On a Hugging Face Space that disk is **ephemeral** (lost on restart) — *needs your confirmation* | `PRIVATE_UPLOAD_ROOT` env added; real fix is persistent/object storage (Phase 8) |
| F-22 | `GET /users` returns **every user's medical history** to any admin (privacy/minimisation concern) | Product decision; recommend removing histories from the list view |
| F-26 | JWT is kept in `localStorage` (readable by any XSS) | Accepted for now: cross-site cookies (hf.space ↔ vercel.app) are worse (SameSite=None + CSRF, browser blocking). Mitigated by revocation. Revisit with a Next.js proxy (same-site httpOnly cookie) |
| F-28 | The 7 prediction components call `fetch` directly, so they do not auto-redirect on 401 | Low risk (server still enforces); migrate to `authFetch` opportunistically |
| F-29 | Rate limiter is per-process | Correct for one HF replica; shared store in Phase 6 |
| F-30 | PDFs validated by magic bytes only (no AV scan, files never served back) | Add scanning before any download feature exists |
| F-31 | `orders.py` and `order_service.py` are empty files | Informational |
| F-32 | Sync PyMongo calls inside `async def` prediction endpoints block the event loop under load | Performance, not security; out of scope |
