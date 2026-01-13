"use server"

import { strapiFetch, strapiFetchWithQuery } from "@/libs/strapi-client"

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
  const result = await strapiFetch<{ data: StripeAccountStatus }>(
    "/stripe/connect/status",
    {},
    { cache: "no-store" }
  )

  if (!result.ok || !result.data) return null
  return result.data.data || null
}

/**
 * Create a new Stripe Express connected account
 */
export async function createStripeAccount(
  country: string = "FR",
  businessType: "individual" | "company" = "individual"
): Promise<CreateAccountResult> {
  const result = await strapiFetch<{ data: CreateAccountResult["data"] }>(
    "/stripe/connect/create-account",
    {},
    {
      method: "POST",
      body: { country, businessType },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to create account",
    }
  }

  return {
    success: true,
    data: result.data?.data,
  }
}

/**
 * Get onboarding URL to complete Stripe setup
 */
export async function getOnboardingUrl(returnPath: string): Promise<OnboardingLinkResult> {
  // Build absolute URLs using the web app's base URL
  // Check both NEXT_PUBLIC_SITE_URL (used in production) and NEXT_PUBLIC_URL (documented in .env.example)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_URL || "http://localhost:3000"
  const returnUrl = `${baseUrl}${returnPath}`
  const refreshUrl = `${baseUrl}${returnPath}?refresh=true`

  const result = await strapiFetchWithQuery<{ data: { url: string; expiresAt?: string } }>(
    "/stripe/connect/onboarding-link",
    {},
    {
      returnUrl: returnUrl,
      refreshUrl: refreshUrl,
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to get onboarding link",
    }
  }

  return {
    success: true,
    url: result.data?.data.url,
    expiresAt: result.data?.data.expiresAt,
  }
}

/**
 * Get Stripe Express dashboard URL
 */
export async function getDashboardUrl(): Promise<DashboardLinkResult> {
  const result = await strapiFetch<{ data: { url: string } }>(
    "/stripe/connect/dashboard-link",
    {}
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to get dashboard link",
    }
  }

  return {
    success: true,
    url: result.data?.data.url,
  }
}

/**
 * Get all Stripe accounts from hosts/mentors of an event
 */
export async function getEventHostAccounts(eventId: string): Promise<HostStripeAccount[]> {
  const result = await strapiFetch<{ data: HostStripeAccount[] }>(
    "/stripe/connect/event/:eventId/accounts",
    { eventId },
    { cache: "no-store" }
  )

  if (!result.ok || !result.data) return []
  return result.data.data || []
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
  const result = await strapiFetch(
    "/stripe/connect/link-event/:eventId",
    { eventId },
    {
      method: "POST",
      body: { stripeAccountId },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to link account",
    }
  }

  return { success: true }
}

/**
 * Unlink Stripe account from an event
 */
export async function unlinkStripeAccountFromEvent(eventId: string): Promise<LinkAccountResult> {
  const result = await strapiFetch(
    "/stripe/connect/unlink-event/:eventId",
    { eventId },
    { method: "POST" }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to unlink account",
    }
  }

  return { success: true }
}
