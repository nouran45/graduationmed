"use client"

/**
 * Admin dialogs for creating accounts with a role and for managing an existing account's access.
 *
 * These are convenience UI only: every action is authorised again by the backend
 * (require_admin + separation-of-duties + last-admin checks) and logged as a security event.
 */
import { useState } from "react"

import { StaffAccessFields } from "@/components/admin/staff-access-fields"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    STAFF_ROLE_LABEL,
    changeRole,
    createUser,
    grantStaff,
    revokeStaff,
    type AdminPharmacy,
    type Membership,
    type PlatformRole,
    type StaffAssignment,
} from "@/lib/admin-api"

type AccountType = "patient" | "admin" | "staff"

const EMPTY_STAFF: StaffAssignment = { pharmacy_id: "", staff_role: "pharmacist", branch_ids: null }

function errorText(e: unknown): string {
    return e instanceof Error ? e.message : "Something went wrong"
}

export function pharmacyName(pharmacies: AdminPharmacy[], id: string): string {
    return pharmacies.find((p) => p.pharmacy_id === id)?.name ?? id
}

export function branchesText(pharmacies: AdminPharmacy[], m: Membership): string {
    if (m.branch_ids === null) return "all branches"
    const ph = pharmacies.find((p) => p.pharmacy_id === m.pharmacy_id)
    return m.branch_ids.map((b) => ph?.branches.find((x) => x.branch_id === b)?.branch_name ?? b).join(", ")
}

function staffIsComplete(s: StaffAssignment): boolean {
    return s.pharmacy_id !== "" && (s.branch_ids === null || s.branch_ids.length > 0)
}

/* ------------------------------------------------------------------ create */

