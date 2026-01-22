import { toSlug } from "../../../../libs/strings"
import { triggerContentRevalidation } from "../../../../services/frontend-revalidation"

/**
 * Lifecycle hooks for Game content type
 * Migrated to Strapi 5 Document Service API
 * See: https://docs.strapi.io/dev-docs/api/document-service
 */

function validate(data: { name?: string; slug?: string }) {
  if (!data || !data.name) return
  const slug = toSlug(data.name)
  if (data.slug !== slug) {
    data.slug = slug
  }
}

export default {
  beforeCreate(game: { params: { data: { name?: string; slug?: string } } }) {
    const { data } = game.params
    validate(data)
  },
  beforeUpdate(game: { params: { data: { name?: string; slug?: string } } }) {
    const { data } = game.params
    validate(data)
  },
  afterCreate(event: { result: { slug?: string } }) {
    triggerContentRevalidation(strapi, "api::game.game", event.result, "create")
  },
  afterUpdate(event: { result: { slug?: string } }) {
    triggerContentRevalidation(strapi, "api::game.game", event.result, "update")
  },
  afterDelete(event: { result: { slug?: string } }) {
    triggerContentRevalidation(strapi, "api::game.game", event.result, "delete")
  },
}
