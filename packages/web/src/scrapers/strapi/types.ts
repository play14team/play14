/**
 * Strapi Write API Types
 * For creating and updating records via REST API
 */

export interface StrapiPlayerInput {
  name: string
  slug: string
  tagline?: string
  bio?: string
  location?: string
  website?: string
  position?: string
  company?: string
  socialNetworks?: Array<{
    type: string
    url: string
  }>
}

export interface StrapiTestimonialInput {
  content: string
  url: string
  author?: {
    connect?: Array<{ documentId: string }>
  }
}

export interface StrapiCreateResponse<T> {
  data: T
}

export interface StrapiPlayer {
  documentId: string
  slug: string
  name: string
  tagline?: string
  bio?: string
  location?: string
  website?: string
  position?: string
  company?: string
  socialNetworks?: Array<{
    id: string
    type: string
    url: string
  }>
}

export interface StrapiTestimonial {
  documentId: string
  content: string
  url: string
  author?: {
    documentId: string
    name: string
    slug: string
  }
}
