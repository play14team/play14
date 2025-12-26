import { eventToSlug } from "../../../../libs/strings";

/**
 * Lifecycle hooks for Event content type
 * Migrated to Strapi 5 Document Service API
 * See: https://docs.strapi.io/dev-docs/api/document-service
 */

interface EventData {
  name?: string;
  start?: string | Date;
  slug?: string;
}

function validate(data: EventData): void {
  if (!data || !data.name || !data.start) return;
  const slug = eventToSlug(data.name, data.start);
  if (data.slug != slug) {
    data.slug = slug;
  }
}

export default {
  beforeCreate(event: { params: { data: EventData } }) {
    const { data } = event.params;
    validate(data);
  },
  beforeUpdate(event: { params: { data: EventData } }) {
    const { data } = event.params;
    validate(data);
  },
};
