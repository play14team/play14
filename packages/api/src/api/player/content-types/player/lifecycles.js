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
};
