"use strict";

const { toSlug } = require("../../../../libs/strings");

/**
 * Lifecycle hooks for Player content type
 * Migrated to Strapi 5 Document Service API
 * See: https://docs.strapi.io/dev-docs/api/document-service
 */

function validate(data) {
  if (!data || !data.name) return;
  const slug = toSlug(data.name);
  if (data.slug != slug) {
    data.slug = slug;
  }
}

module.exports = {
  beforeCreate(player) {
    const { data } = player.params;
    validate(data);
  },
  beforeUpdate(player) {
    const { data } = player.params;
    validate(data);
  },
  /**
   * After updating a player, sync the linked user's role if:
   * - The user relation was modified (player linked to user via admin)
   * - The player has a linked user
   */
  async afterUpdate(event) {
    const { result, params } = event;

    // Check if user relation was modified and player has a linked user
    if (params.data?.user !== undefined && result.user) {
      try {
        const { syncUserRoleFromPlayer } = await import("../../../../services/user-role-sync/index.js");
        const updated = await syncUserRoleFromPlayer(strapi, result.documentId);
        if (updated) {
          strapi.log.info(`[Player Lifecycle] User role synced after player ${result.documentId} was linked to user`);
        }
      } catch (err) {
        strapi.log.error(`[Player Lifecycle] Failed to sync role after user link: ${err}`);
      }
    }
  },
};
