import type { Core } from "@strapi/strapi"
import { bootstrapLikedItemImages } from "./bootstrap/liked-items"
import { bootstrapPermissions } from "./bootstrap/permissions"

/**
 * Validate CORS configuration for security.
 * SECURITY: Wildcard CORS ("*") allows any website to make authenticated requests,
 * which is a significant security risk in production.
 */
function validateCorsConfiguration(strapi: Core.Strapi): void {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
  const nodeEnv = process.env.NODE_ENV

  // Check if ALLOWED_ORIGINS is not set
  if (!allowedOrigins) {
    if (nodeEnv === "production") {
      throw new Error(
        "CRITICAL: ALLOWED_ORIGINS environment variable is not set. " +
          "In production, you must explicitly configure allowed CORS origins. " +
          "Example: ALLOWED_ORIGINS=https://play14.org,https://www.play14.org"
      )
    }
    strapi.log.warn(
      "[Bootstrap] ALLOWED_ORIGINS not set - CORS will block all cross-origin requests. " +
        "Set ALLOWED_ORIGINS for local development (e.g., ALLOWED_ORIGINS=http://localhost:3000)"
    )
    return
  }

  // Check if wildcard is used
  const origins = allowedOrigins.split(",").map((o) => o.trim())
  if (origins.includes("*")) {
    if (nodeEnv === "production") {
      throw new Error(
        "CRITICAL: ALLOWED_ORIGINS contains wildcard '*' which is not allowed in production. " +
          "This allows any website to make authenticated requests to your API. " +
          "Configure specific domains: ALLOWED_ORIGINS=https://play14.org,https://www.play14.org"
      )
    }
    strapi.log.warn(
      "[Bootstrap] ALLOWED_ORIGINS contains wildcard '*'. " +
        "This is acceptable for development but must not be used in production."
    )
  } else {
    strapi.log.info(`[Bootstrap] CORS configured for origins: ${origins.join(", ")}`)
  }
}

/**
 * Validate that webhook middleware is properly configured for signature verification.
 * SECURITY: The body middleware must have includeUnparsed:true for Stripe webhook
 * signature verification to work. Without this, the raw body is not available and
 * signature verification would fail silently, potentially allowing forged payment events.
 */
function validateWebhookMiddlewareConfig(strapi: Core.Strapi): void {
  const middlewares = strapi.config.get("middlewares") as any[]

  if (!Array.isArray(middlewares)) {
    throw new Error(
      "CRITICAL: Middlewares configuration is not an array. Cannot validate webhook security."
    )
  }

  // Find the body middleware configuration
  const bodyMiddleware = middlewares.find(
    (m) => m === "strapi::body" || (typeof m === "object" && m?.name === "strapi::body")
  )

  if (!bodyMiddleware) {
    throw new Error(
      "CRITICAL: strapi::body middleware not found. Webhook signature verification will fail."
    )
  }

  // If it's just the string "strapi::body", it uses defaults (no includeUnparsed)
  if (bodyMiddleware === "strapi::body") {
    throw new Error(
      "CRITICAL: Body middleware must be configured with includeUnparsed:true for webhook " +
        "signature verification. Update config/middlewares.ts to use: " +
        "{ name: 'strapi::body', config: { includeUnparsed: true } }"
    )
  }

  // Check the config object
  if (typeof bodyMiddleware === "object" && bodyMiddleware?.config?.includeUnparsed !== true) {
    throw new Error(
      "CRITICAL: Body middleware must have includeUnparsed:true for webhook signature verification. " +
        "Payment webhook signatures cannot be verified without the raw request body. " +
        "Update config/middlewares.ts: { name: 'strapi::body', config: { includeUnparsed: true } }"
    )
  }

  strapi.log.info(
    "[Bootstrap] Webhook middleware configuration validated: includeUnparsed is enabled"
  )
}

/**
 * Reconcile OAuth provider callback URLs with FRONTEND_URL on every boot.
 *
 * The users-permissions grant config lives in the DB (editable via the admin
 * UI) and normally holds a full absolute callback like
 * `https://play14.org/connect/github/redirect`. That URL changes per
 * environment (prod → play14.org, staging → staging.play14.org, local →
 * localhost:3000), so hard-coding it in the DB means every env swap requires
 * a manual admin-UI edit or a SQL fix-up after each `pg_restore`.
 *
 * This bootstrap step keeps the origin in sync with the FRONTEND_URL env var,
 * but only for callbacks that actually follow the frontend-redirect pattern
 * `/connect/<provider>/redirect`. Providers configured to call back to the
 * API directly (e.g. `api/auth/<provider>/callback`) are left untouched.
 *
 * If FRONTEND_URL is unset, the sync is skipped — we'd rather keep whatever
 * the admin UI configured than overwrite it with a prod-default fallback.
 */
