/**
 * LinkedIn Posts API client for personal account posting
 * Uses the Posts API (/rest/posts) with LinkedIn-Version: 202401 header
 */

import { createLogger } from "../observability/logger"
import type { LinkedInPostContent } from "./types"

const log = createLogger("[LinkedIn]")

export class LinkedInClient {
  private accessToken: string
  private linkedinUserId: string
  private baseUrl = "https://api.linkedin.com"
  private apiVersion = "202401"

  constructor(accessToken: string, linkedinUserId: string) {
    this.accessToken = accessToken
    this.linkedinUserId = linkedinUserId
  }

  /**
   * Get authorization headers for Posts API
   */
  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": this.apiVersion,
      "X-Restli-Protocol-Version": "2.0.0",
    }
  }

  /**
   * Upload image to LinkedIn for use in posts
   */
  private async uploadImage(imageUrl: string): Promise<string> {
    log.info("Uploading image to LinkedIn", { imageUrl })

    try {
      const ownerUrn = `urn:li:person:${this.linkedinUserId}`

      // Step 1: Initialize upload
      const initResponse = await fetch(`${this.baseUrl}/rest/images?action=initializeUpload`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          initializeUploadRequest: {
            owner: ownerUrn,
          },
        }),
      })

      if (!initResponse.ok) {
        const errorText = await initResponse.text()
        log.error("Failed to initialize image upload", {
          status: initResponse.status,
          error: errorText,
        })
        throw new Error(`LinkedIn image upload init failed: ${initResponse.status}`)
      }

      const initData = (await initResponse.json()) as {
        value: {
          uploadUrl: string
          image: string // urn:li:image:{id}
        }
      }

      // Step 2: Download image from source URL
      const imageResponse = await fetch(imageUrl)
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image from ${imageUrl}`)
      }
      const imageBuffer = await imageResponse.arrayBuffer()

      // Step 3: Upload image binary
      const uploadResponse = await fetch(initData.value.uploadUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/octet-stream",
        },
        body: imageBuffer,
      })

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text()
        log.error("Failed to upload image binary", {
          status: uploadResponse.status,
          error: errorText,
        })
        throw new Error(`LinkedIn image upload failed: ${uploadResponse.status}`)
      }

      const imageUrn = initData.value.image
      log.info("Image uploaded successfully", { imageUrn })

      return imageUrn
    } catch (error) {
      log.error("Failed to upload image to LinkedIn", { imageUrl }, error as Error)
      throw error
    }
  }

  /**
   * Create a post on the user's personal LinkedIn profile
   * Uses the Posts API (/rest/posts)
   */
  async createPost(content: LinkedInPostContent): Promise<string> {
    log.info("Creating LinkedIn post", { hasImage: !!content.imageUrl })

    try {
      const authorUrn = `urn:li:person:${this.linkedinUserId}`

      // Upload image if provided
      let imageUrn: string | undefined
      if (content.imageUrl) {
        try {
          imageUrn = await this.uploadImage(content.imageUrl)
        } catch (error) {
          log.warn("Image upload failed, posting without image", {}, error as Error)
        }
      }

      // Build Posts API payload
      const postPayload: Record<string, unknown> = {
        author: authorUrn,
        commentary: content.text,
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      }

      // Add image content if uploaded
      if (imageUrn) {
        postPayload.content = {
          media: {
            title: "Event image",
            id: imageUrn,
          },
        }
      }

      const response = await fetch(`${this.baseUrl}/rest/posts`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(postPayload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        log.error("Failed to create LinkedIn post", {
          status: response.status,
          error: errorText,
        })
        throw new Error(`LinkedIn post creation failed: ${response.status} - ${errorText}`)
      }

      // The Posts API returns the post ID in the x-restli-id header
      const postId = response.headers.get("x-restli-id") || "unknown"

      log.info("LinkedIn post created successfully", { postId })

      return postId
    } catch (error) {
      log.error("Failed to create LinkedIn post", {}, error as Error)
      throw error
    }
  }
}

/**
 * Create a LinkedIn client instance for a specific player
 */
export function createLinkedInClient(accessToken: string, linkedinUserId: string): LinkedInClient {
  if (process.env.LINKEDIN_ENABLED !== "true") {
    throw new Error("LinkedIn integration is disabled (LINKEDIN_ENABLED != true)")
  }

  return new LinkedInClient(accessToken, linkedinUserId)
}
