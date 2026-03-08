/**
 * LinkedIn OAuth token management
 * Handles token storage, refresh, and retrieval
 */

import type { Core } from "@strapi/strapi"
import { createLogger } from "../observability/logger"
import type { OAuthTokens } from "./types"

const log = createLogger("[LinkedInOAuth]")

/**
 * Get stored OAuth tokens from database
 */
export async function getStoredTokens(strapi: Core.Strapi): Promise<OAuthTokens | null> {
  try {
    const tokenRecord = await strapi.documents("api::linkedin-token.linkedin-token").findFirst({
      fields: ["accessToken", "refreshToken", "expiresAt", "organizationId"],
    })

    if (!tokenRecord) {
      log.warn("No LinkedIn tokens found in database")
      return null
    }

    return {
      accessToken: tokenRecord.accessToken,
      refreshToken: tokenRecord.refreshToken,
      expiresAt: new Date(tokenRecord.expiresAt),
      organizationId: tokenRecord.organizationId,
    }
  } catch (error) {
    log.error("Failed to retrieve LinkedIn tokens", {}, error as Error)
    return null
  }
}

/**
 * Store OAuth tokens in database
 */
export async function storeTokens(strapi: Core.Strapi, tokens: OAuthTokens): Promise<void> {
  try {
    // Check if tokens already exist
    const existing = await strapi.documents("api::linkedin-token.linkedin-token").findFirst({
      fields: ["documentId"],
    })

    if (existing) {
      // Update existing record
      await strapi.documents("api::linkedin-token.linkedin-token").update({
        documentId: existing.documentId,
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt.toISOString(),
          organizationId: tokens.organizationId,
        } as any,
      })
      log.info("LinkedIn tokens updated")
    } else {
      // Create new record
      await strapi.documents("api::linkedin-token.linkedin-token").create({
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt.toISOString(),
          organizationId: tokens.organizationId,
        } as any,
      })
      log.info("LinkedIn tokens stored")
    }
  } catch (error) {
    log.error("Failed to store LinkedIn tokens", {}, error as Error)
    throw error
  }
}

/**
 * Check if access token is expired
 */
export function isTokenExpired(expiresAt: Date): boolean {
  const now = new Date()
  // Consider expired if less than 5 minutes remaining
  const bufferMs = 5 * 60 * 1000
  return now.getTime() + bufferMs >= expiresAt.getTime()
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  strapi: Core.Strapi,
  refreshToken: string
): Promise<OAuthTokens> {
  const clientId = process.env.LINKEDIN_CLIENT_ID
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error("LinkedIn client credentials not configured")
  }

  log.info("Refreshing LinkedIn access token")

  try {
    const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    })

    if (!response.ok) {
      const errorText = await response.text()
      log.error("Failed to refresh LinkedIn token", { status: response.status, error: errorText })
      throw new Error(`LinkedIn OAuth error: ${response.status} - ${errorText}`)
    }

    const data = (await response.json()) as {
      access_token: string
      refresh_token?: string
      expires_in: number
    }

    const newTokens: OAuthTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken, // Use new or fallback to existing
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      organizationId: process.env.LINKEDIN_ORGANIZATION_ID || "",
    }

    // Store updated tokens
    await storeTokens(strapi, newTokens)

    log.info("LinkedIn access token refreshed successfully")

    return newTokens
  } catch (error) {
    log.error("Failed to refresh LinkedIn access token", {}, error as Error)
    throw error
  }
}

/**
 * Get valid access token (refresh if needed)
 */
export async function getAccessToken(strapi: Core.Strapi): Promise<string> {
  const tokens = await getStoredTokens(strapi)

  if (!tokens) {
    throw new Error("LinkedIn tokens not configured. Run OAuth setup script first.")
  }

  // Check if token is expired
  if (isTokenExpired(tokens.expiresAt)) {
    if (!tokens.refreshToken) {
      throw new Error("No refresh token available. Re-authentication required.")
    }

    log.info("Access token expired, refreshing")
    const newTokens = await refreshAccessToken(strapi, tokens.refreshToken)
    return newTokens.accessToken
  }

  return tokens.accessToken
}

/**
 * Get organization ID
 */
export async function getOrganizationId(strapi: Core.Strapi): Promise<string> {
  const tokens = await getStoredTokens(strapi)

  if (!tokens || !tokens.organizationId) {
    const envOrgId = process.env.LINKEDIN_ORGANIZATION_ID
    if (!envOrgId) {
      throw new Error("LinkedIn organization ID not configured")
    }
    return envOrgId
  }

  return tokens.organizationId
}
