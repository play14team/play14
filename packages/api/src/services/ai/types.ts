/**
 * Type definitions for AI services
 */

export interface LinkedInPostContent {
  text: string
  imageUrl?: string
  link?: string
  hashtags: string[]
}

export interface GeminiRequest {
  contents: {
    parts: {
      text: string
    }[]
  }[]
  generationConfig?: {
    temperature?: number
    topK?: number
    topP?: number
    maxOutputTokens?: number
  }
}

export interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string
      }[]
    }
    finishReason: string
  }[]
  usageMetadata?: {
    promptTokenCount: number
    candidatesTokenCount: number
    totalTokenCount: number
  }
}

export interface EventContext {
  name: string
  slug: string
  start: string
  end: string
  location: {
    name: string
    city: string
    country: string
  }
  hosts: Array<{
    firstName: string
    lastName: string
  }>
  description?: string
  imageUrl?: string
}
