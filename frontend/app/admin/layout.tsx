"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { BarChart3, Settings, Users, LogOut, AlertTriangle, Home, Shield, Menu, X } from "lucide-react"

import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    // Check if user is logged in and is an admin
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true"
    if (!isLoggedIn) {
      router.push("/login")
      return
    }

    // Get user data
    const userData = localStorage.getItem("user")
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)

      // Check if user is an admin
      if (parsedUser.role !== "admin") {
        router.push("/dashboard")
        return
      }
    }

    setLoading(false)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn")
    localStorage.removeItem("user")
    router.push("/login")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-muted">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 flex-col bg-secondary text-white">
        <div className="p-4 border-b border-secondary-700">
          <Logo asLink={false} />
          <div className="mt-2 px-2 py-1 bg-primary/20 rounded text-xs">Admin Portal</div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">ADMIN CONTROLS</span>
            </div>
            <nav className="space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-secondary-700"
                onClick={() => router.push("/admin")}
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-secondary-700"
                onClick={() => router.push("/admin/users")}
              >
                <Users className="mr-2 h-4 w-4" />
                User Management
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-secondary-700"
                onClick={() => router.push("/admin/settings")}
              >
                <Settings className="mr-2 h-4 w-4" />
                System Settings
              </Button>
            </nav>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Home className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">WEBSITE</span>
            </div>
            <nav className="space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-secondary-700"
                onClick={() => router.push("/")}
              >
                <Home className="mr-2 h-4 w-4" />
                Back to Website
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-secondary-700"
                onClick={() => router.push("/dashboard")}
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                User Dashboard
              </Button>
            </nav>
          </div>
        </div>
        <div className="p-4 border-t border-secondary-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-300">{user?.email}</p>
            </div>
          </div>
          <Button variant="destructive" className="w-full" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="md:hidden">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-40 bg-secondary text-white">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 bg-secondary text-white p-0 border-r-0">
            <div className="p-4 border-b border-secondary-700 flex justify-between items-center">
              <Logo asLink={false} />
              <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">ADMIN CONTROLS</span>
                </div>
                <nav className="space-y-1">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-white hover:bg-secondary-700"
                    onClick={() => {
                      router.push("/admin")
                      setMobileMenuOpen(false)
                    }}
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Dashboard
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-white hover:bg-secondary-700"
                    onClick={() => {
                      router.push("/admin/users")
                      setMobileMenuOpen(false)
                    }}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    User Management
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-white hover:bg-secondary-700"
                    onClick={() => {
                      router.push("/admin/settings")
                      setMobileMenuOpen(false)
                    }}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    System Settings
                  </Button>
                </nav>
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Home className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">WEBSITE</span>
                </div>
                <nav className="space-y-1">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-white hover:bg-secondary-700"
                    onClick={() => {
                      router.push("/")
                      setMobileMenuOpen(false)
                    }}
                  >
                    <Home className="mr-2 h-4 w-4" />
                    Back to Website
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-white hover:bg-secondary-700"
                    onClick={() => {
                      router.push("/dashboard")
                      setMobileMenuOpen(false)
                    }}
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    User Dashboard
                  </Button>
                </nav>
              </div>

              <div className="pt-6 mt-6 border-t border-secondary-700">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-gray-300">{user?.email}</p>
                  </div>
                </div>
                <Button variant="destructive" className="w-full" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center px-4 md:px-6 sticky top-0 z-30">
          <div className="flex items-center w-full justify-between">
            <div className="flex items-center">
              <div className="hidden md:block">
                <h1 className="text-xl font-bold text-secondary">Admin Dashboard</h1>
              </div>
              <div className="md:hidden flex items-center">
                <div className="ml-12">
                  <Logo asLink={false} />
                </div>
                <div className="ml-2 px-2 py-1 bg-primary/20 text-primary rounded text-xs">Admin</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/admin/notifications")}
                className="relative"
              >
                <AlertTriangle className="h-4 w-4" />
                <span className="sr-only">Notifications</span>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                  3
                </div>
              </Button>
              <div className="hidden md:flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {user?.firstName} {user?.lastName}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
