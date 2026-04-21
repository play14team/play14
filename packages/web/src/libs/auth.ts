import "server-only"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getLocale } from "next-intl/server"
import { routing } from "@/i18n/routing"
import type { Player } from "@/models/strapi"

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

/**
 * Get the locale prefix for URLs.
 * With localePrefix "as-needed", the default locale has no prefix.
 */
async function getLocalePrefix(): Promise<string> {
  const locale = await getLocale()
  return locale === routing.defaultLocale ? "" : `/${locale}`
}

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
  if (!jwt) return null

  try {
    const response = await fetch(`${STRAPI_URL}/api/users/me?populate=player.avatar`, {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      cache: "no-store",
    })

    // A non-OK status here is expected when the cookie's JWT has expired — it
    // just means "no session", handled by the caller. Don't log it.
    if (!response.ok) return null

    return (await response.json()) as StrapiUser
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
    const prefix = await getLocalePrefix()
    const params = callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""
    redirect(`${prefix}/auth/login${params}`)
  }

  const user = await getCurrentUser()
  if (!user) {
    const prefix = await getLocalePrefix()
    const params = callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""
    redirect(`${prefix}/auth/login${params}`)
  }

  return { jwt, user }
}

/**
 * Require player profile - redirects if user has no linked player
 */
export async function requirePlayer(callbackUrl?: string): Promise<Session & { player: Player }> {
  const session = await requireAuth(callbackUrl)

  if (!session.user.player) {
    const prefix = await getLocalePrefix()
    redirect(`${prefix}/auth/no-player`)
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
    const prefix = await getLocalePrefix()
    redirect(`${prefix}/admin`)
  }

  return session
}

/**
 * Require Organizer role - redirects if user is not Host, Mentor, or Founder
 */
export async function requireOrganizer(
  callbackUrl?: string
): Promise<Session & { player: Player }> {
  const session = await requirePlayer(callbackUrl)

  const position = session.player.position || ""
  const isOrganizer = ["Host", "Mentor", "Founder"].includes(position)

  if (!isOrganizer) {
    const prefix = await getLocalePrefix()
    redirect(`${prefix}/admin`)
  }

  return session
}

// ============================================================================
// AUTH ACTIONS (for server actions)
// ============================================================================

/**
 * Handle OAuth callback - store JWT and redirect
 */
export async function handleOAuthCallback(accessToken: string, redirectTo?: string): Promise<void> {
  await setAuthCookie(accessToken)
  const prefix = await getLocalePrefix()
  redirect(redirectTo || `${prefix}/admin`)
}

/**
 * Sign out - clear cookie and redirect
 */
export async function signOut(redirectTo?: string): Promise<void> {
  await clearAuthCookie()
  const prefix = await getLocalePrefix()
  redirect(redirectTo || `${prefix}/`)
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
