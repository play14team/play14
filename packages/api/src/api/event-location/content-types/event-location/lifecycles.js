"use strict";

const { toSlug } = require("../../../../libs/strings");

/**
 * Lifecycle hooks for Event Location content type
 * Migrated to Strapi 5 Document Service API
 * See: https://docs.strapi.io/dev-docs/api/document-service
 */

function validate(data) {
  if (!data || !data.title) return;
  const slug = toSlug(data.title);
  if (data.slug != slug) {
    data.slug = slug;
  }
}

module.exports = {
  beforeCreate(location) {
    const { data } = location.params;
    validate(data);
  },
  beforeUpdate(location) {
    const { data } = location.params;
    validate(data);
  },
};
