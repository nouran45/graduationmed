# Phase 0 deliverables — MediCheck platform audit & threat model

Everything here was derived from the uploaded source (`backend.zip`, `frontend.zip`).
Nothing was observed on the live deployment; see `05_deployment_questions.md`.

| File | What it answers |
|---|---|
| `01_findings_register.md` | Every security finding, how it was verified, its fix and the test proving the fix |
| `02_role_permission_matrix.md` | Who may call what (actual roles only) |
| `03_data_model.md` | MongoDB collections and the relationships the context rules will use |
| `04_threat_model.md` | Assets, actors, trust boundaries, attack scenarios and how each maps to a detector |
| `05_deployment_questions.md` | What the code tells us about Hugging Face/Vercel, and what only you can confirm |
| `06_phase1_runbook.md` | Ordered rollout steps and the acceptance checklist |
| `generated/endpoint_inventory.md`, `generated/openapi.json` | Route table produced by `python -m scripts.export_api_inventory` |

Re-generate the inventory whenever routes change; `--check` fails if an unexpected
public route appears (use it in CI).
