import { toSlug } from "../../../../libs/strings";

/**
 * Lifecycle hooks for Game content type
 * Migrated to Strapi 5 Document Service API
 * See: https://docs.strapi.io/dev-docs/api/document-service
 */

interface GameData {
  name?: string;
  slug?: string;
}

function validate(data: GameData): void {
  if (!data || !data.name) return;
  const slug = toSlug(data.name);
  if (data.slug != slug) {
    data.slug = slug;
  }
}

export default {
  beforeCreate(game: { params: { data: GameData } }) {
    const { data } = game.params;
    validate(data);
  },
  beforeUpdate(game: { params: { data: GameData } }) {
    const { data } = game.params;
    validate(data);
  },
};
