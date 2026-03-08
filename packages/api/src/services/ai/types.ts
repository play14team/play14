/**
 * Type definitions for AI services
 */

// Re-export from LinkedIn types for backwards compatibility
export type { LinkedInPostContent } from "../linkedin/types"

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
    name: string
  }>
  description?: string
  imageUrl?: string
}
