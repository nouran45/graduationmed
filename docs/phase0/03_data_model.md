# Data model & relationships

Database: `database` (overridable with `MONGO_DB_NAME`). Security events live in a separate database, `medicheck_security` (added in Phase 2; name set by `SECURITY_DB_NAME`).

| Collection | Key fields | Relationships (what Phase 4C rules need) |
|---|---|---|
| `users` | `_id`, `email` (unique, lower-case), `hashed_password`, `role`, `is_disabled` | `_id` is the trusted identity everywhere |
| `sessions` *(new)* | `session_id`, `user_id`, `expires_at`, `revoked_at/_reason`, `ip_hash` | One user → many sessions. TTL purge 7 days after expiry |
| `login_attempts` *(new)* | `key` (keyed hash), `at`, `expire_at` | Throttle state only; no raw e-mails |
| `history` | `user_id` (ObjectId), `type`, `prediction`, `created_at` | **Ownership:** `history.user_id == requester._id` (legacy rows may hold the id as a string; `/dashboard-history` handles both) |
| `pharmacies` | `id`, `verification_status`, `owner_user_id` | owner → pharmacy |
| `branches` | `branch_id`, `pharmacy_id`, `storefront_status` | pharmacy → branches |
| `pharmacy_staff` *(new)* | `user_id`, `pharmacy_id`, `staff_role`, `branch_ids` (None = all), `active` | **The** "may this user act for this branch" fact |
| `verification` | `pharmacy_id`, `status` | admin review queue |
| `prescriptions` | `prescription_id`, `patient_id` (= `str(user._id)`), `branch_id`, `status`, `reviewed_by` | patient ownership; branch scoping; reviewer = staff user id |
| `inventory` | `inventory_id`, `branch_id`, `product_id` (unique per branch) | branch scoping |
| `stock_movements` | `inventory_id`, `branch_id`, `actor` (= verified user id), `movement_type` | immutable audit trail |
| `orders` | – | collection declared, **no code uses it** |

Invariants the Phase 4C rules will encode (each already *enforced* by Phase 1 code):
HIST-01 own history only · RX-01 own prescription only · RX-02 reviewer is staff of the prescription's branch ·
PHARM-01 verification needs admin · INV-01 write needs `inventory.write` at that branch · INV-02 movement actor = session user.

Legacy data warning: prescriptions created with the old demo header have `patient_id = "demo-patient-001"`
(not a real user). They are unreadable after Phase 1; `migrate_phase1` reports them.