async function syncOAuthProviderCallbacks(strapi: Core.Strapi): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL?.replace(/\/+$/, "")
  if (!frontendUrl) {
    strapi.log.info(
      "[OAuth Callbacks] FRONTEND_URL not set, skipping provider callback reconciliation"
    )
    return
  }

  const grantStore = strapi.store({
    type: "plugin",
    name: "users-permissions",
    key: "grant",
  })

  const grantConfig = (await grantStore.get()) as Record<string, Record<string, unknown>> | null

  if (!grantConfig) {
    strapi.log.info("[OAuth Callbacks] No grant config found, skipping")
    return
  }

  let changed = false

  for (const [providerName, providerConfig] of Object.entries(grantConfig)) {
    const callback = providerConfig?.callback
    if (typeof callback !== "string") continue

    const expectedPath = `/connect/${providerName}/redirect`

    let currentOrigin: string
    try {
      const parsed = new URL(callback)
      if (parsed.pathname !== expectedPath) continue
      currentOrigin = parsed.origin
    } catch {
      // Not an absolute URL (e.g. the default "api/auth/<provider>/callback"
      // template string) — leave it alone.
      continue
    }

    const desired = `${frontendUrl}${expectedPath}`
    if (callback === desired) continue

    providerConfig.callback = desired
    strapi.log.info(`[OAuth Callbacks] ${providerName}: ${currentOrigin} -> ${frontendUrl}`)
    changed = true
  }

  if (changed) {
    await grantStore.set({ value: grantConfig })
    strapi.log.info("[OAuth Callbacks] Grant config updated")
  } else {
    strapi.log.info("[OAuth Callbacks] All provider callbacks already in sync")
  }
}

/**
 * Ensure unique index exists on processed_webhooks.event_id for idempotency.
 * Strapi's schema sync creates the table but doesn't enforce unique constraints at DB level.
 */
