import { toSlug } from "../../../../libs/strings"

/**
 * Lifecycle hooks for Article content type
 * Migrated to Strapi 5 Document Service API
 * See: https://docs.strapi.io/dev-docs/api/document-service
 */

function validate(data: { title?: string; slug?: string }) {
  if (!data || !data.title) return
  const slug = toSlug(data.title)
  if (data.slug !== slug) {
    data.slug = slug
  }
}

export default {
  beforeCreate(article: { params: { data: { title?: string; slug?: string } } }) {
    const { data } = article.params
    validate(data)
  },
  beforeUpdate(article: { params: { data: { title?: string; slug?: string } } }) {
    const { data } = article.params
    validate(data)
  },
}
