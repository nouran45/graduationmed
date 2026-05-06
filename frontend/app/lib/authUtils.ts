// lib/auth.ts
export async function verifyAuth() {
    // Server-side verification for production
    if (typeof window === "undefined") {
      const { cookies } = await import("next/headers")
      const token = (await cookies()).get("authToken")?.value
      return !!token // Simplified - verify JWT properly in production
    }
  
    // Client-side fallback
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('authToken='))
      ?.split('=')[1]
  
    if (!token) return false
  
    try {
      const res = await fetch("/api/verify", {
        headers: { Authorization: `Bearer ${token}` }
      })
      return res.ok
    } catch {
      return false
    }
  }
export const verifyToken = (token: string): boolean => {
    // Replace this with real JWT verification logic
    return token === "valid-token"
  }
  