"use client"

import { useState, useEffect, useCallback } from "react"
import { apiJson } from "@/lib/auth-client"
import { STAFF_ROLE_LABEL, listPharmacies, type AdminPharmacy, type Membership } from "@/lib/admin-api"
import { CreateUserDialog, ManageAccessDialog, pharmacyName, type ManagedUser } from "@/components/admin/user-role-dialogs"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  MoreHorizontal,
  Download,
  Trash2,
  Edit,
  UserPlus,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"


interface MedicalHistory {
  id: string
  condition: string
  diagnosis_date: string | null
  treatment: string
  notes: string
}

interface User {
  id: string
  name: string
  email: string
  dateJoined: string
  histories: MedicalHistory[]
  // returned by GET /users since the role-management merge
  role?: string
  isDisabled?: boolean
  memberships?: Membership[]
}

export default function UsersManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddUserDialog, setShowAddUserDialog] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [filter, setFilter] = useState<"all" | "withHistory" | "withoutHistory">("all")
  const [pharmacies, setPharmacies] = useState<AdminPharmacy[]>([])
  const [managedUser, setManagedUser] = useState<ManagedUser | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      // Same API base as the rest of the app; token attached by authFetch.
      // Non-admins get 403 from the server regardless of what the UI shows.
      const data = await apiJson<User[]>("/users")
      setUsers(data)
      // keep an open "Manage access" dialog in sync with the refreshed row
      setManagedUser((open) => {
        if (!open) return open
        const row = data.find((u) => u.id === open.id)
        return row ? toManaged(row) : null
      })
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
    listPharmacies().then(setPharmacies).catch((error) => console.error("Error fetching pharmacies:", error))
  }, [fetchUsers])

  
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())

    if (filter === "withHistory" && user.histories.length === 0) {
      return false
    }
    if (filter === "withoutHistory" && user.histories.length > 0) {
      return false
    }

    return matchesSearch
  })

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prevSelected) =>
      prevSelected.includes(userId)
        ? prevSelected.filter((id) => id !== userId)
        : [...prevSelected, userId]
    )
  }

  const toggleAllUsers = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(filteredUsers.map((user) => user.id))
    }
  }

  const handleDeleteSelected = () => {
    
    console.log("Deleting users with IDs:", selectedUsers)
    setSelectedUsers([])
  }

  return (
    <div>
      
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-secondary">User Management</h2>
          <p className="text-gray-500">Manage user accounts, permissions, and access</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setShowAddUserDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      
      <Card className="mb-8">
        <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filter} onValueChange={(value) => setFilter(value as any)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by history" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="withHistory">With Medical History</SelectItem>
                <SelectItem value="withoutHistory">Without Medical History</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-start md:justify-end">
            {selectedUsers.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteSelected}
                className="text-red-500 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete ({selectedUsers.length})
              </Button>
            )}
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      
      <Card>
        <CardHeader className="p-6 pb-3 flex justify-between items-center">
          <div>
            <CardTitle>User Accounts</CardTitle>
            <CardDescription>Manage all user accounts in the system</CardDescription>
          </div>
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All Users</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="inactive">Inactive</TabsTrigger>
              <TabsTrigger value="suspended">Suspended</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-6 py-3 text-left">
                  <Checkbox
                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                    onCheckedChange={toggleAllUsers}
                    aria-label="Select all users"
                  />
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">User</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Email</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Role</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Date Joined</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Medical History Count</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Search className="h-8 w-8 text-gray-400 mb-2" />
                      <h3 className="text-lg font-medium text-gray-900 mb-1">No users found</h3>
                      <p className="text-gray-500">No users match your search criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-muted/30">
                    <td className="px-6 py-4">
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={() => toggleUserSelection(user.id)}
                        aria-label={`Select ${user.name}`}
                      />
                    </td>
                    <td className="px-6 py-4 font-medium">{user.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{user.email}</td>
                    <td className="px-6 py-4 text-sm">
                      <RoleBadges user={user} pharmacies={pharmacies} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{user.dateJoined}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{user.histories.length}</td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`More options for ${user.name}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onSelect={() => setManagedUser(toManaged(user))}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit User
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Account
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
        <CardFooter className="flex justify-between items-center border-t p-6">
          <div className="text-sm text-gray-500">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        </CardFooter>
      </Card>

      
      <CreateUserDialog
        open={showAddUserDialog}
        onOpenChange={setShowAddUserDialog}
        pharmacies={pharmacies}
        onCreated={fetchUsers}
      />

      <ManageAccessDialog
        user={managedUser}
        onOpenChange={(open) => { if (!open) setManagedUser(null) }}
        pharmacies={pharmacies}
        onChanged={fetchUsers}
      />
    </div>
  )
}

function toManaged(user: User): ManagedUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role ?? "patient",
    memberships: user.memberships ?? [],
  }
}

function RoleBadges({ user, pharmacies }: { user: User; pharmacies: AdminPharmacy[] }) {
  const memberships = user.memberships ?? []
  return (
    <div className="flex flex-wrap gap-1">
      {user.role === "admin" ? (
        <Badge>Administrator</Badge>
      ) : memberships.length === 0 ? (
        <Badge variant="outline">Patient</Badge>
      ) : (
        memberships.map((m) => (
          <Badge key={m.pharmacy_id} variant="secondary">
            {STAFF_ROLE_LABEL[m.staff_role] ?? m.staff_role} · {pharmacyName(pharmacies, m.pharmacy_id)}
          </Badge>
        ))
      )}
      {user.isDisabled && <Badge variant="destructive">Disabled</Badge>}
    </div>
  )
}
