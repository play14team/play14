import { toSlug } from "../../../../libs/strings";

/**
 * Lifecycle hooks for Player content type
 * Migrated to Strapi 5 Document Service API
 * See: https://docs.strapi.io/dev-docs/api/document-service
 */

interface PlayerData {
  name?: string;
  slug?: string;
}

function validate(data: PlayerData): void {
  if (!data || !data.name) return;
  const slug = toSlug(data.name);
  if (data.slug != slug) {
    data.slug = slug;
  }
}

export default {
  beforeCreate(player: { params: { data: PlayerData } }) {
    const { data } = player.params;
    validate(data);
  },
  beforeUpdate(player: { params: { data: PlayerData } }) {
    const { data } = player.params;
    validate(data);
  },
};
