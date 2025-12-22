"use strict";

const { eventToSlug } = require("../../../../libs/strings");

/**
 * Lifecycle hooks for Event content type
 * Migrated to Strapi 5 Document Service API
 * See: https://docs.strapi.io/dev-docs/api/document-service
 */

function validate(data) {
  if (!data || !data.name || !data.start) return;
  const slug = eventToSlug(data.name, data.start);
  if (data.slug != slug) {
    data.slug = slug;
  }
}

module.exports = {
  beforeCreate(event) {
    const { data } = event.params;
    validate(data);
  },
  beforeUpdate(event) {
    const { data } = event.params;
    validate(data);
  },
};
