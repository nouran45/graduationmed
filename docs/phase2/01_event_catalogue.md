# Event catalogue (58 event types)

Generated from the registry in `backend/security/event_schema.py` (`EVENT_TYPES`); the script that built this file
asserts that every registered type is described here and vice-versa. The vocabulary is **closed**: an unknown type is
rejected (raises in tests, is logged and dropped in production).

Every request produces `seq 0` = one `<group>.request` record (the plan's "general request metadata") and, in order,
the audit events listed below (the plan's "route-level audit events"). Model routes end with one `inference.*` record.
Timestamps: the `seq 0` record carries the request START time; audit events carry the moment they were raised.

| event_type | category | source | emitted when |
|---|---|---|---|
| `admin.request` | admin | middleware | middleware - /users, /api/admin/*, /predict-skin-defense/health |
| `admin.users.listed` | admin | audit | `GET /users`; details.record_count |
| `admin.user.created` | admin | audit | `POST /api/admin/users` (merge, 2026-11); details.platform_role, details.staff_role when staff access was granted. Rule ADMIN-01 |
| `admin.user.role_changed` | admin | audit | `PATCH /api/admin/users/{id}/role`; details.platform_role, details.sessions_revoked. Rule ADMIN-01 |
| `admin.user.rejected` | admin | audit | create/role change refused; details.reason = weak_password | email_exists | admin_with_staff_access | unknown_pharmacy | empty_branch_list | foreign_branch | unknown_user | last_admin |
| `auth.login.failure` | auth | audit | `/login` failed; details.reason = unknown_account | bad_password | disabled_account (INTERNAL only - HTTP answer is identical) |
| `auth.login.locked` | auth | audit | `/login` refused by the brute-force lock (HTTP 429) |
| `auth.login.success` | auth | audit | `POST /login` succeeded (actor + session now set) |
| `auth.logout.success` | auth | audit | `POST /logout` |
| `auth.logout_all.success` | auth | audit | `POST /logout-all`; details.sessions_revoked |
| `auth.password_change.failure` | auth | audit | details.reason = bad_current_password | weak_password | lockout |
| `auth.password_change.success` | auth | audit | `POST /auth/change-password` succeeded; details.sessions_revoked |
| `auth.register.failure` | auth | audit | `/register` rejected; details.reason = password_mismatch | weak_password | email_exists |
| `auth.register.success` | auth | audit | `POST /register` succeeded |
| `auth.request` | auth | middleware | middleware - /register /login /logout /logout-all /verify-token /users/me /auth/change-password |
| `auth.token.invalid` | auth | audit | `get_current_principal`; details.reason = missing_token | invalid_token | expired_token | session_inactive | user_unavailable. Rule AUTH-01 |
| `auth.verify_token.success` | auth | audit | `GET /verify-token` succeeded |
| `admin.access.allowed` | authorization | audit | `require_admin` passed. Rule ADMIN-01 (PHARM-01 on /api/admin/pharmacies/*) |
| `admin.access.denied` | authorization | audit | `require_admin` refused (non-admin). Same rules |
| `inventory.read.allowed` | authorization | audit | authorization dependency: caller holds `inventory.read` (rule INV-01); relation staff_of_branch | staff_of_pharmacy | platform_admin |
| `inventory.read.denied` | authorization | audit | authorization dependency: refused (rule INV-01); relation no_membership | not_staff_of_branch | not_staff_of_pharmacy | insufficient_staff_role |
| `inventory.write.allowed` | authorization | audit | authorization dependency: caller holds `inventory.write` (rule INV-01); relation staff_of_branch | staff_of_pharmacy | platform_admin |
| `inventory.write.denied` | authorization | audit | authorization dependency: refused (rule INV-01); relation no_membership | not_staff_of_branch | not_staff_of_pharmacy | insufficient_staff_role |
| `pharmacy.manage.allowed` | authorization | audit | authorization dependency: caller holds `pharmacy.manage` (rule PHARM-02); relation staff_of_branch | staff_of_pharmacy | platform_admin |
| `pharmacy.manage.denied` | authorization | audit | authorization dependency: refused (rule PHARM-02); relation no_membership | not_staff_of_branch | not_staff_of_pharmacy | insufficient_staff_role |
| `pharmacy.read.allowed` | authorization | audit | authorization dependency: caller holds `pharmacy.read` (rule PHARM-02); relation staff_of_branch | staff_of_pharmacy | platform_admin |
| `pharmacy.read.denied` | authorization | audit | authorization dependency: refused (rule PHARM-02); relation no_membership | not_staff_of_branch | not_staff_of_pharmacy | insufficient_staff_role |
| `prescription.review.allowed` | authorization | audit | authorization dependency: caller holds `prescription.review` (rule RX-02); relation staff_of_branch | staff_of_pharmacy | platform_admin |
| `prescription.review.denied` | authorization | audit | authorization dependency: refused (rule RX-02); relation no_membership | not_staff_of_branch | not_staff_of_pharmacy | insufficient_staff_role |
| `history.read.allowed` | history | audit | /history or /dashboard-history; details.record_count. Rule HIST-01 |
| `history.request` | history | middleware | middleware - /history /dashboard-history /save-history |
| `history.write.allowed` | history | audit | `POST /save-history`. Rule HIST-01 |
| `http.request` | http | middleware | middleware - any route not in a group below (e.g. `/`, unmatched 404) |
| `inference.completed` | inference | audit | model route answered 2xx (the request was accepted and processed); details: file_kind, size_bucket, model_route |
| `inference.failed` | inference | audit | model route answered 5xx |
| `inference.rejected` | inference | audit | model route answered 4xx other than 401/403/429; details.reason = invalid_input | too_large | unsupported_type | validation_error | client_error |
| `inference.request` | inference | middleware | middleware - the 7 `/predict*` routes |
| `inventory.request` | inventory | middleware | middleware - /api/inventory* |
| `inventory.write.completed` | inventory | audit | stock-changing operation succeeded; details.operation = create | manual_intake | import | quantity_update | details_update (+ row_count). Rule INV-02 |
| `inventory.write.rejected` | inventory | audit | details.reason = foreign_branch (denied, INV-01) | duplicate_item | invalid_csv | invalid_quantity (INV-02) |
| `pharmacy.created` | pharmacy | audit | `POST /api/pharmacies` (caller becomes owner) |
| `pharmacy.request` | pharmacy | middleware | middleware - /api/pharmacies* /api/branches* /api/me/branches /api/catalogue* (catalogue added in the merge) |
| `pharmacy.catalogue_sync.started` | pharmacy | audit | admin started the external catalogue import (`POST /api/catalogue/admin/sync/start`). Rule ADMIN-01 |
| `pharmacy.catalogue_sync.denied` | pharmacy | audit | admin session present but `X-Catalogue-Sync-Key` missing/wrong while CATALOGUE_SYNC_ADMIN_KEY is configured (key value never logged) |
| `pharmacy.staff.granted` | pharmacy | audit | owner/admin granted staff access; details.staff_role. Rule PHARM-02 |
| `pharmacy.staff.revoked` | pharmacy | audit | staff access revoked. Rule PHARM-02 |
| `pharmacy.verification.reviewed` | pharmacy | audit | admin decision; details.decision. Rule PHARM-01 |
| `pharmacy.verification.submitted` | pharmacy | audit | owner submitted verification |
| `prescription.read.allowed` | prescription | audit | authorization dependency: caller holds `prescription.read` (rule RX-02); relation staff_of_branch | staff_of_pharmacy | platform_admin |
| `prescription.read.denied` | prescription | audit | authorization dependency: refused (rule RX-02); relation no_membership | not_staff_of_branch | not_staff_of_pharmacy | insufficient_staff_role |
| `prescription.request` | prescription | middleware | middleware - /api/prescriptions* |
| `prescription.review.completed` | prescription | audit | pharmacist review saved; details.decision. Rule RX-02 |
| `prescription.review.rejected` | prescription | audit | details.reason = invalid_review | not_found_for_branch. Rule RX-02 |
| `prescription.upload.accepted` | prescription | audit | patient upload stored. Rule RX-01 |
| `prescription.upload.rejected` | prescription | audit | details.reason = branch_unavailable | validation_failed |
| `resource.rate_limited` | resource | audit | a rate-limit dependency refused the call (HTTP 429); details.limiter = quota name |
| `security.events.read` | security | audit | an admin read the event store; details.record_count |
| `security.request` | security | middleware | middleware - /api/security/* |

## Vocabulary used in `target_relation`
`self`, `other_patient`, `not_found`, `own_branch`, `other_branch`, `staff_of_branch`, `not_staff_of_branch`, `no_membership`,
`staff_of_pharmacy`, `not_staff_of_pharmacy`, `insufficient_staff_role`, `platform_admin`, `non_admin`, `no_valid_identity`.

## Rule ids
| id | meaning | status |
|---|---|---|
| AUTH-01 | a protected operation needs a valid authenticated identity | from the plan |
| HIST-01 | a patient may access only their own history | from the plan |
| RX-01 | a patient may read only their own prescriptions | from the plan |
| RX-02 | pharmacy staff act only for branches they are authorised for | from the plan |
| PHARM-01 | pharmacy verification requires an administrator | from the plan |
| INV-01 | inventory access/modification requires branch membership | from the plan |
| INV-02 | stock changes follow permitted operations | from the plan |
| PHARM-02 | pharmacy profile / branch / staff management requires an owner | **added in Phase 2** |
| ADMIN-01 | admin-only operations require role `admin` | **added in Phase 2** |
