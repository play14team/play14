import { toSlug } from "../../../../libs/strings";

/**
 * Lifecycle hooks for Event Location content type
 * Migrated to Strapi 5 Document Service API
 * See: https://docs.strapi.io/dev-docs/api/document-service
 */

interface LocationData {
  title?: string;
  slug?: string;
}

function validate(data: LocationData): void {
  if (!data || !data.title) return;
  const slug = toSlug(data.title);
  if (data.slug != slug) {
    data.slug = slug;
  }
}

export default {
  beforeCreate(location: { params: { data: LocationData } }) {
    const { data } = location.params;
    validate(data);
  },
  beforeUpdate(location: { params: { data: LocationData } }) {
    const { data } = location.params;
    validate(data);
  },
};
