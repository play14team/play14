/**
 * LinkedIn OAuth token management for personal accounts
 * Handles per-player OAuth flow, token storage, refresh, and revocation
 */

import crypto from "node:crypto"
import type { Core } from "@strapi/strapi"
import { createLogger } from "../observability/logger"
import type { OAuthTokens } from "./types"

const log = createLogger("[LinkedInOAuth]")

const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization"
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
const LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo"
const LINKEDIN_REVOKE_URL = "https://www.linkedin.com/oauth/v2/revoke"

/**
 * Check if access token is expired (with 5-minute buffer)
 */
export function isTokenExpired(expiresAt: Date): boolean {
  const now = new Date()
  const bufferMs = 5 * 60 * 1000
  return now.getTime() + bufferMs >= expiresAt.getTime()
}

/**
 * Generate LinkedIn OAuth authorization URL for a player
 */
export async function generateAuthorizationUrl(
  strapi: Core.Strapi,
  playerDocumentId: string
): Promise<string> {
  const clientId = process.env.LINKEDIN_CLIENT_ID
  const redirectUri = process.env.LINKEDIN_POSTING_REDIRECT_URI

  if (!clientId || !redirectUri) {
    throw new Error("LinkedIn OAuth credentials not configured")
  }

  // Generate CSRF state token and store it
  const state = crypto.randomBytes(32).toString("hex")

  const pluginStore = strapi.store({
    type: "plugin",
    name: "linkedin-oauth",
  })

  await pluginStore.set({
    key: `oauth_state_${state}`,
    value: { playerDocumentId, createdAt: new Date().toISOString() },
  })

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: "w_member_social openid profile email",
  })

  return `${LINKEDIN_AUTH_URL}?${params.toString()}`
}

/**
 * Exchange authorization code for tokens and create/update linkedin-account
 */
export async function exchangeCodeForTokens(
  strapi: Core.Strapi,
  code: string,
  state: string
): Promise<{ playerDocumentId: string; linkedinAccount: any }> {
  const clientId = process.env.LINKEDIN_CLIENT_ID
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
  const redirectUri = process.env.LINKEDIN_POSTING_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("LinkedIn OAuth credentials not configured")
  }

  // Validate CSRF state
  const pluginStore = strapi.store({
    type: "plugin",
    name: "linkedin-oauth",
  })

  const stateData = (await pluginStore.get({ key: `oauth_state_${state}` })) as {
    playerDocumentId: string
    createdAt: string
  } | null

  if (!stateData) {
    throw new Error("Invalid or expired OAuth state")
  }

  // Clean up state
  await pluginStore.delete({ key: `oauth_state_${state}` })

  // Check state expiry (10 minutes)
  const stateAge = Date.now() - new Date(stateData.createdAt).getTime()
  if (stateAge > 10 * 60 * 1000) {
    throw new Error("OAuth state expired")
  }

  const { playerDocumentId } = stateData

  // Exchange code for tokens
  log.info("Exchanging authorization code for tokens")

  const tokenResponse = await fetch(LINKEDIN_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  })

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text()
    log.error("Failed to exchange code for tokens", {
      status: tokenResponse.status,
      error: errorText,
    })
    throw new Error(`LinkedIn token exchange failed: ${tokenResponse.status}`)
  }

  const tokenData = (await tokenResponse.json()) as {
    access_token: string
    refresh_token?: string
    expires_in: number
  }

  // Fetch user profile
  const userInfoResponse = await fetch(LINKEDIN_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })

  if (!userInfoResponse.ok) {
    throw new Error("Failed to fetch LinkedIn user profile")
  }

  const userInfo = (await userInfoResponse.json()) as {
    sub: string
    name?: string
    email?: string
    picture?: string
  }

  const linkedinUserId = userInfo.sub
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)

  // Find player
  const player = await strapi.documents("api::player.player").findOne({
    documentId: playerDocumentId,
    fields: ["id", "name"],
  })

  if (!player) {
    throw new Error("Player not found")
  }

  // Create or update linkedin-account
  const existingAccount = await strapi
    .documents("api::linkedin-account.linkedin-account")
    .findFirst({
      filters: { player: { documentId: playerDocumentId } },
    })

  let linkedinAccount: any

  const accountData = {
    linkedinUserId,
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token || undefined,
    tokenExpiresAt: expiresAt.toISOString(),
    accountStatus: "active",
    displayName: userInfo.name || undefined,
    connectedAt: new Date().toISOString(),
  }

  if (existingAccount) {
    linkedinAccount = await strapi.documents("api::linkedin-account.linkedin-account").update({
      documentId: existingAccount.documentId,
      data: accountData as any,
    })
    log.info("LinkedIn account updated", { playerName: player.name })
  } else {
    linkedinAccount = await strapi.documents("api::linkedin-account.linkedin-account").create({
      data: {
        ...accountData,
        player: player.id,
      } as any,
    })
    log.info("LinkedIn account created", { playerName: player.name })
  }

  return { playerDocumentId, linkedinAccount }
}

