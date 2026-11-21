# Deployment topology — what the code proves and what only you can confirm

## Evidence found in the source
| Observation | Where | Meaning |
|---|---|---|
| `https://faridaaaa-medical-diagnosis-api.hf.space` | `app/dashboard/page.tsx`, `app/admin/users/page.tsx` (hard-coded) | Backend **has been** served from a Hugging Face Space with that name |
| `https://medical-symptom-checker-five.vercel.app` | `backend/app.py` CORS list | Frontend **has been** on Vercel under that name |
| `api.mediscan.eu.org` | comment in `dashboard/medical-history/page.tsx` | A custom API domain was at least considered |
| `NEXT_PUBLIC_API_BASE_URL` / `NEXT_PUBLIC_API_URL` / hard-coded `127.0.0.1:8000` | ~15 frontend files | API URL is configured per environment; two variable names are in use |
| `http://127.0.0.1:8080/get` | `app/health-chat/page.tsx` | The chatbot calls a **separate local service** (not part of this backend) |
| `app/actions/chat-actions.ts` | frontend | A server action with canned answers — not a real chatbot backend |
| No `Dockerfile`, `README.md` Space header, `vercel.json`, or model weights in the archives | — | The HF runtime (SDK, entry point, port 7860?) cannot be determined from the zips |

**Not established:** whether those URLs are live today, which commit is deployed, where the model weights live,
whether MongoDB is the same Atlas cluster for all environments.

## Please check (≈15 minutes) and send me the answers
1. **HF Space** → *Files*: is there a `Dockerfile`? What does `CMD` run (`uvicorn app:app --host 0.0.0.0 --port 7860`?). Does `README.md` start with `sdk: docker` / `app_port`?
2. **HF Space** → *Settings*: is it Public or Private? Which *Variables and secrets* exist (names only, **never paste values**)? Is *persistent storage* enabled?
3. Is the model weights folder committed in the Space (Git LFS) or downloaded at start-up?
4. **Atlas** → *Network Access*: is `0.0.0.0/0` allowed? Which database users exist? Is production and any test data in the **same** cluster/database?
5. **Vercel** → project *Settings → Environment Variables*: value of `NEXT_PUBLIC_API_BASE_URL` (the URL only).
6. From your own machine (read-only, one request each):
   `curl -s https://<space>.hf.space/openapi.json | python -m json.tool | head -100` — compare path list with `generated/endpoint_inventory.md`.
   If it lists `/api/prescriptions` with **no** `security` entry, the old build is live and Phase 1 is urgent.
7. Is the chatbot service on `:8080` deployed anywhere?

## Important
Do **not** run the Phase 3 attack scenarios against the public Space or the production database.
Create a second Space + a second database (`MONGO_DB_NAME=medicheck_staging`) first (see runbook).
