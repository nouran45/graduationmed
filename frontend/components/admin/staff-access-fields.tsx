"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { STAFF_ROLE_LABEL, type AdminPharmacy, type StaffAssignment, type StaffRole } from "@/lib/admin-api"

/**
 * Pharmacy / staff role / branch picker used by the admin user dialogs.
 * `value.branch_ids === null` means "all branches of this pharmacy".
 */
export function StaffAccessFields({
    pharmacies,
    value,
    onChange,
}: {
    pharmacies: AdminPharmacy[]
    value: StaffAssignment
    onChange: (next: StaffAssignment) => void
}) {
    const pharmacy = pharmacies.find((p) => p.pharmacy_id === value.pharmacy_id)
    const allBranches = value.branch_ids === null

    function toggleBranch(branchId: string) {
        const current = value.branch_ids ?? []
        const next = current.includes(branchId)
            ? current.filter((b) => b !== branchId)
            : [...current, branchId]
        onChange({ ...value, branch_ids: next })
    }

    if (pharmacies.length === 0) {
        return (
            <p className="rounded-md border border-dashed p-3 text-sm text-gray-500">
                No pharmacies exist yet. A pharmacy is created by its owner (POST /api/pharmacies) and then
                approved by an administrator.
            </p>
        )
    }

    return (
        <div className="space-y-3 rounded-md border p-3">
            <div className="space-y-1">
                <Label>Pharmacy</Label>
                <Select
                    value={value.pharmacy_id}
                    onValueChange={(pharmacy_id) => onChange({ ...value, pharmacy_id, branch_ids: null })}
                >
                    <SelectTrigger><SelectValue placeholder="Choose a pharmacy" /></SelectTrigger>
                    <SelectContent>
                        {pharmacies.map((p) => (
                            <SelectItem key={p.pharmacy_id} value={p.pharmacy_id}>
                                {p.name ?? p.pharmacy_id}
                                {p.verification_status && p.verification_status !== "approved" ? ` (${p.verification_status})` : ""}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-1">
                <Label>Staff role</Label>
                <Select value={value.staff_role} onValueChange={(r) => onChange({ ...value, staff_role: r as StaffRole })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {(Object.keys(STAFF_ROLE_LABEL) as StaffRole[]).map((r) => (
                            <SelectItem key={r} value={r}>{STAFF_ROLE_LABEL[r]}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                    Owner: manages the pharmacy and stock. Pharmacist: reviews prescriptions, reads stock.
                    Inventory staff: manages stock only.
                </p>
            </div>

            {pharmacy && (
                <div className="space-y-2">
                    <Label>Branch access</Label>
                    <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                            checked={allBranches}
                            onCheckedChange={(c) => onChange({ ...value, branch_ids: c ? null : [] })}
                        />
                        All branches of this pharmacy
                    </label>
                    {!allBranches && (
                        <div className="ml-6 space-y-1">
                            {pharmacy.branches.length === 0 && (
                                <p className="text-xs text-gray-500">This pharmacy has no branches yet.</p>
                            )}
                            {pharmacy.branches.map((b) => (
                                <label key={b.branch_id} className="flex items-center gap-2 text-sm">
                                    <Checkbox
                                        checked={(value.branch_ids ?? []).includes(b.branch_id)}
                                        onCheckedChange={() => toggleBranch(b.branch_id)}
                                    />
                                    {b.branch_name ?? b.branch_id}
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
