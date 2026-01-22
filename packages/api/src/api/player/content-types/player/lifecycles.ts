import { toSlug } from "../../../../libs/strings"
import { triggerContentRevalidation } from "../../../../services/frontend-revalidation"

/**
 * Lifecycle hooks for Player content type
 * Migrated to Strapi 5 Document Service API
 * See: https://docs.strapi.io/dev-docs/api/document-service
 */

function validate(data: { name?: string; slug?: string }) {
  if (!data || !data.name) return
  const slug = toSlug(data.name)
  if (data.slug !== slug) {
    data.slug = slug
  }
}

export default {
  beforeCreate(player: { params: { data: { name?: string; slug?: string } } }) {
    const { data } = player.params
    validate(data)
  },
  beforeUpdate(player: { params: { data: { name?: string; slug?: string } } }) {
    const { data } = player.params
    validate(data)
  },
  afterCreate(event: { result: { slug?: string } }) {
    triggerContentRevalidation(strapi, "api::player.player", event.result, "create")
  },
  /**
   * After updating a player:
   * 1. Sync the linked user's role if the user relation was modified
   * 2. Trigger frontend revalidation
   */
  async afterUpdate(event: { result: any; params: any }) {
    const { result, params } = event

    // Check if user relation was modified and player has a linked user
    if (params.data?.user !== undefined && result.user) {
      try {
        const { syncUserRoleFromPlayer } = await import("../../../../services/user-role-sync")
        const updated = await syncUserRoleFromPlayer(strapi, result.documentId)
        if (updated) {
          strapi.log.info(
            `[Player Lifecycle] User role synced after player ${result.documentId} was linked to user`
          )
        }
      } catch (err) {
        strapi.log.error(`[Player Lifecycle] Failed to sync role after user link: ${err}`)
      }
    }

    // Trigger frontend revalidation
    triggerContentRevalidation(strapi, "api::player.player", result, "update")
  },
  afterDelete(event: { result: { slug?: string } }) {
    triggerContentRevalidation(strapi, "api::player.player", event.result, "delete")
  },
}
