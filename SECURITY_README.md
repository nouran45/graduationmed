# MediGuard AI: security layer on MediCheck

The project README (`README.md`) describes MediCheck itself. This file covers the security work:
Phase 0 (audit), Phase 1 (hardening), Phase 2 (security event logging), Phase 3 (dataset pipeline), and
the merge with the pharmacy catalogue work (`docs/merge_pharmacy_catalogue.md`).

> **Before deploying:** the Atlas password for `medicheck_backend` and the old `SECRET_KEY` were committed
> in `d0a6c8b`. Rotate both first. See `docs/merge_pharmacy_catalogue.md` §4.

```
backend/            FastAPI app: security/ package, routers/, scripts/, tests/, demo_server.py
frontend/           Next.js app
security_pipeline/  Phase 3: staging server, traffic runner, export, dataset builder (staging only)
docs/               phase0/ (audit, threat model, runbook), phase2/ (event catalogue), diffs, merge notes
```

## 1. Verify (laptop, no real database, about 2 min)
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install fastapi pydantic email-validator "python-jose[cryptography]" "passlib[bcrypt]" \
    bcrypt==4.0.1 python-multipart pymongo mongomock pytest httpx python-dotenv pillow uvicorn requests
python -m pytest -q            # expect: 98 passed
```

## 2. Run it locally (no Atlas, no model weights)
```bash
cd backend && python demo_server.py           # http://127.0.0.1:8000, fake DB + fake AI results
cd ../frontend && npm install --legacy-peer-deps --no-audit --no-fund && npm run dev    # http://localhost:3000
```
Demo accounts use the password `Demo-Password-123`. The usernames are `patient1`, `pharmacist`, `owner`,
`inventory` and `admin`, each followed by `@synthetic.medicheck.dev`. Sign in as the admin user to get
the **Admin Dashboard** button and **User Management** (create users with a role, manage access).

## 3. Roles
- `/register` always creates a **patient**.
- **Administrator** is a platform role. The first admin is created with
  `python -m scripts.admin_cli create-user you@example.com --role admin` (run from `backend/`). After that,
  admins manage roles in Admin → User Management.
- **Pharmacy owner / pharmacist / inventory staff** are memberships of a pharmacy (optionally limited to
  some branches). They are granted by an admin (User Management) or by that pharmacy's owner.
- An admin cannot also be pharmacy staff, and the last admin cannot be demoted.

## 4. Deploy (real systems), in this order
1. **Rotate the leaked Atlas password and `SECRET_KEY`.** Back up MongoDB. The new `SECRET_KEY` must be
   at least 32 characters.
2. From your laptop: `cd backend && python -m scripts.migrate_phase1` (dry run), then `--apply`.
3. Backend (Hugging Face Space): push `backend/`.
   - Space secrets: `MONGO_URI`, `SECRET_KEY`, `EVENT_SIGNING_KEY`, and optionally `MEDICHECK_API_TOKEN`
     and `CATALOGUE_SYNC_ADMIN_KEY`.
   - Variables: `APP_ENV=production`, `TRUSTED_PROXY_COUNT=1`, `CORS_ORIGINS=<your vercel url>`, and
     `PHARMASYNC_API_BASE_URL`.
4. `python -m scripts.admin_cli create-user you@example.com --role admin`
5. Frontend (Vercel): push `frontend/` and set `NEXT_PUBLIC_API_BASE_URL`. The pharmacy pages also need:
   - `PHARMASYNC_API_BASE_URL`;
   - `MEDICHECK_API_TOKEN` (server-side secret: never prefix it with `NEXT_PUBLIC_`);
   - `NEXT_PUBLIC_PHARMACY_IDS`.
6. Full runbook: `docs/phase0/06_phase1_runbook.md`. For logging, see `docs/phase2/05_phase2_runbook.md`.

## 5. Phase 3 dataset (staging only, never against production)
Needs a **local** MongoDB on `localhost:27017` (the staging server refuses any other address) and only the light
requirements: `pip install -r security_pipeline/requirements.txt`. Run from the repository root.
```bash
# terminal 1: staging server (real app, fixed model answers, synthetic population)
python -m security_pipeline.staging_server --batch trial1 --db mongo --reset
# terminal 2
python -m security_pipeline.runner.orchestrator --batch trial1 --plan pilot
python -m security_pipeline.export_events --batch trial1
python -m security_pipeline.build_dataset --version v0-trial --batches trial1
python -m security_pipeline.staging_db list          # staging databases and sizes; "drop --batch NAME" to delete
```
Output goes to `datasets/` (git-ignored). Use a new batch name for every run; `--reset` deletes that batch's data.
`--db embedded` (in-memory, no MongoDB) still works for quick tests.

## Not included
- Model weights (`.pt`, `.pth`, `.joblib` and similar), the Hugging Face Dockerfile and Space README.
- Any `.env` file.

Never commit real secrets: `.env.example` must only ever contain placeholders.
