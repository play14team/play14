/**
 * LinkedIn Marketing API client for organization page posting
 * OAuth 2.0 authentication with refresh token support
 */

import type { Core } from "@strapi/strapi"
import { createLogger } from "../observability/logger"
import { getAccessToken, getOrganizationId } from "./oauth"
import type {
  LinkedInImageUploadRequest,
  LinkedInImageUploadResponse,
  LinkedInPostContent,
  LinkedInUGCPost,
} from "./types"

const log = createLogger("[LinkedIn]")

export class LinkedInClient {
  private strapi: Core.Strapi
  private baseUrl = "https://api.linkedin.com/v2"

  constructor(strapi: Core.Strapi) {
    this.strapi = strapi
  }

  /**
   * Get authorization headers
   */
  private async getHeaders(): Promise<Record<string, string>> {
    const accessToken = await getAccessToken(this.strapi)

    return {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    }
  }

  /**
   * Upload image to LinkedIn
   */
  private async uploadImage(imageUrl: string): Promise<string> {
    log.info("Uploading image to LinkedIn", { imageUrl })

    try {
      const organizationId = await getOrganizationId(this.strapi)
      const ownerUrn = `urn:li:organization:${organizationId}`

      // Step 1: Register upload
      const registerRequest: LinkedInImageUploadRequest = {
        registerUploadRequest: {
          recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
          owner: ownerUrn,
          serviceRelationships: [
            {
              relationshipType: "OWNER",
              identifier: "urn:li:userGeneratedContent",
            },
          ],
        },
      }

      const headers = await this.getHeaders()
      const registerResponse = await fetch(`${this.baseUrl}/assets?action=registerUpload`, {
        method: "POST",
        headers,
        body: JSON.stringify(registerRequest),
      })

      if (!registerResponse.ok) {
        const errorText = await registerResponse.text()
        log.error("Failed to register image upload", {
          status: registerResponse.status,
          error: errorText,
        })
        throw new Error(`LinkedIn upload registration failed: ${registerResponse.status}`)
      }

      const registerData = (await registerResponse.json()) as LinkedInImageUploadResponse

      // Step 2: Download image from URL
      const imageResponse = await fetch(imageUrl)
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image from ${imageUrl}`)
      }

      const imageBlob = await imageResponse.blob()
      const imageBuffer = await imageBlob.arrayBuffer()

      // Step 3: Upload image binary
      const uploadUrl =
        registerData.value.uploadMechanism[
          "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
        ].uploadUrl
      const uploadHeaders =
        registerData.value.uploadMechanism[
          "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
        ].headers

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: uploadHeaders,
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

      const assetUrn = registerData.value.asset

      log.info("Image uploaded successfully", { assetUrn })

      return assetUrn
    } catch (error) {
      log.error("Failed to upload image to LinkedIn", { imageUrl }, error as Error)
      throw error
    }
  }

  /**
   * Create a post on LinkedIn organization page
   */
  async createPost(content: LinkedInPostContent): Promise<string> {
    log.info("Creating LinkedIn post", { hasImage: !!content.imageUrl })

    try {
      const organizationId = await getOrganizationId(this.strapi)
      const authorUrn = `urn:li:organization:${organizationId}`

      // Upload image if provided
      let mediaUrn: string | undefined
      if (content.imageUrl) {
        mediaUrn = await this.uploadImage(content.imageUrl)
      }

      // Build UGC post payload
      const postPayload: LinkedInUGCPost = {
        author: authorUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: content.text,
            },
            shareMediaCategory: mediaUrn ? "IMAGE" : content.link ? "ARTICLE" : "NONE",
            ...(mediaUrn && {
              media: [
                {
                  status: "READY",
                  media: mediaUrn,
                  title: {
                    text: "Event Image",
                  },
                },
              ],
            }),
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      }

      const headers = await this.getHeaders()
      const response = await fetch(`${this.baseUrl}/ugcPosts`, {
        method: "POST",
        headers,
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

      const responseData = (await response.json()) as { id: string }
      const postId = responseData.id

      log.info("LinkedIn post created successfully", { postId })

      return postId
    } catch (error) {
      log.error("Failed to create LinkedIn post", {}, error as Error)
      throw error
    }
  }
}

/**
 * Create a LinkedIn client instance
 */
export function createLinkedInClient(strapi: Core.Strapi): LinkedInClient {
  const enabled = process.env.LINKEDIN_ENABLED !== "false"

  if (!enabled) {
    throw new Error("LinkedIn integration is disabled (LINKEDIN_ENABLED=false)")
  }

  return new LinkedInClient(strapi)
}
