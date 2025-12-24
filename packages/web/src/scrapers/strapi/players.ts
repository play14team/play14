import { StrapiWriteClient } from "./client"
import { TestimonialAnalyzer } from "../linkedin/analyzer"
import type { LinkedInAuthor } from "../linkedin/types"
import type { StrapiPlayer, StrapiPlayerInput } from "./types"

/**
 * Player Management Service
 * Handles matching existing players or creating new ones
 */
export class PlayerService {
  private client: StrapiWriteClient

  constructor() {
    this.client = new StrapiWriteClient()
  }

  /**
   * Find or create a player from LinkedIn author data
   * Priority: LinkedIn URL match > Name match > Create new
   */
  async findOrCreatePlayer(author: LinkedInAuthor): Promise<StrapiPlayer> {
    console.log(`🔍 Looking for player: ${author.name}`)

    // 1. Try to find by LinkedIn URL (most reliable)
    if (author.profileUrl) {
      const existing = await this.client.findPlayerByLinkedIn(author.profileUrl)
      if (existing) {
        console.log(`   ✅ Found by LinkedIn URL: ${existing.slug}`)
        return existing
      }
    }

    // 2. Try to find by exact name match
    const existingByName = await this.client.findPlayerByName(author.name)
    if (existingByName) {
      console.log(`   ✅ Found by name: ${existingByName.slug}`)

      // If we found by name but have LinkedIn URL, update the player
      if (author.profileUrl) {
        await this.addLinkedInToPlayer(existingByName, author.profileUrl)
      }

      return existingByName
    }

    // 3. Create new player
    console.log(`   ➕ Creating new player for: ${author.name}`)
    return await this.createPlayer(author)
  }

  /**
   * Create a new player from LinkedIn author data
   */
  private async createPlayer(author: LinkedInAuthor): Promise<StrapiPlayer> {
    const slug = await this.generateUniqueSlug(author.name)

    const playerData: StrapiPlayerInput = {
      name: author.name,
      slug,
      tagline: author.headline,
      bio: author.about,
      location: author.location,
      socialNetworks: author.profileUrl
        ? [
            {
              type: "linkedin",
              url: author.profileUrl,
            },
          ]
        : undefined,
    }

    try {
      const response = await this.client.createPlayer(playerData)
      console.log(`   ✅ Created player: ${response.data.slug}`)
      return response.data
    } catch (error) {
      console.error(`   ❌ Failed to create player:`, error)
      throw new Error(
        `Failed to create player: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Add LinkedIn URL to existing player
   */
  private async addLinkedInToPlayer(
    player: StrapiPlayer,
    linkedInUrl: string,
  ): Promise<void> {
    try {
      // Check if LinkedIn URL already exists
      const hasLinkedIn = player.socialNetworks?.some(
        (sn) => sn.type === "linkedin",
      )

      if (hasLinkedIn) {
        return
      }

      // Add LinkedIn to social networks
      const updatedSocialNetworks = [
        ...(player.socialNetworks || []),
        {
          type: "linkedin",
          url: linkedInUrl,
        },
      ]

      await this.client.updatePlayer(player.documentId, {
        socialNetworks: updatedSocialNetworks,
      })

      console.log(`   ✅ Added LinkedIn URL to player: ${player.slug}`)
    } catch (error) {
      console.warn(`   ⚠️  Failed to add LinkedIn URL to player:`, error)
    }
  }

  /**
   * Generate a unique slug from name
   */
  private async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = TestimonialAnalyzer.generateSlug(name)
    let slug = baseSlug
    let counter = 1

    // Check if slug exists, append number if needed
    while (await this.client.findPlayerBySlug(slug)) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    return slug
  }

  /**
   * Validate player data before creating
   */
  private validatePlayerData(data: StrapiPlayerInput): boolean {
    if (!data.name || !data.slug) {
      return false
    }

    // Name should be at least 2 characters
    if (data.name.length < 2) {
      return false
    }

    return true
  }
}
