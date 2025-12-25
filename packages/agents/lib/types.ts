/**
 * Type definitions for LinkedIn enrichment tools
 */

// ============================================================================
// Strapi Types
// ============================================================================

export interface StrapiPlayer {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  position: "Player" | "Host" | "Mentor" | "Founder";
  company?: string;
  tagline?: string;
  bio?: string;
  website?: string;
  avatar?: StrapiMedia;
  socialNetworks: SocialNetwork[];
}

export interface SocialNetwork {
  id: number;
  url: string;
  type:
    | "Twitter"
    | "LinkedIn"
    | "Facebook"
    | "Youtube"
    | "Instagram"
    | "Xing"
    | "Email"
    | "Website"
    | "Wikipedia"
    | "Vimeo"
    | "Other";
}

export interface StrapiMedia {
  id: number;
  documentId: string;
  name: string;
  url: string;
  width?: number;
  height?: number;
  size?: number;
  formats?: {
    thumbnail?: { url: string; width: number; height: number };
    small?: { url: string; width: number; height: number };
    medium?: { url: string; width: number; height: number };
    large?: { url: string; width: number; height: number };
  };
}

export interface StrapiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

// ============================================================================
// LinkedIn Types (from Apify)
// ============================================================================

export interface LinkedInProfile {
  fullName: string;
  headline?: string;
  summary?: string;
  company?: string;
  profilePhotoUrl?: string;
  websiteUrl?: string;
  linkedInUrl: string;
  location?: string;
  connections?: number;
  error?: string;
}
