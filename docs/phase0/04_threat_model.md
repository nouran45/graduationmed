# Threat model (initial)

## Assets
Patient medical history & predictions · prescriptions (private files + extracted drugs) · credentials & sessions ·
pharmacy/inventory integrity (stock levels, prices, verification status) · availability of the (expensive) inference endpoints.

## Actors
Anonymous internet user · registered patient (malicious or curious) · pharmacy staff (curious / compromised) · pharmacy owner · admin · automated bot.

## Trust boundaries & what is trusted
| Boundary | Trusted? | Rule after Phase 1 |
|---|---|---|
| Browser → API | **Never** | Identity = verified JWT + live session; role/branch from MongoDB |
| `X-Branch-ID` header | Selector only | Checked against `pharmacy_staff` |
| `X-Forwarded-For` | Only the entry added by our proxy | `TRUSTED_PROXY_COUNT` |
| Uploaded file name / Content-Type | Never | Magic bytes + Pillow; server-generated storage name |
| API → MongoDB Atlas | Trusted network peer | Separate staging DB; rotate credentials |
| Frontend `localStorage` | Never | UI hints only |

## Attack scenarios (feeds Phase 3 labels and Phase 4 detectors)

`Expected signal` is what Phase 1 code now returns, i.e. what the Phase 2 logger will see.
`Catch` = which detector family is expected to be the *primary* one (a hypothesis to test in Phase 9, not a result).

| ID | Label class | Scenario | Endpoints | Expected signal | Catch (hypothesis) | Simulatable now |
|---|---|---|---|---|---|---|
| AUTH-1 | authentication_abuse | Brute-force one account | `/login` | 401×5 then 429 | XGB | ✔ |
| AUTH-2 | authentication_abuse | Credential stuffing: many e-mails, few tries each (per-e-mail lock never triggers; per-IP lock does at 25) | `/login` | 401s across many e-mails, then 429 by IP | XGB/GRU | ✔ |
| AUTH-3 | authentication_abuse | Token forgery / alg=none / legacy token / expired token | any protected | 401 | XGB | ✔ |
| AUTH-4 | authentication_abuse | Replay a token after logout or password change | any protected | 401 after a successful earlier use | GRU | ✔ |
| UA-1 | unauthorized_access | BOLA: patient requests another patient's prescription IDs | `/api/prescriptions/{id}` | 404 (real reason = `other_patient`) | **Context rule RX-01** | ✔ |
| UA-2 | unauthorized_access | Staff probes another pharmacy's branch (`X-Branch-ID` hopping) | pharmacy/inventory | 403 `FORBIDDEN_BRANCH` | **Rule RX-02 / INV-01** | ✔ |
| UA-3 | unauthorized_access | Patient calls pharmacy queue / admin routes | `/api/prescriptions/pharmacy/*`, `/users`, `/api/admin/*` | 403 | **Rule PHARM-01** | ✔ |
| UA-4 | unauthorized_access | Enumerate prescription/branch IDs | `/api/prescriptions/{id}`, `/api/branches/{id}` | many 404/403 | GRU/XGB | ✔ |
| API-1 | api_abuse | Inference flood | `/predict*` | 429 after 20/min (6/min skin-defense) | XGB | ✔ |
| API-2 | api_abuse | Oversized / fake-type / bomb uploads | `/predict*`, `/api/prescriptions` | 413 / 415 / 400 | XGB | ✔ |
| API-3 | api_abuse | Registration flood | `/register` | 429 after 10/h/IP | XGB | ✔ |
| BN-1 | benign_operational_anomaly | User mistypes password 1–2×, then succeeds | `/login` | 401,401,200 | (must NOT alert) | ✔ |
| BN-2 | benign_operational_anomaly | Legitimate burst: staff reviewing many prescriptions; user retrying an upload | queue/review | many 200 | (must NOT alert) | ✔ |
| BN-3 | benign_operational_anomaly | Server fault (DB timeout / model not loaded) | `/predict*` | 500 | (must NOT alert) | needs fault injection |

### Important research implication
Because Phase 1 now **blocks** every scenario above, a detector sees *attempts* (403/404/429), not successful breaches.
That is the correct production situation. Two consequences for the evaluation:
1. Ground truth must come from the **scenario runner**, never from status codes (a 403 can be a benign mistake).
2. The context-rule contribution (RQ2) is best demonstrated with a **defect-injection switch on STAGING only**
   (a build with one authorization check deliberately removed). Then "authorization succeeded for the wrong relation"
   is a real event that XGBoost/GRU cannot see in HTTP metadata but an invariant can. Do not ship that switch to production.

## Out of scope for Phase 1
Network-layer DDoS · host compromise · MongoDB Atlas account takeover · adversarial medical images (covered by Grad 1) · social engineering.
