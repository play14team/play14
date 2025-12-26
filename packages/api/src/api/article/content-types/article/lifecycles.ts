import { toSlug } from "../../../../libs/strings";

/**
 * Lifecycle hooks for Article content type
 * Migrated to Strapi 5 Document Service API
 * See: https://docs.strapi.io/dev-docs/api/document-service
 */

interface ArticleData {
  title?: string;
  slug?: string;
}

function validate(data: ArticleData): void {
  if (!data || !data.title) return;
  const slug = toSlug(data.title);
  if (data.slug != slug) {
    data.slug = slug;
  }
}

export default {
  beforeCreate(article: { params: { data: ArticleData } }) {
    const { data } = article.params;
    validate(data);
  },
  beforeUpdate(article: { params: { data: ArticleData } }) {
    const { data } = article.params;
    validate(data);
  },
};
