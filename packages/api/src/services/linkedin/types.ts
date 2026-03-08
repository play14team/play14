/**
 * Type definitions for LinkedIn services
 */

export interface LinkedInPostContent {
  text: string
  imageUrl?: string
  link?: string
  hashtags: string[]
}

export interface OAuthTokens {
  accessToken: string
  refreshToken?: string
  expiresAt: Date
  organizationId: string
}

export interface LinkedInUGCPost {
  author: string // URN format: urn:li:organization:{id}
  lifecycleState: "PUBLISHED"
  specificContent: {
    "com.linkedin.ugc.ShareContent": {
      shareCommentary: {
        text: string
      }
      shareMediaCategory: "NONE" | "IMAGE" | "ARTICLE"
      media?: Array<{
        status: "READY"
        description?: {
          text: string
        }
        media: string // URN of uploaded media
        title?: {
          text: string
        }
      }>
    }
  }
  visibility: {
    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
  }
}

export interface LinkedInImageUploadRequest {
  registerUploadRequest: {
    recipes: string[]
    owner: string // URN format
    serviceRelationships: Array<{
      relationshipType: "OWNER"
      identifier: "urn:li:userGeneratedContent"
    }>
  }
}

export interface LinkedInImageUploadResponse {
  value: {
    uploadMechanism: {
      "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest": {
        uploadUrl: string
        headers: Record<string, string>
      }
    }
    asset: string // URN of the asset
    mediaArtifact: string
  }
}

export interface LinkedInErrorResponse {
  message: string
  status: number
  serviceErrorCode?: number
}
