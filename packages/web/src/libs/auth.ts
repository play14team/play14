import "server-only"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type { Player, UploadFile } from "@/models/strapi"

// ============================================================================
// TYPES
// ============================================================================

export interface StrapiUser {
  id: number
  documentId: string
  username: string
  email: string
  provider: string
  confirmed: boolean
  blocked: boolean
  createdAt: string
  updatedAt: string
  player?: Player
}

export interface Session {
  jwt: string
  user: StrapiUser
}

export interface AuthState {
  isAuthenticated: boolean
  user: StrapiUser | null
  player: Player | null
}

// ============================================================================
// CONSTANTS
// ============================================================================

const AUTH_COOKIE_NAME = "play14_auth"
const STRAPI_URL = process.env.STRAPI_API_URL || "http://localhost:1337"

// ============================================================================
// COOKIE MANAGEMENT
// ============================================================================

/**
 * Get the auth cookie value
 */
export async function getAuthCookie(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get(AUTH_COOKIE_NAME)?.value
}

/**
 * Set the auth cookie with JWT token
 */
export async function setAuthCookie(jwt: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(AUTH_COOKIE_NAME, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  })
}

/**
 * Clear the auth cookie
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(AUTH_COOKIE_NAME)
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Get the current user from Strapi using the JWT token
 * Note: This function can be called from layouts/pages, so it cannot modify cookies.
 * Invalid tokens will just return null - the cookie will be cleared on next sign-out
 * or when the user tries to access a protected route.
 */
export async function getCurrentUser(): Promise<StrapiUser | null> {
  const jwt = await getAuthCookie()
  console.log("[Auth] getCurrentUser - JWT present:", !!jwt)
  if (!jwt) return null

  try {
    const url = `${STRAPI_URL}/api/users/me?populate=player.avatar`
    console.log("[Auth] Fetching user from:", url)
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      cache: "no-store",
    })

    console.log("[Auth] Response status:", response.status)
    if (!response.ok) {
      // Token expired or invalid - return null
      // Cookie clearing is handled by signout or middleware
      const errorText = await response.text()
      console.error("[Auth] Token validation failed:", errorText)
      return null
    }

    const user = await response.json()
    console.log("[Auth] User fetched successfully:", user.email, "- Player:", user.player ? user.player.name : "none")
    return user
  } catch (error) {
    console.error("[Auth] Failed to get current user:", error)
    return null
  }
}

/**
 * Get the full auth state (used by components)
 */
export async function getAuthState(): Promise<AuthState> {
  const user = await getCurrentUser()

  return {
    isAuthenticated: !!user,
    user,
    player: user?.player || null,
  }
}

/**
 * Get session (requires authentication, throws if not authenticated)
 */
export async function getSession(): Promise<Session> {
  const jwt = await getAuthCookie()
  if (!jwt) {
    throw new Error("Not authenticated")
  }

  const user = await getCurrentUser()
  if (!user) {
    throw new Error("Session expired")
  }

  return { jwt, user }
}

// ============================================================================
// AUTH GUARDS
// ============================================================================

/**
 * Require authentication - redirects to login if not authenticated
 */
export async function requireAuth(callbackUrl?: string): Promise<Session> {
  const jwt = await getAuthCookie()
  if (!jwt) {
    const params = callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""
    redirect(`/auth/login${params}`)
  }

  const user = await getCurrentUser()
  if (!user) {
    const params = callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""
    redirect(`/auth/login${params}`)
  }

  return { jwt, user }
}

/**
 * Require player profile - redirects if user has no linked player
 */
export async function requirePlayer(callbackUrl?: string): Promise<Session & { player: Player }> {
  const session = await requireAuth(callbackUrl)

  if (!session.user.player) {
    redirect("/auth/no-player")
  }

  return {
    ...session,
    player: session.user.player,
  }
}

/**
 * Require Founder role - redirects if user is not a Founder
 */
export async function requireFounder(callbackUrl?: string): Promise<Session & { player: Player }> {
  const session = await requirePlayer(callbackUrl)

  if (session.player.position !== "Founder") {
    redirect("/admin")
  }

  return session
}

/**
 * Require Organizer role - redirects if user is not Host, Mentor, or Founder
 */
export async function requireOrganizer(callbackUrl?: string): Promise<Session & { player: Player }> {
  const session = await requirePlayer(callbackUrl)

  const position = session.player.position || ""
  const isOrganizer = ["Host", "Mentor", "Founder"].includes(position)

  if (!isOrganizer) {
    redirect("/admin")
  }

  return session
}

// ============================================================================
// AUTH ACTIONS (for server actions)
// ============================================================================

/**
 * Handle OAuth callback - store JWT and redirect
 */
export async function handleOAuthCallback(
  accessToken: string,
  redirectTo: string = "/admin"
): Promise<void> {
  await setAuthCookie(accessToken)
  redirect(redirectTo)
}

/**
 * Sign out - clear cookie and redirect
 */
export async function signOut(redirectTo: string = "/"): Promise<void> {
  await clearAuthCookie()
  redirect(redirectTo)
}

// ============================================================================
// STRAPI AUTH HELPERS
// ============================================================================

export type OAuthProvider = "google" | "microsoft" | "github" | "linkedin"

/**
 * Get the OAuth connect URL for a provider
 */
export function getOAuthConnectUrl(provider: OAuthProvider): string {
  return `${STRAPI_URL}/api/connect/${provider}`
}

/**
 * Get the OAuth callback URL that Strapi will redirect to
 */
export function getOAuthCallbackUrl(provider: OAuthProvider): string {
  const frontendUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  return `${frontendUrl}/connect/${provider}/redirect`
}
