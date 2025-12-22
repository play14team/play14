"use strict";

const { toSlug } = require("../../../../libs/strings");

/**
 * Lifecycle hooks for Article content type
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
  beforeCreate(article) {
    const { data } = article.params;
    validate(data);
  },
  beforeUpdate(article) {
    const { data } = article.params;
    validate(data);
  },
};
