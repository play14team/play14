/**
 * One-off cleanup for users-permissions rows that share the same email.
 *
 * The OAuth wrapper in `src/extensions/users-permissions/strapi-server.ts`
 * proactively dedupes by email going forward, but historical duplicates can
 * leave a player linked to one user while a pending claim sits on another —
 * making `PUT /admin/player-claims/:id/approve` fail with
 * "This player is already linked to another user".
 *
 * For each email with >1 user row, the script:
 *   1. Picks a canonical user — prefers the one linked to a `player`, else the
 *      one with the oldest `createdAt`.
 *   2. Reassigns `player-claim.user` rows from the duplicates to the canonical.
 *   3. If any duplicate has a `player` link that the canonical lacks, moves
 *      the link to the canonical (and unlinks it from the duplicate first to
 *      satisfy the oneToOne constraint).
 *   4. Deletes the duplicate user rows.
 *
 * Default mode is dry-run — pass `--apply` to actually mutate.
 *
 * Usage:
 *   bun --filter play14-api strapi script scripts/cleanup-duplicate-users.ts
 *   bun --filter play14-api strapi script scripts/cleanup-duplicate-users.ts -- --apply
 */

import { compileStrapi, createStrapi } from "@strapi/strapi"

const APPLY = process.argv.includes("--apply")

interface UserRow {
  id: number
  documentId: string
  username: string
  email: string
  provider: string
  createdAt: string
  player?: { id: number; documentId: string; name: string } | null
}

interface DuplicateGroup {
  email: string
  users: UserRow[]
}

async function findDuplicateGroups(strapi: any): Promise<DuplicateGroup[]> {
  // Group by lower(email). The Document Service has no GROUP BY, so we list
  // everything and group in memory — fine for a one-off on a small users table.
  const users = (await strapi.documents("plugin::users-permissions.user").findMany({
    fields: ["id", "documentId", "username", "email", "provider", "createdAt"],
    populate: { player: { fields: ["id", "documentId", "name"] } },
    sort: { createdAt: "asc" },
    limit: -1,
  })) as UserRow[]

  const byEmail = new Map<string, UserRow[]>()
  for (const u of users) {
    if (!u.email) continue
    const key = u.email.toLowerCase()
    const bucket = byEmail.get(key) ?? []
    bucket.push(u)
    byEmail.set(key, bucket)
  }

  return Array.from(byEmail.entries())
    .filter(([, group]) => group.length > 1)
    .map(([email, group]) => ({ email, users: group }))
}

function pickCanonical(group: UserRow[]): UserRow {
  // Prefer a user that is already linked to a player.
  const linked = group.find((u) => u.player?.id)
  if (linked) return linked
  // Otherwise, the oldest user (already sorted asc by createdAt).
  return group[0]
}

async function reassignClaims(strapi: any, fromUserId: number, toUserId: number): Promise<number> {
  const claims = (await strapi.documents("api::player-claim.player-claim").findMany({
    filters: { user: fromUserId },
    fields: ["id", "documentId"],
    limit: -1,
  })) as Array<{ id: number; documentId: string }>

  for (const claim of claims) {
    if (APPLY) {
      await strapi.documents("api::player-claim.player-claim").update({
        documentId: claim.documentId,
        data: { user: toUserId } as any,
      })
    }
  }
  return claims.length
}

async function moveOrphanPlayerLink(
  strapi: any,
  duplicate: UserRow,
  canonical: UserRow
): Promise<boolean> {
  if (!duplicate.player?.id || canonical.player?.id) return false
  if (APPLY) {
    // Unlink first to free the oneToOne, then link to canonical.
    await strapi.documents("plugin::users-permissions.user").update({
      documentId: duplicate.documentId,
      data: { player: null } as any,
    })
    await strapi.documents("plugin::users-permissions.user").update({
      documentId: canonical.documentId,
      data: { player: duplicate.player.id } as any,
    })
  }
  return true
}

async function deleteUser(strapi: any, user: UserRow): Promise<void> {
  if (APPLY) {
    await strapi.documents("plugin::users-permissions.user").delete({
      documentId: user.documentId,
    })
  }
}

async function main() {
  console.log(`[cleanup] Mode: ${APPLY ? "APPLY (mutating)" : "DRY-RUN"}`)
  const { appDir, distDir } = await compileStrapi()
  const strapi = await createStrapi({ appDir, distDir }).load()

  let totalGroups = 0
  let totalDuplicatesRemoved = 0
  let totalClaimsReassigned = 0
  let totalPlayerLinksMoved = 0

  try {
    const groups = await findDuplicateGroups(strapi)
    if (groups.length === 0) {
      console.log("[cleanup] No duplicate-email users found. Nothing to do.")
      return
    }

    console.log(`[cleanup] Found ${groups.length} email(s) with duplicate users:\n`)

    for (const group of groups) {
      totalGroups++
      const canonical = pickCanonical(group.users)
      const duplicates = group.users.filter((u) => u.id !== canonical.id)

      console.log(`\n  Email: ${group.email}`)
      console.log(
        `  Canonical: id=${canonical.id} username=${canonical.username} provider=${canonical.provider} createdAt=${canonical.createdAt} player=${canonical.player?.name ?? "—"}`
      )
      for (const dup of duplicates) {
        console.log(
          `  Duplicate: id=${dup.id} username=${dup.username} provider=${dup.provider} createdAt=${dup.createdAt} player=${dup.player?.name ?? "—"}`
        )
      }

      for (const dup of duplicates) {
        const moved = await moveOrphanPlayerLink(strapi, dup, canonical)
        if (moved) {
          totalPlayerLinksMoved++
          // Update local view so subsequent iterations see the new state.
          canonical.player = dup.player
          console.log(
            `    → ${APPLY ? "moved" : "would move"} player link "${dup.player?.name}" from user ${dup.id} to canonical ${canonical.id}`
          )
        }

        const reassigned = await reassignClaims(strapi, dup.id, canonical.id)
        totalClaimsReassigned += reassigned
        if (reassigned > 0) {
          console.log(
            `    → ${APPLY ? "reassigned" : "would reassign"} ${reassigned} player-claim row(s) from user ${dup.id} to canonical ${canonical.id}`
          )
        }

        await deleteUser(strapi, dup)
        totalDuplicatesRemoved++
        console.log(`    → ${APPLY ? "deleted" : "would delete"} duplicate user id=${dup.id}`)
      }
    }

    console.log("\n[cleanup] Summary")
    console.log(`  Duplicate email groups:    ${totalGroups}`)
    console.log(`  Duplicate users removed:   ${totalDuplicatesRemoved}`)
    console.log(`  Player-claim rows moved:   ${totalClaimsReassigned}`)
    console.log(`  Player links re-pointed:   ${totalPlayerLinksMoved}`)
    if (!APPLY) {
      console.log("\n[cleanup] Re-run with --apply to actually mutate.")
    }
  } finally {
    await strapi.destroy()
  }
}

main().catch((err) => {
  console.error("[cleanup] Failed:", err)
  process.exit(1)
})
