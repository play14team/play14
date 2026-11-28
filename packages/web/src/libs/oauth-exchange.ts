/**
 * Browser-side OAuth exchange against Strapi's users-permissions plugin.
 *
 * Since Strapi 5 replaced Grant with its own OAuth middleware, the provider
 * redirect back to the frontend carries NO `access_token` in the query
 * string. The provider tokens stay in Strapi's koa session (`strapi.sid`
 * cookie, host-only on the API domain), and `/api/auth/:provider/callback`
 * reads them from `session.grant.response`.
 *
 * That means the exchange has to run in the browser with
 * `credentials: "include"` so the session cookie is sent. A server-side
 * fetch from Next.js never has that cookie. play14.org and api.play14.org are
 * the same site, so the SameSite=None cookie is first-party here.
 */

export const OAUTH_PROVIDERS = ["google", "microsoft", "github", "linkedin"] as const
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number]

export type OAuthExchangeResult = { ok: true; jwt: string } | { ok: false; error: string }

export function isOAuthProvider(value: string): value is OAuthProvider {
  return (OAUTH_PROVIDERS as readonly string[]).includes(value)
}

/** Map a Strapi error message to an `/auth/error?error=` code. */
export function mapStrapiOAuthError(message: string | undefined): string {
  if (message?.includes("Email is already taken")) return "email_taken"
  // Strapi has no provider tokens in the session: the cookie was lost, the
  // session expired, or the page was reloaded after a successful exchange.
  if (message?.includes("completed provider session")) return "no_token"
  return "token_exchange_failed"
}

export async function exchangeOAuthSession(
  strapiUrl: string,
  provider: OAuthProvider,
  fetchImpl: typeof fetch = fetch
): Promise<OAuthExchangeResult> {
  let response: Response
  try {
    response = await fetchImpl(`${strapiUrl}/api/auth/${provider}/callback`, {
      credentials: "include",
      cache: "no-store",
    })
  } catch {
    return { ok: false, error: "token_exchange_failed" }
  }

  let body: { jwt?: unknown; error?: { message?: string } } | null = null
  try {
    body = await response.json()
  } catch {
    body = null
  }

  if (!response.ok) {
    return { ok: false, error: mapStrapiOAuthError(body?.error?.message) }
  }

  if (typeof body?.jwt !== "string" || body.jwt.length === 0) {
    return { ok: false, error: "token_exchange_failed" }
  }

  return { ok: true, jwt: body.jwt }
}

export const OAUTH_SUCCESS_PATH = "/auth/callback"

export function oauthErrorPath(code: string): string {
  return `/auth/error?error=${encodeURIComponent(code)}`
}

/** Provider-supplied text is attacker-controllable; cap what reaches the logs. */
const MAX_LOGGED_DESCRIPTION = 200

export interface OAuthRedirectDeps {
  exchange: (provider: OAuthProvider) => Promise<OAuthExchangeResult>
  /** POST the JWT to /api/auth/session; resolves true when the cookie was set. */
  storeSession: (jwt: string) => Promise<boolean>
  logError?: (...args: unknown[]) => void
}

/**
 * Everything the /connect/:provider/redirect page does, minus navigation.
 * Returns the path to send the browser to next.
 */
export async function completeOAuthRedirect(
  provider: string,
  search: string,
  { exchange, storeSession, logError = () => {} }: OAuthRedirectDeps
): Promise<string> {
  const params = new URLSearchParams(search)

  const error = params.get("error")
  if (error) {
    const description = params.get("error_description")?.slice(0, MAX_LOGGED_DESCRIPTION)
    logError(`[OAuth] Error from ${provider}:`, error.slice(0, MAX_LOGGED_DESCRIPTION), description)
    return oauthErrorPath(error)
  }

  if (!isOAuthProvider(provider)) {
    return oauthErrorPath("token_exchange_failed")
  }

  const result = await exchange(provider)
  if (!result.ok) {
    logError(`[OAuth] Exchange with ${provider} failed:`, result.error)
    return oauthErrorPath(result.error)
  }

  let stored = false
  try {
    stored = await storeSession(result.jwt)
  } catch {
    stored = false
  }
  return stored ? OAUTH_SUCCESS_PATH : oauthErrorPath("token_exchange_failed")
}
