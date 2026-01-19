/**
 * Article test data factory for web package
 *
 * Creates mock article data matching Strapi API responses
 */

export interface ArticleImage {
  name: string
  url: string
  width: number
  height: number
}

export interface ArticleAuthor {
  name: string
  slug: string
  avatar: ArticleImage | null
}

export interface ArticleTag {
  value: string
}

export interface ArticleFixture {
  documentId: string
  title: string
  slug: string
  abstract: string | null
  content: string
  publishedAt: string
  defaultImage: ArticleImage | null
  author: ArticleAuthor | null
  tags: ArticleTag[]
}

let articleCounter = 0

/**
 * Create an article fixture with sensible defaults
 */
export function createArticle(overrides: Partial<ArticleFixture> = {}): ArticleFixture {
  articleCounter++
  const now = new Date()

  return {
    documentId: `article-${articleCounter}`,
    title: `Test Article ${articleCounter}`,
    slug: `test-article-${articleCounter}`,
    abstract: `Abstract for test article ${articleCounter}`,
    content: `<p>Content for test article ${articleCounter}. This is a detailed article about agile games and facilitation.</p>`,
    publishedAt: now.toISOString(),
    defaultImage: {
      name: `article-${articleCounter}.jpg`,
      url: `https://example.com/images/article-${articleCounter}.jpg`,
      width: 1200,
      height: 630,
    },
    author: {
      name: `Author ${articleCounter}`,
      slug: `author-${articleCounter}`,
      avatar: {
        name: `author-${articleCounter}.jpg`,
        url: `https://example.com/avatars/author-${articleCounter}.jpg`,
        width: 200,
        height: 200,
      },
    },
    tags: [{ value: "agile" }, { value: "games" }, { value: "facilitation" }],
    ...overrides,
  }
}

/**
 * Create an article without author
 */
export function createArticleWithoutAuthor(
  overrides: Partial<ArticleFixture> = {}
): ArticleFixture {
  return createArticle({
    author: null,
    ...overrides,
  })
}

/**
 * Create an article without image
 */
export function createArticleWithoutImage(overrides: Partial<ArticleFixture> = {}): ArticleFixture {
  return createArticle({
    defaultImage: null,
    ...overrides,
  })
}

/**
 * Create a minimal article
 */
export function createMinimalArticle(overrides: Partial<ArticleFixture> = {}): ArticleFixture {
  return createArticle({
    abstract: null,
    defaultImage: null,
    author: null,
    tags: [],
    ...overrides,
  })
}

/**
 * Reset the counter (useful in beforeEach)
 */
export function resetArticleCounter(): void {
  articleCounter = 0
}
