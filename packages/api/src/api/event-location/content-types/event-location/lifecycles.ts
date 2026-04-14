import { toSlug } from "../../../../libs/strings"
import { triggerContentRevalidation } from "../../../../services/frontend-revalidation"

/**
 * Lifecycle hooks for Event Location content type
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
  beforeCreate(location: { params: { data: { title?: string; slug?: string } } }) {
    const { data } = location.params
    validate(data)
  },
  beforeUpdate(location: { params: { data: { title?: string; slug?: string } } }) {
    const { data } = location.params
    validate(data)
  },
  afterCreate(event: { result: { slug?: string } }) {
    triggerContentRevalidation(strapi, "api::event-location.event-location", event.result, "create")
  },
  afterUpdate(event: { result: { slug?: string } }) {
    triggerContentRevalidation(strapi, "api::event-location.event-location", event.result, "update")
  },
  afterDelete(event: { result: { slug?: string } }) {
    triggerContentRevalidation(strapi, "api::event-location.event-location", event.result, "delete")
  },
}
