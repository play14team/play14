/**
 * LinkedIn Post Data Types
 * Based on Apify LinkedIn scraper output
 */

export interface LinkedInAuthor {
  name: string
  profileUrl?: string
  headline?: string
  location?: string
  connections?: string
  about?: string
  imageUrl?: string
}

export interface LinkedInPost {
  postUrl: string
  text: string
  author: LinkedInAuthor
  publishedAt?: string
  reactions?: number
  comments?: number
  shares?: number
  images?: string[]
  hashtags?: string[]
}

export interface ScraperOptions {
  hashtag: string
  maxPosts?: number
  minReactions?: number
  dryRun?: boolean
}

export interface ScraperResult {
  posts: LinkedInPost[]
  processed: number
  created: number
  skipped: number
  errors: string[]
}
