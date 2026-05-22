import type { Core } from "@strapi/strapi"

/**
 * Case-insensitive lookup of a `plugin::users-permissions.user` row by email.
 *
 * Always call this BEFORE `strapi.documents("plugin::users-permissions.user").create({...})`.
 * The Document Service `.create()` bypasses the users-permissions `unique_email`
 * advanced setting (that flag only fires inside `providers.connect` for OAuth
 * and `auth.register` for local password registration), so without an explicit
 * lookup the codebase can mint a second user row whose email differs from an
 * existing one only in case. A functional UNIQUE INDEX on `LOWER(email)` in
 * the migration `2026.05.22T14.00.00.add-up-users-email-lower-unique.js`
 * backs this up at the database level; this helper exists so callers can take
 * the "reuse existing user" branch with a friendly log line instead of
 * letting the constraint throw at insert time.
 */
export async function findUserByEmail<TUser = Record<string, unknown>>(
  strapi: Core.Strapi,
  email: string,
  populate?: Record<string, unknown>
): Promise<TUser | null> {
  const trimmed = email?.trim()
  if (!trimmed) return null
  const result = await strapi.documents("plugin::users-permissions.user").findFirst({
    // $eqi is case-insensitive equality. Bypasses the local Strapi types
    // because the users-permissions content-type doesn't declare it on email.
    filters: { email: { $eqi: trimmed } } as any,
    // Match the OAuth wrapper's `lookupExistingByEmail` ordering so that
    // during the pre-cleanup window (when duplicates may still exist), every
    // caller agrees on which row is canonical: the oldest. Without this sort,
    // `findFirst` could return a newer player-less row and bind subsequent
    // player links to the wrong user.
    sort: { createdAt: "asc" },
    ...(populate ? { populate } : {}),
  })
  return (result as TUser | null) ?? null
}
