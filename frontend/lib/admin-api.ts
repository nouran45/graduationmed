/**
 * Admin user & role management API.
 *
 * Every call carries the admin's bearer token (authFetch). The backend checks the role
 * from the database on each request; nothing here is a security control by itself.
 */
import { apiJson } from "@/lib/auth-client"

export type PlatformRole = "patient" | "admin"
export type StaffRole = "owner" | "pharmacist" | "inventory"

export interface Membership {
    pharmacy_id: string
    staff_role: StaffRole
    branch_ids: string[] | null          // null = all branches of the pharmacy
}

export interface AdminPharmacy {
    pharmacy_id: string
    name: string | null
    verification_status: string | null
    branches: { branch_id: string; branch_name: string | null }[]
}

export interface StaffAssignment {
    pharmacy_id: string
    staff_role: StaffRole
    branch_ids: string[] | null
}

export interface CreateUserRequest {
    firstName: string
    lastName: string
    email: string
    password: string
    role: PlatformRole
    staff?: StaffAssignment
}

export const STAFF_ROLE_LABEL: Record<StaffRole, string> = {
    owner: "Pharmacy owner",
    pharmacist: "Pharmacist",
    inventory: "Inventory staff",
}

export function listPharmacies(): Promise<AdminPharmacy[]> {
    return apiJson<AdminPharmacy[]>("/api/admin/pharmacies")
}

export function createUser(body: CreateUserRequest) {
    return apiJson<{ user_id: string; email: string; role: PlatformRole; memberships: Membership[] }>(
        "/api/admin/users",
        { method: "POST", body: JSON.stringify(body) },
    )
}

export function changeRole(userId: string, role: PlatformRole) {
    return apiJson<{ user_id: string; role: PlatformRole; changed: boolean; sessions_revoked: number }>(
        `/api/admin/users/${encodeURIComponent(userId)}/role`,
        { method: "PATCH", body: JSON.stringify({ role }) },
    )
}

export function grantStaff(email: string, assignment: StaffAssignment) {
    return apiJson<{ user_id: string; staff_role: StaffRole; branch_ids: string[] | null }>(
        `/api/pharmacies/${encodeURIComponent(assignment.pharmacy_id)}/staff`,
        {
            method: "POST",
            body: JSON.stringify({ email, staff_role: assignment.staff_role, branch_ids: assignment.branch_ids }),
        },
    )
}

export function revokeStaff(pharmacyId: string, userId: string) {
    return apiJson<{ message: string }>(
        `/api/pharmacies/${encodeURIComponent(pharmacyId)}/staff/${encodeURIComponent(userId)}`,
        { method: "DELETE" },
    )
}
