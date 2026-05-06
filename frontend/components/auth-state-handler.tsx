"use client"

import { useEffect, useState } from 'react'
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function AuthStateHandler() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true'
    setIsLoggedIn(loggedIn)
  }, [])

  if (!isClient) {
    // Server render - show default state
    return (
      <div className="flex items-center gap-4">
        <Link href="/login">
          <Button
            variant="outline"
            size="sm"
            className="hidden md:flex border-primary text-primary hover:bg-primary hover:text-white"
          >
            Sign In
          </Button>
        </Link>
        <Link href="/symptom-checker">
          <Button size="sm" className="bg-primary text-white hover:bg-primary/90">
            Get Started
          </Button>
        </Link>
      </div>
    )
  }

  // Client render - show based on auth state
  if (isLoggedIn) {
    return (
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button
            variant="outline"
            size="sm"
            className="border-primary text-primary hover:bg-primary hover:text-white"
          >
            Dashboard
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4">
      <Link href="/login">
        <Button
          variant="outline"
          size="sm"
          className="hidden md:flex border-primary text-primary hover:bg-primary hover:text-white"
        >
          Sign In
        </Button>
      </Link>
      <Link href="/symptom-checker">
        <Button size="sm" className="bg-primary text-white hover:bg-primary/90">
          Get Started
        </Button>
      </Link>
    </div>
  )
}