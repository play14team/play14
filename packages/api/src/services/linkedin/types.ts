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
  linkedinUserId: string
}

/**
 * LinkedIn Posts API payload (v202401+)
 * Used with /rest/posts endpoint
 */
export interface LinkedInPostPayload {
  author: string // urn:li:person:{linkedinUserId}
  commentary: string
  visibility: "PUBLIC" | "CONNECTIONS"
  distribution: {
    feedDistribution: "MAIN_FEED"
    targetEntities: []
    thirdPartyDistributionChannels: []
  }
  content?: {
    media?: {
      title?: string
      id: string // urn:li:image:{assetId}
    }
    article?: {
      source: string // URL
      title?: string
      description?: string
    }
  }
  lifecycleState: "PUBLISHED"
  isReshareDisabledByAuthor: false
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