/**
 * Get valid access token for a player, auto-refreshing if expired
 */
export async function getPlayerAccessToken(
  strapi: Core.Strapi,
  playerDocumentId: string
): Promise<{ accessToken: string; linkedinUserId: string }> {
  const account = await strapi.documents("api::linkedin-account.linkedin-account").findFirst({
    filters: { player: { documentId: playerDocumentId } },
    fields: [
      "documentId",
      "accessToken",
      "refreshToken",
      "tokenExpiresAt",
      "linkedinUserId",
      "accountStatus",
    ],
  })

  if (!account) {
    throw new Error("No LinkedIn account connected for this player")
  }

  if (account.accountStatus === "revoked") {
    throw new Error("LinkedIn account has been disconnected")
  }

  // Check if token needs refresh
  if (isTokenExpired(new Date(account.tokenExpiresAt))) {
    if (!account.refreshToken) {
      // Mark as expired
      await strapi.documents("api::linkedin-account.linkedin-account").update({
        documentId: account.documentId,
        data: { accountStatus: "expired" } as any,
      })
      throw new Error("LinkedIn token expired and no refresh token available. Please reconnect.")
    }

    const refreshedTokens = await refreshPlayerToken(strapi, account.documentId)
    return {
      accessToken: refreshedTokens.accessToken,
      linkedinUserId: account.linkedinUserId,
    }
  }

  return {
    accessToken: account.accessToken,
    linkedinUserId: account.linkedinUserId,
  }
}

/**
 * Refresh a player's LinkedIn token
 */
export async function refreshPlayerToken(
  strapi: Core.Strapi,
  linkedinAccountDocumentId: string
): Promise<OAuthTokens> {
  const clientId = process.env.LINKEDIN_CLIENT_ID
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error("LinkedIn client credentials not configured")
  }

  const account = await strapi.documents("api::linkedin-account.linkedin-account").findOne({
    documentId: linkedinAccountDocumentId,
    fields: ["refreshToken", "linkedinUserId"],
  })

  if (!account?.refreshToken) {
    throw new Error("No refresh token available")
  }

  log.info("Refreshing LinkedIn access token")

  const response = await fetch(LINKEDIN_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: account.refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  })

  if (!response.ok) {
    const errorText = await response.text()
    log.error("Failed to refresh LinkedIn token", { status: response.status, error: errorText })

    // Mark account as expired
    await strapi.documents("api::linkedin-account.linkedin-account").update({
      documentId: linkedinAccountDocumentId,
      data: { accountStatus: "expired" } as any,
    })

    throw new Error(`LinkedIn token refresh failed: ${response.status}`)
  }

  const data = (await response.json()) as {
    access_token: string
    refresh_token?: string
    expires_in: number
  }

  const newTokens: OAuthTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || account.refreshToken,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
    linkedinUserId: account.linkedinUserId,
  }

  // Update stored tokens
  await strapi.documents("api::linkedin-account.linkedin-account").update({
    documentId: linkedinAccountDocumentId,
    data: {
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
      tokenExpiresAt: newTokens.expiresAt.toISOString(),
      accountStatus: "active",
    } as any,
  })

  log.info("LinkedIn access token refreshed successfully")

  return newTokens
}

/**
 * Revoke a player's LinkedIn token and mark as revoked
 */
export async function revokePlayerToken(
  strapi: Core.Strapi,
  playerDocumentId: string
): Promise<void> {
  const clientId = process.env.LINKEDIN_CLIENT_ID
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET

  const account = await strapi.documents("api::linkedin-account.linkedin-account").findFirst({
    filters: { player: { documentId: playerDocumentId } },
    fields: ["documentId", "accessToken"],
  })

  if (!account) {
    throw new Error("No LinkedIn account found for this player")
  }

  // Try to revoke the token at LinkedIn (best effort)
  if (clientId && clientSecret) {
    try {
      await fetch(LINKEDIN_REVOKE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          token: account.accessToken,
        }).toString(),
      })
    } catch (error) {
      log.warn(
        "Failed to revoke token at LinkedIn (continuing with local revocation)",
        {},
        error as Error
      )
    }
  }

  // Mark as revoked locally
  await strapi.documents("api::linkedin-account.linkedin-account").update({
    documentId: account.documentId,
    data: {
      accountStatus: "revoked",
      accessToken: "revoked",
      refreshToken: null,
    } as any,
  })

  log.info("LinkedIn account disconnected for player", { playerDocumentId })
}
