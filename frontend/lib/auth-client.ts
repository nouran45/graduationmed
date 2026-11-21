/**
 * Single place for everything the browser does about authentication.
 *
 * WHAT IS TRUSTED?  Nothing in this file is a security control.
 * The backend verifies the token + server-side session on every request and
 * decides every permission. localStorage values (`user`, `isLoggedIn`) are
 * only used to decide what to *draw* (menus, redirects). Editing them in the
 * browser console can show a menu, but can never unlock data.
 *
 * Token storage: we keep the JWT in localStorage under "access_token" (the key
 * the existing pages already use). Cookies were considered and rejected for
 * now: the API (hf.space) and the site (vercel.app) are different sites, so
 * authentication cookies would need SameSite=None + CSRF protection and are
 * increasingly blocked by browsers. The XSS-theft risk of localStorage is
 * limited by a short token life, server-side revocation (/logout) and the
 * absence of dangerouslySetInnerHTML on user data.
 */

export const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "")

const TOKEN_KEY = "access_token"
const USER_KEY = "user"
const LOGGED_IN_KEY = "isLoggedIn"
const ACTIVE_BRANCH_KEY = "active_branch_id"

// Old keys some pages used to read/write. Always cleaned on logout.
const LEGACY_KEYS = ["authToken", "token"]

/** Placeholder meaning "let the server pick my (only) branch". */
export const AUTO_BRANCH = "auto"

export interface SessionUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  memberships?: { pharmacy_id: string; staff_role: string; branch_ids: string[] | null }[]
}

export class ApiError extends Error {
  status: number
  retryAfter?: number
  constructor(message: string, status: number, retryAfter?: number) {
    super(message)
    this.status = status
    this.retryAfter = retryAfter
  }
}

const isBrowser = () => typeof window !== "undefined"

export function getToken(): string | null {
  return isBrowser() ? localStorage.getItem(TOKEN_KEY) : null
}

export function saveSession(token: string, user: unknown): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user ?? {}))
  localStorage.setItem(LOGGED_IN_KEY, "true")
}

export function clearSession(): void {
  if (!isBrowser()) return
  for (const k of [TOKEN_KEY, USER_KEY, LOGGED_IN_KEY, ACTIVE_BRANCH_KEY, ...LEGACY_KEYS]) {
    localStorage.removeItem(k)
  }
}

export function getCachedUser(): SessionUser | null {
  if (!isBrowser()) return null
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null")
  } catch {
    return null
  }
}

/** Branch the staff member picked (only a *selector*; the server re-checks it). */
export function getActiveBranchId(): string | null {
  return isBrowser() ? localStorage.getItem(ACTIVE_BRANCH_KEY) : null
}
export function setActiveBranchId(id: string): void {
  localStorage.setItem(ACTIVE_BRANCH_KEY, id)
}

/** X-Branch-ID header for pharmacy-staff calls; omitted => server resolves it. */
export function branchHeader(branchId?: string): Record<string, string> {
  const id = branchId && branchId !== AUTO_BRANCH ? branchId : getActiveBranchId()
  return id ? { "X-Branch-ID": id } : {}
}

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json()
    const d = body?.detail
    if (typeof d === "string") return d
    if (Array.isArray(d))
      return d.map((e: any) => (e?.msg ? String(e.msg) : JSON.stringify(e))).join("\n")
    if (body?.message) return String(body.message)
  } catch {
    /* fall through */
  }
  return res.status === 429
    ? "Too many requests. Please wait a moment and try again."
    : res.statusText || `Request failed (${res.status})`
}

/**
 * fetch() with the bearer token attached. A 401 means the session is gone
 * (expired / logged out / revoked by an administrator or the security
 * system): clear local state and send the user to /login.
 */
export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  const token = getToken()
  if (token) headers.set("Authorization", `Bearer ${token}`)
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  const url = path.startsWith("http") ? path : `${API_BASE}${path}`
  const res = await fetch(url, { ...init, headers })

  if (res.status === 401 && isBrowser()) {
    clearSession()
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = "/login"
    }
  }
  return res
}

/** authFetch + JSON parsing + uniform errors (ApiError). */
export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await authFetch(path, init)
  if (!res.ok) {
    const retry = Number(res.headers.get("Retry-After")) || undefined
    throw new ApiError(await readError(res), res.status, retry)
  }
  return (await res.json()) as T
}

/** Ask the SERVER who we are (authoritative role + memberships). */
export async function fetchMe(): Promise<SessionUser> {
  const me = await apiJson<SessionUser>("/users/me")
  localStorage.setItem(USER_KEY, JSON.stringify(me))
  return me
}

export async function login(email: string, password: string): Promise<SessionUser> {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const retry = Number(res.headers.get("Retry-After")) || undefined
    const msg = await readError(res)
    throw new ApiError(
      res.status === 429 && retry ? `${msg} (try again in ${Math.ceil(retry / 60)} min)` : msg,
      res.status,
      retry,
    )
  }
  const data = await res.json()
  if (!data.access_token) throw new Error("No access token received")
  saveSession(data.access_token, data.user)
  return data.user as SessionUser
}

/** Revoke the session on the server, then forget everything locally. */
export async function logout(redirectTo: string | null = "/"): Promise<void> {
  try {
    const token = getToken()
    if (token) {
      await fetch(`${API_BASE}/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
    }
  } catch {
    /* offline: still clear locally */
  }
  clearSession()
  if (redirectTo && isBrowser()) window.location.href = redirectTo
}