export function CreateUserDialog({
    open,
    onOpenChange,
    pharmacies,
    onCreated,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    pharmacies: AdminPharmacy[]
    onCreated: () => void
}) {
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [type, setType] = useState<AccountType>("patient")
    const [staff, setStaff] = useState<StaffAssignment>(EMPTY_STAFF)
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)

    function reset() {
        setFirstName(""); setLastName(""); setEmail(""); setPassword("")
        setType("patient"); setStaff(EMPTY_STAFF); setError(null)
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        if (type === "staff" && !staffIsComplete(staff)) {
            setError("Choose a pharmacy and at least one branch (or all branches).")
            return
        }
        setBusy(true)
        try {
            await createUser({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim(),
                password,
                role: type === "admin" ? "admin" : "patient",
                ...(type === "staff" ? { staff } : {}),
            })
            reset()
            onOpenChange(false)
            onCreated()
        } catch (err) {
            setError(errorText(err))
        } finally {
            setBusy(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o) }}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                    <DialogDescription>Create a new user account and assign role permissions</DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label htmlFor="nu-first">First name</Label>
                            <Input id="nu-first" required maxLength={80} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="nu-last">Last name</Label>
                            <Input id="nu-last" required maxLength={80} value={lastName} onChange={(e) => setLastName(e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="nu-email">Email</Label>
                        <Input id="nu-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="nu-pass">Temporary password</Label>
                        <Input id="nu-pass" type="password" required minLength={10} maxLength={256} autoComplete="new-password"
                            value={password} onChange={(e) => setPassword(e.target.value)} />
                        <p className="text-xs text-gray-500">
                            At least 10 characters, not a common password. Give it to the user privately and ask them to change it.
                        </p>
                    </div>

                    <div className="space-y-1">
                        <Label>Account type</Label>
                        <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="patient">Patient</SelectItem>
                                <SelectItem value="staff">Pharmacy staff (owner / pharmacist / inventory)</SelectItem>
                                <SelectItem value="admin">Administrator</SelectItem>
                            </SelectContent>
                        </Select>
                        {type === "admin" && (
                            <p className="text-xs text-amber-700">
                                Administrators have full access to the platform and cannot also be pharmacy staff.
                            </p>
                        )}
                    </div>

                    {type === "staff" && <StaffAccessFields pharmacies={pharmacies} value={staff} onChange={setStaff} />}

                    {error && <p role="alert" className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={busy}>{busy ? "Creating..." : "Create account"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

/* ------------------------------------------------------------------ manage */

export interface ManagedUser {
    id: string
    name: string
    email: string
    role: string
    memberships: Membership[]
}

export function ManageAccessDialog({
    user,
    onOpenChange,
    pharmacies,
    onChanged,
}: {
    user: ManagedUser | null
    onOpenChange: (open: boolean) => void
    pharmacies: AdminPharmacy[]
    onChanged: () => void
}) {
    const [role, setRole] = useState<PlatformRole>("patient")
    const [staff, setStaff] = useState<StaffAssignment>(EMPTY_STAFF)
    const [error, setError] = useState<string | null>(null)
    const [notice, setNotice] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const [loadedFor, setLoadedFor] = useState<string | null>(null)

    // reset the form whenever a different user is opened
    if (user && loadedFor !== user.id) {
        setLoadedFor(user.id)
        setRole(user.role === "admin" ? "admin" : "patient")
        setStaff(EMPTY_STAFF)
        setError(null)
        setNotice(null)
    }

    async function run(action: () => Promise<string>) {
        setBusy(true); setError(null); setNotice(null)
        try {
            setNotice(await action())
            onChanged()
        } catch (err) {
            setError(errorText(err))
        } finally {
            setBusy(false)
        }
    }

    if (!user) return null
    const isAdmin = user.role === "admin"

    return (
        <Dialog open={user !== null} onOpenChange={(o) => { if (!o) setLoadedFor(null); onOpenChange(o) }}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Manage access</DialogTitle>
                    <DialogDescription>{user.name} · {user.email}</DialogDescription>
                </DialogHeader>

                <section className="space-y-2">
                    <h4 className="text-sm font-semibold">Platform role</h4>
                    <div className="flex gap-2">
                        <Select value={role} onValueChange={(v) => setRole(v as PlatformRole)}>
                            <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="patient">Patient</SelectItem>
                                <SelectItem value="admin">Administrator</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            disabled={busy || role === (isAdmin ? "admin" : "patient")}
                            onClick={() => run(async () => {
                                const r = await changeRole(user.id, role)
                                return r.changed
                                    ? `Role changed. ${r.sessions_revoked} active session(s) were signed out.`
                                    : "No change."
                            })}
                        >
                            Save role
                        </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                        Changing the role signs the user out everywhere; the new role applies at their next sign-in.
                    </p>
                </section>

                <section className="space-y-2 border-t pt-4">
                    <h4 className="text-sm font-semibold">Pharmacy staff access</h4>
                    {user.memberships.length === 0 ? (
                        <p className="text-sm text-gray-500">No pharmacy access.</p>
                    ) : (
                        <ul className="space-y-1">
                            {user.memberships.map((m) => (
                                <li key={m.pharmacy_id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                                    <span>
                                        <strong>{STAFF_ROLE_LABEL[m.staff_role] ?? m.staff_role}</strong> at{" "}
                                        {pharmacyName(pharmacies, m.pharmacy_id)} ({branchesText(pharmacies, m)})
                                    </span>
                                    <Button
                                        size="sm" variant="outline" className="text-red-600" disabled={busy}
                                        onClick={() => run(async () => {
                                            await revokeStaff(m.pharmacy_id, user.id)
                                            return "Pharmacy access removed."
                                        })}
                                    >
                                        Remove
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}

                    {isAdmin ? (
                        <p className="text-xs text-amber-700">
                            Administrators cannot hold pharmacy staff access. Change the role to Patient first.
                        </p>
                    ) : (
                        <>
                            <StaffAccessFields pharmacies={pharmacies} value={staff} onChange={setStaff} />
                            <Button
                                variant="secondary"
                                disabled={busy || !staffIsComplete(staff)}
                                onClick={() => run(async () => {
                                    await grantStaff(user.email, staff)
                                    setStaff(EMPTY_STAFF)
                                    return "Pharmacy access granted (replaces any previous access to that pharmacy)."
                                })}
                            >
                                Grant access
                            </Button>
                        </>
                    )}
                </section>

                {error && <p role="alert" className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}
                {notice && <p className="rounded-md bg-green-50 p-2 text-sm text-green-700">{notice}</p>}
            </DialogContent>
        </Dialog>
    )
}
