import { StrapiWriteClient } from "./client"
import { TestimonialAnalyzer } from "../linkedin/analyzer"
import { PlayerService } from "./players"
import type { LinkedInPost } from "../linkedin/types"
import type { StrapiTestimonialInput } from "./types"

/**
 * Testimonial Management Service
 * Handles creating testimonials and linking them to players
 */
export class TestimonialService {
  private client: StrapiWriteClient
  private playerService: PlayerService

  constructor() {
    this.client = new StrapiWriteClient()
    this.playerService = new PlayerService()
  }

  /**
   * Process a LinkedIn post and create a testimonial
   * Returns true if testimonial was created, false if skipped
   */
  async processPost(post: LinkedInPost, dryRun = false): Promise<boolean> {
    console.log(`\n📝 Processing post: ${post.postUrl}`)

    // 1. Validate post content
    if (!TestimonialAnalyzer.isValidTestimonial(post)) {
      console.log(`   ⏭️  Skipped: Not a valid testimonial`)
      return false
    }

    // 2. Check for duplicates
    const existing = await this.client.findTestimonialByUrl(post.postUrl)
    if (existing) {
      console.log(`   ⏭️  Skipped: Already exists (ID: ${existing.documentId})`)
      return false
    }

    // 3. Extract testimonial content
    const content = TestimonialAnalyzer.extractTestimonial(post)
    if (!content || content.length < 50) {
      console.log(`   ⏭️  Skipped: Content too short or empty`)
      return false
    }

    console.log(`   📄 Content: ${content.substring(0, 100)}...`)

    // 4. Find or create player
    const player = await this.playerService.findOrCreatePlayer(post.author)

    if (dryRun) {
      console.log(`   🧪 DRY RUN: Would create testimonial`)
      console.log(`      Author: ${player.name} (${player.slug})`)
      console.log(`      Content length: ${content.length} chars`)
      return true
    }

    // 5. Create testimonial
    const testimonialData: StrapiTestimonialInput = {
      content,
      url: post.postUrl,
      author: {
        connect: [{ documentId: player.documentId }],
      },
    }

    try {
      const response = await this.client.createTestimonial(testimonialData)
      console.log(`   ✅ Created testimonial: ${response.data.documentId}`)
      return true
    } catch (error) {
      console.error(`   ❌ Failed to create testimonial:`, error)
      throw new Error(
        `Failed to create testimonial: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Process multiple posts in batch
   */
  async processPosts(
    posts: LinkedInPost[],
    dryRun = false,
  ): Promise<{
    processed: number
    created: number
    skipped: number
    errors: string[]
  }> {
    const results = {
      processed: 0,
      created: 0,
      skipped: 0,
      errors: [] as string[],
    }

    for (const post of posts) {
      results.processed++

      try {
        const created = await this.processPost(post, dryRun)
        if (created) {
          results.created++
        } else {
          results.skipped++
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        results.errors.push(`${post.postUrl}: ${errorMsg}`)
        results.skipped++
      }
    }

    return results
  }
}