async function ensureProcessedWebhooksIndex(strapi: Core.Strapi): Promise<void> {
  const knex = strapi.db.connection

  // Check if the table exists
  const hasTable = await knex.schema.hasTable("processed_webhooks")
  if (!hasTable) {
    strapi.log.info("[Bootstrap] processed_webhooks table not found, skipping index creation")
    return
  }

  // Check if unique index already exists (PostgreSQL-specific)
  const result = await knex.raw(
    `SELECT 1 FROM pg_indexes WHERE indexname = 'processed_webhooks_event_id_unique'`
  )

  if (result.rows.length === 0) {
    strapi.log.info("[Bootstrap] Creating unique index on processed_webhooks.event_id")
    await knex.raw(
      "CREATE UNIQUE INDEX processed_webhooks_event_id_unique ON processed_webhooks(event_id)"
    )
    strapi.log.info("[Bootstrap] Unique index created successfully")
  } else {
    strapi.log.debug("[Bootstrap] processed_webhooks unique index already exists")
  }
}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }: { strapi: Core.Strapi }) {
    try {
      // Override LinkedIn provider to use OpenID Connect (OIDC) instead of deprecated scopes
      // LinkedIn deprecated r_liteprofile and r_emailaddress scopes in favor of OpenID Connect
      // See: https://github.com/strapi/strapi/issues/19641
      const providersRegistry = strapi.plugin("users-permissions").service("providers-registry")
      const baseURL = `${strapi.config.server.url}/api/connect`

      providersRegistry.add("linkedin", {
        icon: "linkedin",
        enabled: false,
        grantConfig: {
          key: "",
          secret: "",
          callback: `${baseURL}/linkedin/callback`,
          scope: ["openid", "profile", "email"],
          authorize_url: "https://www.linkedin.com/oauth/v2/authorization",
          access_url: "https://www.linkedin.com/oauth/v2/accessToken",
          oauth: 2,
        },
        async authCallback({
          accessToken,
          purest,
        }: {
          accessToken: string
          purest: (config: { provider: string; config?: Record<string, unknown> }) => {
            get: (path: string) => {
              auth: (token: string) => {
                request: () => Promise<{ body: Record<string, unknown> }>
              }
            }
          }
        }) {
          // Use LinkedIn's OpenID Connect userinfo endpoint
          const linkedin = purest({
            provider: "linkedin",
            config: {
              linkedin: {
                default: {
                  origin: "https://api.linkedin.com",
                  path: "{path}",
                  headers: {
                    Authorization: "Bearer {auth}",
                  },
                },
              },
            },
          })

          const { body } = await linkedin.get("v2/userinfo").auth(accessToken).request()

          // OpenID Connect userinfo returns: sub, name, given_name, family_name, picture, email, email_verified
          const email = body.email as string
          const name = body.name as string
          const givenName = body.given_name as string

          return {
            username: givenName || name || email.split("@")[0],
            email,
          }
        },
      })

      // Register Document Service Middleware for player-claim
      strapi.documents.use(async (context, next) => {
        // Only intercept player-claim updates
        if (context.uid !== "api::player-claim.player-claim") {
          return next()
        }

        // Only handle update actions
        if (context.action !== "update") {
          return next()
        }

        const data = context.params?.data as Record<string, any> | undefined
        const newStatus = data?.claimStatus
        if (!newStatus) {
          return next()
        }

        // Get the current claim to check if status is changing
        const documentId = context.params?.documentId
        if (!documentId) {
          return next()
        }

        const currentClaim = await strapi.documents("api::player-claim.player-claim").findOne({
          documentId,
          populate: {
            user: true,
            player: {
              populate: {
                user: true,
              },
            },
          },
        })

        if (!currentClaim) {
          return next()
        }

        const oldStatus = currentClaim.claimStatus

        // If status is not changing, just proceed
        if (oldStatus === newStatus) {
          return next()
        }

        strapi.log.info(
          `[PlayerClaim Middleware] Status changing from ${oldStatus} to ${newStatus} for claim ${documentId}`
        )

        // Set processedAt if changing to approved or rejected and not already set
        if ((newStatus === "approved" || newStatus === "rejected") && !data?.processedAt) {
          ;(context.params.data as Record<string, any>).processedAt = new Date().toISOString()
          strapi.log.info(
            `[PlayerClaim Middleware] Setting processedAt to ${(context.params.data as Record<string, any>).processedAt}`
          )
        }

        // Execute the update
        const result = await next()

        // After update: handle approved status
        if (newStatus === "approved" && currentClaim.user && currentClaim.player) {
          // Check if player is not already linked to a user
          if (!currentClaim.player.user) {
            try {
              // Get the player's internal ID
              const player = await strapi.documents("api::player.player").findOne({
                documentId: currentClaim.player.documentId,
              })

              if (player) {
                // Get user documentId for Document Service update
                const claimUser = await strapi
                  .documents("plugin::users-permissions.user")
                  .findFirst({
                    filters: { id: currentClaim.user.id },
                  })
                if (claimUser) {
                  await strapi.documents("plugin::users-permissions.user").update({
                    documentId: claimUser.documentId,
                    data: { player: player.id } as any,
                  })
                  strapi.log.info(
                    `[PlayerClaim Middleware] Linked user ${currentClaim.user.id} to player ${player.id}`
                  )
                }
              }
            } catch (error) {
              strapi.log.error(`[PlayerClaim Middleware] Failed to link user to player: ${error}`)
            }
          } else {
            strapi.log.info(
              `[PlayerClaim Middleware] Player ${currentClaim.player.documentId} already linked to a user, skipping`
            )
          }
        }

        return result
      })
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      strapi.log.error(
        `[app-register] register failed: ${err.message}${err.stack ? `\n${err.stack}` : ""}`
      )
      throw error
    }
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    try {
      // SECURITY: Validate critical security configurations before anything else
      validateCorsConfiguration(strapi)
      validateWebhookMiddlewareConfig(strapi)

      // Ensure unique index on processed_webhooks.event_id for idempotency
      // This must run after schema sync (which happens before bootstrap)
      await ensureProcessedWebhooksIndex(strapi)

      // Update LinkedIn OAuth scopes in the grant store to use OpenID Connect
      // The grant configuration is stored in the database and used by the OAuth flow
      const grantStore = strapi.store({
        type: "plugin",
        name: "users-permissions",
        key: "grant",
      })

      const grantConfig = (await grantStore.get()) as Record<string, Record<string, unknown>> | null

      strapi.log.info(
        `[LinkedIn OAuth] Current grant config: ${JSON.stringify(grantConfig?.linkedin)}`
      )

      if (grantConfig?.linkedin) {
        const currentScopes = grantConfig.linkedin.scope as string[] | undefined
        const hasDeprecatedScopes =
          currentScopes?.includes("r_liteprofile") || currentScopes?.includes("r_emailaddress")

        strapi.log.info(
          `[LinkedIn OAuth] Current scopes: ${JSON.stringify(
            currentScopes
          )}, hasDeprecatedScopes: ${hasDeprecatedScopes}`
        )

        if (hasDeprecatedScopes || !currentScopes) {
          // Update to OpenID Connect scopes
          grantConfig.linkedin.scope = ["openid", "profile", "email"]

          await grantStore.set({ value: grantConfig })

          strapi.log.info(
            "[LinkedIn OAuth] Updated scopes from deprecated r_liteprofile/r_emailaddress to OpenID Connect (openid, profile, email)"
          )
        } else {
          strapi.log.info(
            `[LinkedIn OAuth] Scopes already correct: ${JSON.stringify(currentScopes)}`
          )
        }
      } else {
        strapi.log.info("[LinkedIn OAuth] No LinkedIn configuration found in grant store")
      }

      // Keep OAuth provider callback URLs aligned with FRONTEND_URL per env
      await syncOAuthProviderCallbacks(strapi)

      // Bootstrap user role permissions
      await bootstrapPermissions(strapi)

      // Bootstrap liked items images (uploads images from data folder if missing)
      await bootstrapLikedItemImages(strapi)
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      strapi.log.error(
        `[app-bootstrap] bootstrap failed: ${err.message}${err.stack ? `\n${err.stack}` : ""}`
      )
      throw error
    }
  },
}
