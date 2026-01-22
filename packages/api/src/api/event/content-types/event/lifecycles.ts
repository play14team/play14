import { eventToSlug } from "../../../../libs/strings"
import { triggerContentRevalidation } from "../../../../services/frontend-revalidation"

/**
 * Lifecycle hooks for Event content type
 * Migrated to Strapi 5 Document Service API
 * See: https://docs.strapi.io/dev-docs/api/document-service
 */

function validate(data: { name?: string; start?: string; slug?: string }) {
  if (!data || !data.name || !data.start) return
  const slug = eventToSlug(data.name, data.start)
  if (data.slug !== slug) {
    data.slug = slug
  }
}

export default {
  beforeCreate(event: { params: { data: { name?: string; start?: string; slug?: string } } }) {
    const { data } = event.params
    validate(data)
  },
  beforeUpdate(event: { params: { data: { name?: string; start?: string; slug?: string } } }) {
    const { data } = event.params
    validate(data)
  },
  afterCreate(event: { result: { slug?: string } }) {
    triggerContentRevalidation(strapi, "api::event.event", event.result, "create")
  },
  afterUpdate(event: { result: { slug?: string } }) {
    triggerContentRevalidation(strapi, "api::event.event", event.result, "update")
  },
  afterDelete(event: { result: { slug?: string } }) {
    triggerContentRevalidation(strapi, "api::event.event", event.result, "delete")
  },
}
