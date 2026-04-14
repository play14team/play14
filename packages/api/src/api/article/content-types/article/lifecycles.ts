import { toSlug } from "../../../../libs/strings"
import { triggerContentRevalidation } from "../../../../services/frontend-revalidation"

/**
 * Lifecycle hooks for Article content type
 * Migrated to Strapi 5 Document Service API
 * See: https://docs.strapi.io/dev-docs/api/document-service
 */

function validate(data: { title?: string; slug?: string }) {
  if (!data?.title) return
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
  afterCreate(event: { result: { slug?: string } }) {
    triggerContentRevalidation(strapi, "api::article.article", event.result, "create")
  },
  afterUpdate(event: { result: { slug?: string } }) {
    triggerContentRevalidation(strapi, "api::article.article", event.result, "update")
  },
  afterDelete(event: { result: { slug?: string } }) {
    triggerContentRevalidation(strapi, "api::article.article", event.result, "delete")
  },
}
