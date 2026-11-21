# Role & permission matrix (as implemented after Phase 1)

## Roles that exist in the code
| Role | Where it lives | Notes |
|---|---|---|
| `patient` | `users.role` (default at registration) | Only role self-registration can produce |
| `admin` | `users.role` | Cannot be self-assigned (`extra="forbid"` + server sets role). The FIRST admin is created with `scripts/admin_cli.py`; after that an admin can create admins / change roles in Admin → User Management (`/api/admin/users`, added in the pharmacy merge) |
| pharmacy **owner / pharmacist / inventory** | `pharmacy_staff.staff_role` (membership) | **Introduced by Phase 1.** Before it, "pharmacist" was only a comment and a header value |

**Separation of duties (pharmacy merge):** an `admin` cannot also hold a pharmacy membership. Enforced in
`POST /api/admin/users`, `PATCH /api/admin/users/{id}/role` and `POST /api/pharmacies/{id}/staff`.
The last active admin cannot be demoted. A role change revokes all of that user's sessions.

No `clinician` role exists anywhere in the code, so none is modelled. If you add one,
the context rules (Phase 4C) need a verified treatment relationship first.

## Staff permissions
| Permission | owner | pharmacist | inventory |
|---|:-:|:-:|:-:|
| pharmacy.read | ✔ | ✔ | ✔ |
| prescription.read / review | ✔ | ✔ | – |
| inventory.read | ✔ | ✔ | ✔ |
| inventory.write | ✔ | – | ✔ |
| pharmacy.manage (edit pharmacy/branches, staff, submit verification) | ✔ | – | – |

## Endpoint access
| Area | Anonymous | Patient | Staff (own branch) | Owner | Admin |
|---|:-:|:-:|:-:|:-:|:-:|
| `/register`, `/login`, `/api/branches/public` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `/predict*`, `/history`, `/dashboard-history`, `/save-history` (own data) | – | ✔ | ✔ | ✔ | ✔ |
| Upload / read **own** prescription | – | ✔ | ✔ | ✔ | ✔ |
| Prescription queue / detail / review | – | – | per permission | ✔ | – |
| Inventory | – | – | per permission | ✔ | – |
| Edit pharmacy, branches, staff | – | – | – | ✔ | staff mgmt only |
| Approve/reject pharmacy verification, `/users`, skin-defense health | – | – | – | – | ✔ |

Admin deliberately has **no** pharmacist/inventory powers (separation of duties).
The authoritative list per route is `generated/endpoint_inventory.md`.
