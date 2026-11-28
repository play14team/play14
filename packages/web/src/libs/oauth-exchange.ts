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
