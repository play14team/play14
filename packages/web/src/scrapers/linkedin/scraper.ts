import { ApifyClient } from "apify-client"
import type { LinkedInPost, ScraperOptions } from "./types"

/**
 * LinkedIn Hashtag Scraper using Apify
 * Uses the LinkedIn Hashtag Posts URLs Scraper actor
 */
export class LinkedInScraper {
  private client: ApifyClient
  private actorId: string

  constructor(apiToken: string) {
    this.client = new ApifyClient({ token: apiToken })
    // Using the LinkedIn Hashtag Posts URLs Scraper
    // Alternative: "curious_coder/linkedin-post-search-scraper"
    this.actorId = "sasky/linkedin-hashtag-posts-urls-scraper"
  }

  /**
   * Search LinkedIn posts by hashtag
   */
  async searchByHashtag(options: ScraperOptions): Promise<LinkedInPost[]> {
    const { hashtag, maxPosts = 50 } = options

    console.log(`🔍 Searching LinkedIn for #${hashtag}...`)
    console.log(`   Max posts: ${maxPosts}`)

    try {
      // Run the Apify actor
      const run = await this.client.actor(this.actorId).call({
        hashtag: hashtag.replace(/^#/, ""), // Remove # if present
        maxPosts,
      })

      console.log(`✅ Actor run completed: ${run.id}`)
      console.log(`   Status: ${run.status}`)

      // Get the results from the dataset
      const { items } = await this.client
        .dataset(run.defaultDatasetId)
        .listItems()

      console.log(`📊 Found ${items.length} posts`)

      // Transform Apify results to our format
      return this.transformResults(items)
    } catch (error) {
      console.error("❌ Error scraping LinkedIn:", error)
      throw new Error(
        `Failed to scrape LinkedIn: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Transform Apify results to our internal format
   * Note: Field names may vary depending on the actor used
   */
  private transformResults(items: any[]): LinkedInPost[] {
    const posts: LinkedInPost[] = []

    for (const item of items) {
      try {
        // Handle different possible response formats
        const post: LinkedInPost = {
          postUrl: item.postUrl || item.url || item.link || "",
          text: item.text || item.content || item.commentary || "",
          author: {
            name: item.authorName || item.author?.name || "Unknown",
            profileUrl:
              item.authorProfileUrl ||
              item.author?.profileUrl ||
              item.author?.url,
            headline: item.authorHeadline || item.author?.headline,
            location: item.authorLocation || item.author?.location,
            imageUrl: item.authorImageUrl || item.author?.imageUrl,
          },
          publishedAt: item.publishedAt || item.postedDate || item.date,
          reactions: item.reactions || item.numReactions || 0,
          comments: item.comments || item.numComments || 0,
          shares: item.shares || item.numShares || 0,
          hashtags: item.hashtags || [],
          images: item.images || [],
        }

        posts.push(post)
      } catch (error) {
        console.warn("⚠️  Failed to transform item:", error)
      }
    }

    return posts
  }

  /**
   * Get actor run details for debugging
   */
  async getActorInfo(): Promise<any> {
    try {
      const actor = await this.client.actor(this.actorId).get()
      return {
        name: actor?.name,
        title: actor?.title,
        description: actor?.description,
        stats: actor?.stats,
      }
    } catch (error) {
      console.error("Failed to get actor info:", error)
      return null
    }
  }
}
