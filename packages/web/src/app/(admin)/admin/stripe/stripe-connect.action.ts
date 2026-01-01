"use server"

import { getAuthCookie } from "@/libs/auth"

const STRAPI_URL = process.env.STRAPI_API_URL || "http://localhost:1337"

// Types for Stripe Connect
export interface StripeAccountStatus {
  documentId: string
  stripeAccountId: string
  accountStatus: "pending" | "active" | "restricted" | "disabled"
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  country?: string
  defaultCurrency?: string
  businessName?: string
  onboardingCompletedAt?: string
}

export interface CreateAccountResult {
  success: boolean
  data?: {
    documentId: string
    stripeAccountId: string
    accountStatus: string
  }
  error?: string
}

export interface OnboardingLinkResult {
  success: boolean
  url?: string
  expiresAt?: string
  error?: string
}

export interface DashboardLinkResult {
  success: boolean
  url?: string
  error?: string
}

export interface LinkAccountResult {
  success: boolean
  error?: string
}

export interface HostStripeAccount {
  documentId: string
  stripeAccountId: string
  accountStatus: "pending" | "active" | "restricted" | "disabled"
  chargesEnabled: boolean
  payoutsEnabled: boolean
  ownerName: string
  ownerDocumentId: string
  ownerRole: "host" | "mentor"
}

/**
 * Get the current user's Stripe account status
 */
export async function getStripeAccountStatus(): Promise<StripeAccountStatus | null> {
  const jwt = await getAuthCookie()
  if (!jwt) return null

  try {
    const response = await fetch(`${STRAPI_URL}/api/stripe/connect/status`, {
      headers: { Authorization: `Bearer ${jwt}` },
      cache: "no-store",
    })

    if (!response.ok) return null
    const data = await response.json()
    return data.data || null
  } catch {
    return null
  }
}

/**
 * Create a new Stripe Express connected account
 */
export async function createStripeAccount(
  country: string = "FR",
  businessType: "individual" | "company" = "individual"
): Promise<CreateAccountResult> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const response = await fetch(`${STRAPI_URL}/api/stripe/connect/create-account`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ country, businessType }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error?.message || `Failed to create account (${response.status})`,
      }
    }

    const data = await response.json()
    return {
      success: true,
      data: data.data,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

/**
 * Get onboarding URL to complete Stripe setup
 */
export async function getOnboardingUrl(returnPath: string): Promise<OnboardingLinkResult> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  // Build absolute URLs using the web app's base URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const returnUrl = `${baseUrl}${returnPath}`
  const refreshUrl = `${baseUrl}${returnPath}?refresh=true`

  try {
    const response = await fetch(
      `${STRAPI_URL}/api/stripe/connect/onboarding-link?returnUrl=${encodeURIComponent(returnUrl)}&refreshUrl=${encodeURIComponent(refreshUrl)}`,
      {
        headers: { Authorization: `Bearer ${jwt}` },
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error?.message || `Failed to get onboarding link (${response.status})`,
      }
    }

    const data = await response.json()
    return {
      success: true,
      url: data.data.url,
      expiresAt: data.data.expiresAt,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

/**
 * Get Stripe Express dashboard URL
 */
export async function getDashboardUrl(): Promise<DashboardLinkResult> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const response = await fetch(`${STRAPI_URL}/api/stripe/connect/dashboard-link`, {
      headers: { Authorization: `Bearer ${jwt}` },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error?.message || `Failed to get dashboard link (${response.status})`,
      }
    }

    const data = await response.json()
    return {
      success: true,
      url: data.data.url,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

/**
 * Get all Stripe accounts from hosts/mentors of an event
 */
export async function getEventHostAccounts(eventId: string): Promise<HostStripeAccount[]> {
  const jwt = await getAuthCookie()
  if (!jwt) return []

  try {
    const response = await fetch(`${STRAPI_URL}/api/stripe/connect/event/${eventId}/accounts`, {
      headers: { Authorization: `Bearer ${jwt}` },
      cache: "no-store",
    })

    if (!response.ok) return []
    const data = await response.json()
    return data.data || []
  } catch {
    return []
  }
}

/**
 * Link a Stripe account to an event
 * @param eventId - The event to link the account to
 * @param stripeAccountId - The specific Stripe account ID to link (required for explicit selection)
 */
export async function linkStripeAccountToEvent(
  eventId: string,
  stripeAccountId: string
): Promise<LinkAccountResult> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const response = await fetch(`${STRAPI_URL}/api/stripe/connect/link-event/${eventId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ stripeAccountId }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error?.message || `Failed to link account (${response.status})`,
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

/**
 * Unlink Stripe account from an event
 */
export async function unlinkStripeAccountFromEvent(eventId: string): Promise<LinkAccountResult> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const response = await fetch(`${STRAPI_URL}/api/stripe/connect/unlink-event/${eventId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error?.message || `Failed to unlink account (${response.status})`,
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}
