# Phase 1 rollout runbook

Do these **in order**. Steps 1–3 are about the existing production data; do them before anything else.

## A. Secure what exists
1. **Back up** the Atlas database (Atlas → Backup / `mongodump`).
2. **Generate a new `SECRET_KEY`**: `python -c "import secrets; print(secrets.token_urlsafe(48))"`.
3. **Rotate the Atlas database user's password** (plaintext user passwords existed in this DB, and the old `.env.example` pattern suggests the URI may have been shared). Put new `MONGO_URI` + `SECRET_KEY` in HF *Secrets* (never in the repo).
4. Run the migration **from your laptop** (HF free Spaces have no shell; add your IP to Atlas Network Access temporarily):
   ```bash
   cd backend && pip install -r requirements.txt
   export MONGO_URI='...' SECRET_KEY='...'
   python -m scripts.migrate_phase1            # read the report first
   python -m scripts.migrate_phase1 --apply
   ```
   Resolve any reported duplicate e-mails by hand, re-run.
5. **Assume old plaintext passwords may survive in Atlas backups/snapshots.** Tell real users to change their password (`POST /auth/change-password`) once they log in. Test accounts: delete them.

## B. Deploy
6. Replace the backend files with this patch; set environment (HF → Settings → Variables):
   `APP_ENV=production`, `TRUSTED_PROXY_COUNT=1`, `CORS_ORIGINS=<your vercel URL>`, `PRIVATE_UPLOAD_ROOT=/data/prescriptions` (only if persistent storage is enabled).
7. Start it; the log must show *MongoDB connection established* and **no** `INDEX FAILED` lines. A start-up `RuntimeError: SECRET_KEY…` means the secret is missing/weak (by design).
8. Create your admin: `python -m scripts.admin_cli create-user you@example.com --role admin`.
9. Deploy the frontend patch; confirm `NEXT_PUBLIC_API_BASE_URL` is set in Vercel.

## C. Staging (needed for Phase 3)
10. Second Space + `MONGO_DB_NAME=medicheck_staging`, `APP_ENV=staging`, `DOCS_ENABLED=true`.
11. `APP_ENV=staging SEED_PASSWORD='…' python -m scripts.seed_staging --i-know-this-is-staging`.

## D. Verify (acceptance criteria for Phase 1)
```bash
cd backend && pip install -r requirements-dev.txt && python -m pytest -q     # 44 passed
python -m scripts.export_api_inventory --check                              # No unexpected public routes
```
Manual spot checks against STAGING (replace `$API`):
```bash
curl -i $API/api/prescriptions/pharmacy/queue                       # 401
curl -i -H 'X-Patient-ID: x' -H 'X-Actor-ID: y' -H 'X-Branch-ID: z' $API/api/prescriptions/pharmacy/queue   # still 401
curl -i $API/users                                                  # 401
for i in 1 2 3 4 5 6; do curl -s -o /dev/null -w '%{http_code} ' -X POST $API/login -H 'Content-Type: application/json' -d '{"email":"a@b.com","password":"nope-nope-1"}'; done   # 401 401 401 401 401 429
```
**Acceptance:** no protected operation succeeds merely because a client supplies a user, role, branch or actor identifier; plaintext passwords no longer exist in `users`.

## Behaviour changes your users will notice
* Everyone must log in again once (old tokens are intentionally invalid).
* Passwords: ≥10 characters, ≤72 bytes. E-mails are case-insensitive.
* 5 wrong passwords → 15-minute lock for that e-mail.
* Image/prescription uploads max 10 MB; real JPG/PNG (and PDF for prescriptions) only.
* Patients choose a pharmacy branch when uploading a prescription; only approved + online branches are listed.
* Pharmacy pages only work for users granted staff access (owner via `POST /api/pharmacies/{id}/staff`, or `admin_cli`).
* Prediction endpoints: 20 requests/min per user (skin-defense 6/min). Tune with env vars, or `RATE_LIMITS_ENABLED=false` on staging while loading data.
