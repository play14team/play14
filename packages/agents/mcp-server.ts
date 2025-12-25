#!/usr/bin/env bun
/**
 * MCP Server for LinkedIn Enrichment Tools
 *
 * Provides tools for Claude Code to interact with:
 * - Strapi API (list/get/update players)
 * - Apify (scrape LinkedIn profiles)
 *
 * This server exposes tools that Claude can use to enrich player profiles.
 */

import "dotenv/config";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ApifyClient } from "apify-client";
import type {
  StrapiPlayer,
  SocialNetwork,
  StrapiResponse,
} from "./lib/types.js";

// ============================================================================
// Configuration
// ============================================================================

const STRAPI_URL = process.env.STRAPI_URL || "http://localhost:1337";
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
// Configurable Apify actor for LinkedIn scraping (pay-per-use, no subscription required)
const APIFY_LINKEDIN_ACTOR =
  process.env.APIFY_LINKEDIN_ACTOR || "vulnv/linkedin-profile-scraper";

// Validate required tokens
function validateConfig(): void {
  if (!STRAPI_API_TOKEN) {
    console.error("ERROR: STRAPI_API_TOKEN environment variable is required");
    process.exit(1);
  }
  if (!APIFY_API_TOKEN) {
    console.error("WARNING: APIFY_API_TOKEN not set - LinkedIn scraping will fail");
  }
}

const strapiHeaders = {
  Authorization: `Bearer ${STRAPI_API_TOKEN}`,
  "Content-Type": "application/json",
};

const apifyClient = APIFY_API_TOKEN
  ? new ApifyClient({ token: APIFY_API_TOKEN })
  : null;

// Sanitize error messages to prevent leaking sensitive data (tokens, full URLs with params, etc.)
function sanitizeErrorMessage(message: string): string {
  // Remove potential API tokens (common patterns)
  let sanitized = message.replace(/Bearer\s+[a-zA-Z0-9_-]+/gi, "Bearer [REDACTED]");
  sanitized = sanitized.replace(/api[_-]?token[=:]\s*[a-zA-Z0-9_-]+/gi, "api_token=[REDACTED]");
  sanitized = sanitized.replace(/apify_api_[a-zA-Z0-9]+/gi, "[REDACTED_APIFY_TOKEN]");
  // Remove long hex strings that might be tokens
  sanitized = sanitized.replace(/[a-f0-9]{64,}/gi, "[REDACTED_TOKEN]");
  return sanitized;
}

// Fetch with timeout helper (configurable via env)
const FETCH_TIMEOUT_MS = parseInt(
  process.env.FETCH_TIMEOUT_MS || "30000",
  10
);

// Rate limiting: delay between consecutive Strapi requests (ms, configurable via env)
const STRAPI_REQUEST_DELAY_MS = parseInt(
  process.env.STRAPI_REQUEST_DELAY_MS || "100",
  10
);

// Maximum bio length in characters (configurable via env)
const MAX_BIO_LENGTH = parseInt(
  process.env.MAX_BIO_LENGTH || "10000",
  10
);

// Maximum length for company name (configurable via env)
const MAX_COMPANY_LENGTH = parseInt(
  process.env.MAX_COMPANY_LENGTH || "200",
  10
);

// Maximum length for tagline/headline (configurable via env)
const MAX_TAGLINE_LENGTH = parseInt(
  process.env.MAX_TAGLINE_LENGTH || "500",
  10
);

// Maximum total players to fetch (safety limit, configurable via env)
const MAX_PLAYERS_FETCH = parseInt(
  process.env.MAX_PLAYERS_FETCH || "10000",
  10
);

// Rate limiting for Apify/LinkedIn scraping
// Minimum delay between scrape requests (configurable via env)
const APIFY_MIN_DELAY_MS = parseInt(
  process.env.APIFY_MIN_DELAY_MS || "5000",
  10
);

// Retry/backoff constants
const RETRY_INITIAL_DELAY_MS = 1000;
const RETRY_MAX_DELAY_MS = 10000;

// Bio preview length for list display
const BIO_PREVIEW_LENGTH = 100;

// Strapi batch fetch size (max allowed by API)
const STRAPI_BATCH_SIZE = 100;

// Track last scrape time for rate limiting
// Note: This uses a global variable which is safe in MCP servers since they run
// single-threaded via stdio transport. Concurrent requests are serialized.
let lastApifyScrapeTime = 0;

// Sleep helper for rate limiting
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Rate limiter for Apify requests
async function apifyRateLimitWait(): Promise<void> {
  const now = Date.now();
  const timeSinceLastScrape = now - lastApifyScrapeTime;

  if (timeSinceLastScrape < APIFY_MIN_DELAY_MS) {
    await sleep(APIFY_MIN_DELAY_MS - timeSinceLastScrape);
  }

  lastApifyScrapeTime = Date.now();
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${FETCH_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Fetch with retry and exponential backoff for transient errors
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options);

      // Retry on 429 (rate limited) or 5xx (server errors)
      if (response.status === 429 || response.status >= 500) {
        if (attempt < maxRetries) {
          const backoffMs = Math.min(
            RETRY_INITIAL_DELAY_MS * Math.pow(2, attempt),
            RETRY_MAX_DELAY_MS
          );
          await sleep(backoffMs);
          continue;
        }
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const backoffMs = Math.min(
          RETRY_INITIAL_DELAY_MS * Math.pow(2, attempt),
          RETRY_MAX_DELAY_MS
        );
        await sleep(backoffMs);
      }
    }
  }

  throw lastError || new Error("Request failed after retries");
}

// HTML sanitization for bio field using a safer DOM-like approach
// Only allows safe tags and attributes to prevent XSS
const ALLOWED_BIO_TAGS = new Set([
  "p",
  "br",
  "strong",
  "em",
  "b",
  "i",
  "ul",
  "ol",
  "li",
  "a",
]);

// Validate href is a safe URL (http/https only, no javascript:, data:, etc.)
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// Validate website URL for player profiles
function isValidWebsiteUrl(url: string): { valid: boolean; error?: string } {
  if (!url || url.trim() === "") {
    return { valid: true }; // Empty is valid (optional field)
  }

  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { valid: false, error: "Website URL must use http or https protocol" };
    }
    // Block private/internal URLs
    if (isPrivateHostname(parsed.hostname)) {
      return { valid: false, error: "Website URL cannot be a private/internal address" };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid website URL format" };
  }
}

// Strip all HTML tags and return plain text (safer fallback)
function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// Convert plain text to safe HTML paragraphs
function textToHtmlParagraphs(text: string): string {
  if (!text) return "";

  // Split on double newlines for paragraphs
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (paragraphs.length === 0) return "";

  // Escape HTML entities and wrap in <p> tags
  return paragraphs
    .map((p) => {
      const escaped = p
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;")
        .replace(/\n/g, "<br>");
      return `<p>${escaped}</p>`;
    })
    .join("\n");
}

/**
 * Sanitize HTML for bio field.
 * Strategy: Strip all HTML and convert to safe paragraphs.
 * This is safer than trying to preserve arbitrary HTML.
 */
function sanitizeHtmlBio(html: string): string {
  if (!html) return "";

  // For bio content, we take the safest approach:
  // Strip HTML and convert to clean paragraphs
  const plainText = stripHtmlTags(html);
  return textToHtmlParagraphs(plainText);
}

/**
 * Truncate bio for preview display.
 * Strips HTML first to avoid breaking mid-tag, then truncates plain text.
 */
function truncateBioPreview(bio: string, maxLength: number = BIO_PREVIEW_LENGTH): string {
  if (!bio) return "";

  // Strip HTML first to get plain text
  const plainText = stripHtmlTags(bio);

  if (plainText.length <= maxLength) {
    return plainText;
  }

  // Truncate at word boundary if possible
  const truncated = plainText.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");

  if (lastSpace > maxLength * 0.7) {
    return truncated.substring(0, lastSpace) + "...";
  }

  return truncated + "...";
}

// ============================================================================
// Tool Definitions
// ============================================================================

const tools = [
  {
    name: "list_players_with_linkedin",
    description:
      "List players who have a LinkedIn URL in their social networks. Returns paginated results with player ID, name, LinkedIn URL, and current profile data. Use page parameter for pagination.",
    inputSchema: {
      type: "object" as const,
      properties: {
        page: {
          type: "number",
          description: "Page number (1-based, default: 1)",
        },
        pageSize: {
          type: "number",
          description: "Number of players per page (default: 20, max: 100)",
        },
      },
    },
  },
  {
    name: "get_player",
    description:
      "Get detailed information about a specific player by their document ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        documentId: {
          type: "string",
          description: "The player's document ID",
        },
      },
      required: ["documentId"],
    },
  },
  {
    name: "scrape_linkedin_profile",
    description:
      "Scrape a LinkedIn profile using Apify. Returns name, headline, summary, company, photo URL, and website.",
    inputSchema: {
      type: "object" as const,
      properties: {
        linkedinUrl: {
          type: "string",
          description:
            "The LinkedIn profile URL (e.g., https://linkedin.com/in/username)",
        },
      },
      required: ["linkedinUrl"],
    },
  },
  {
    name: "update_player",
    description:
      "Update a player's profile fields in Strapi. Only updates the fields provided.",
    inputSchema: {
      type: "object" as const,
      properties: {
        documentId: {
          type: "string",
          description: "The player's document ID",
        },
        company: {
          type: "string",
          description: "Company name",
        },
        tagline: {
          type: "string",
          description: "Short tagline/headline",
        },
        bio: {
          type: "string",
          description: "Biography in HTML format (use <p> tags for paragraphs)",
        },
        website: {
          type: "string",
          description: "Personal website URL",
        },
        avatarId: {
          type: "number",
          description: "Media ID of the uploaded avatar (from upload_avatar)",
        },
      },
      required: ["documentId"],
    },
  },
  {
    name: "upload_avatar",
    description:
      "Upload a new avatar image to Strapi media library from a URL. Returns the media ID to use with update_player.",
    inputSchema: {
      type: "object" as const,
      properties: {
        imageUrl: {
          type: "string",
          description: "URL of the image to upload",
        },
        filename: {
          type: "string",
          description:
            "Filename for the uploaded image (e.g., player-slug-avatar.jpg)",
        },
      },
      required: ["imageUrl", "filename"],
    },
  },
];

// ============================================================================
// Tool Implementations
// ============================================================================

// Type alias for compatibility (uses imported StrapiPlayer from lib/types.ts)
type Player = StrapiPlayer;

// ============================================================================
// Tool Argument Types (for type-safe request handling)
// ============================================================================

interface ListPlayersArgs {
  page?: number;
  pageSize?: number;
}

interface GetPlayerArgs {
  documentId: string;
}

interface ScrapeLinkedInArgs {
  linkedinUrl: string;
}

interface UpdatePlayerArgs {
  documentId: string;
  company?: string;
  tagline?: string;
  bio?: string;
  website?: string;
  avatarId?: number;
}

interface UploadAvatarArgs {
  imageUrl: string;
  filename: string;
}

async function listPlayersWithLinkedIn(
  page: number = 1,
  pageSize: number = 20
): Promise<object> {
  // Clamp pageSize to max 100
  const effectivePageSize = Math.min(Math.max(1, pageSize), 100);
  const effectivePage = Math.max(1, page);

  // First, we need to fetch ALL players to find those with LinkedIn
  // because Strapi can't filter on nested component fields
  // We'll fetch in batches (uses STRAPI_BATCH_SIZE constant)
  let allPlayersWithLinkedIn: Array<{
    documentId: string;
    name: string;
    slug: string;
    linkedInUrl: string | undefined;
    currentData: {
      company: string | null;
      tagline: string | null;
      bio: string | null;
      website: string | null;
      hasAvatar: boolean;
      avatarUrl: string | null;
    };
  }> = [];

  let currentStart = 0;
  let totalPlayers = 0;

  // Fetch all pages from Strapi
  while (true) {
    const params = new URLSearchParams({
      "populate[socialNetworks]": "true",
      "populate[avatar]": "true",
      "pagination[limit]": String(STRAPI_BATCH_SIZE),
      "pagination[start]": String(currentStart),
      "sort[0]": "name:asc",
    });

    // Use fetchWithRetry for automatic retry on transient errors
    const response = await fetchWithRetry(
      `${STRAPI_URL}/api/players?${params}`,
      {
        headers: strapiHeaders,
      }
    );

    if (!response.ok) {
      const errorBody = await response
        .text()
        .catch(() => "Unable to read error body");
      throw new Error(
        `Strapi API error: ${response.status} - ${sanitizeErrorMessage(errorBody)}`
      );
    }

    const result: StrapiResponse<Player[]> = await response.json();

    // Get total from first request
    if (currentStart === 0 && result.meta?.pagination?.total) {
      totalPlayers = result.meta.pagination.total;
    }

    // Filter to only players with LinkedIn URLs
    const playersWithLinkedIn = result.data
      .filter((player) =>
        player.socialNetworks?.some(
          (sn) => sn.type === "LinkedIn" && sn.url?.includes("linkedin.com")
        )
      )
      .map((player) => ({
        documentId: player.documentId,
        name: player.name,
        slug: player.slug,
        linkedInUrl: player.socialNetworks?.find((sn) => sn.type === "LinkedIn")
          ?.url,
        currentData: {
          company: player.company || null,
          tagline: player.tagline || null,
          bio: player.bio ? truncateBioPreview(player.bio, BIO_PREVIEW_LENGTH) : null,
          website: player.website || null,
          hasAvatar: !!player.avatar,
          avatarUrl: player.avatar?.url || null,
        },
      }));

    allPlayersWithLinkedIn = allPlayersWithLinkedIn.concat(playersWithLinkedIn);

    // Check if we've fetched all players
    if (result.data.length < STRAPI_BATCH_SIZE) {
      break; // No more data
    }

    currentStart += STRAPI_BATCH_SIZE;

    // Rate limiting: small delay between batch requests
    await sleep(STRAPI_REQUEST_DELAY_MS);

    // Safety check to prevent infinite loops (uses configurable MAX_PLAYERS_FETCH)
    if (currentStart >= MAX_PLAYERS_FETCH) {
      break;
    }
  }

  // Calculate pagination for the filtered results
  const totalWithLinkedIn = allPlayersWithLinkedIn.length;
  const totalPages = Math.ceil(totalWithLinkedIn / effectivePageSize);
  const startIndex = (effectivePage - 1) * effectivePageSize;
  const endIndex = startIndex + effectivePageSize;
  const paginatedPlayers = allPlayersWithLinkedIn.slice(startIndex, endIndex);

  return {
    pagination: {
      page: effectivePage,
      pageSize: effectivePageSize,
      totalPages,
      totalWithLinkedIn,
      totalPlayers,
    },
    players: paginatedPlayers,
  };
}

async function getPlayer(documentId: string): Promise<object> {
  const params = new URLSearchParams({
    "populate[socialNetworks]": "true",
    "populate[avatar]": "true",
  });

  const response = await fetchWithTimeout(
    `${STRAPI_URL}/api/players/${documentId}?${params}`,
    {
      headers: strapiHeaders,
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Player not found: ${documentId}`);
    }
    const errorBody = await response.text().catch(() => "Unable to read error body");
    throw new Error(
      `Strapi API error: ${response.status} - ${sanitizeErrorMessage(errorBody)}`
    );
  }

  const result: StrapiResponse<Player> = await response.json();
  const player = result.data;

  return {
    documentId: player.documentId,
    name: player.name,
    slug: player.slug,
    position: (player as Player & { position?: string }).position,
    linkedInUrl: player.socialNetworks?.find((sn) => sn.type === "LinkedIn")
      ?.url,
    company: player.company || null,
    tagline: player.tagline || null,
    bio: player.bio || null,
    website: player.website || null,
    avatar: player.avatar
      ? {
          id: player.avatar.id,
          url: player.avatar.url,
          width: player.avatar.width,
          height: player.avatar.height,
        }
      : null,
  };
}

async function scrapeLinkedInProfile(linkedinUrl: string): Promise<object> {
  if (!apifyClient) {
    throw new Error("APIFY_API_TOKEN not configured");
  }

  // Normalize and sanitize LinkedIn URL
  // Extract only the username part, stripping any query params or extra path segments
  // This prevents injection via URL parameters while keeping valid profile URLs
  const match = linkedinUrl.match(
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i
  );
  if (!match) {
    throw new Error(`Invalid LinkedIn URL: ${linkedinUrl}`);
  }

  // Validate username doesn't contain suspicious patterns
  const username = match[1];
  if (username.length > 100) {
    throw new Error("LinkedIn username too long");
  }

  // Construct clean URL with only the username (no query params, fragments, or extra paths)
  const normalizedUrl = `https://www.linkedin.com/in/${username}`;

  try {
    // Rate limiting: wait if needed before making request
    await apifyRateLimitWait();

    // Run configurable Apify actor for LinkedIn scraping
    // Default: vulnv/linkedin-profile-scraper (pay-per-use, ~$0.05 start + $0.00425/profile)
    const run = await apifyClient.actor(APIFY_LINKEDIN_ACTOR).call({
      urls: [normalizedUrl],
      resolveEmails: false,
    });

    // Get results
    const { items } = await apifyClient
      .dataset(run.defaultDatasetId)
      .listItems();

    if (!items || items.length === 0) {
      return {
        success: false,
        error: "No data returned from LinkedIn scraper",
        linkedinUrl: normalizedUrl,
      };
    }

    const data = items[0] as Record<string, unknown>;

    // Extract fields from vulnv/linkedin-profile-scraper output format
    const fullName = getString(data, "name");

    const headline = getString(data, "headline");

    const summary = getString(data, "about");

    // Get company from current_company object
    let company: string | undefined;
    if (data.current_company && typeof data.current_company === "object") {
      const currentCompany = data.current_company as Record<string, unknown>;
      company = getString(currentCompany, "name");
    }

    // Profile photo URL
    const profilePhotoUrl = getString(data, "avatar");

    // Location
    const city = getString(data, "city");
    const countryCode = getString(data, "country_code");
    const location = [city, countryCode].filter(Boolean).join(", ");

    return {
      success: true,
      linkedinUrl: normalizedUrl,
      fullName,
      headline,
      summary,
      company,
      profilePhotoUrl,
      location: location || undefined,
      // Additional data from this actor
      followers: data.followers,
      connections: data.connections,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      linkedinUrl: normalizedUrl,
    };
  }
}

async function updatePlayer(
  documentId: string,
  data: {
    company?: string;
    tagline?: string;
    bio?: string;
    website?: string;
    avatarId?: number;
  }
): Promise<object> {
  // Validate company length if provided
  if (data.company !== undefined && data.company.length > MAX_COMPANY_LENGTH) {
    return {
      success: false,
      error: `Company name exceeds maximum length of ${MAX_COMPANY_LENGTH} characters (current: ${data.company.length})`,
    };
  }

  // Validate tagline length if provided
  if (data.tagline !== undefined && data.tagline.length > MAX_TAGLINE_LENGTH) {
    return {
      success: false,
      error: `Tagline exceeds maximum length of ${MAX_TAGLINE_LENGTH} characters (current: ${data.tagline.length})`,
    };
  }

  // Validate website URL if provided
  if (data.website !== undefined && data.website !== "") {
    const websiteValidation = isValidWebsiteUrl(data.website);
    if (!websiteValidation.valid) {
      return { success: false, error: websiteValidation.error };
    }
  }

  // Validate bio length if provided
  if (data.bio !== undefined) {
    const plainTextBio = stripHtmlTags(data.bio);
    if (plainTextBio.length > MAX_BIO_LENGTH) {
      return {
        success: false,
        error: `Bio exceeds maximum length of ${MAX_BIO_LENGTH} characters (current: ${plainTextBio.length})`,
      };
    }
  }

  const updateData: Record<string, unknown> = {};

  if (data.company !== undefined) updateData.company = data.company;
  if (data.tagline !== undefined) updateData.tagline = data.tagline;
  // Sanitize bio HTML to prevent XSS
  if (data.bio !== undefined) updateData.bio = sanitizeHtmlBio(data.bio);
  if (data.website !== undefined) updateData.website = data.website;
  if (data.avatarId !== undefined) updateData.avatar = data.avatarId;

  if (Object.keys(updateData).length === 0) {
    return { success: false, error: "No fields provided to update" };
  }

  const response = await fetchWithTimeout(`${STRAPI_URL}/api/players/${documentId}`, {
    method: "PUT",
    headers: strapiHeaders,
    body: JSON.stringify({ data: updateData }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to update player: ${response.status} - ${sanitizeErrorMessage(errorText)}`
    );
  }

  const result: StrapiResponse<Player> = await response.json();

  return {
    success: true,
    documentId: result.data.documentId,
    name: result.data.name,
    updatedFields: Object.keys(updateData),
  };
}

// Allowlist of domains for avatar downloads (SSRF protection)
const ALLOWED_AVATAR_DOMAINS = [
  "media.licdn.com", // LinkedIn CDN
  "static.licdn.com", // LinkedIn static assets
  "platform-lookaside.fbsbx.com", // Facebook/Meta CDN
  "lh3.googleusercontent.com", // Google profile photos
  "avatars.githubusercontent.com", // GitHub avatars
  "pbs.twimg.com", // Twitter/X profile photos
  "gravatar.com", // Gravatar
  "www.gravatar.com",
];

// Check if hostname is a private/internal IP (SSRF protection)
// Covers: localhost, private IPv4, IPv6, IPv4-mapped IPv6, and common bypasses
function isPrivateHostname(hostname: string): boolean {
  // Normalize: lowercase and remove brackets from IPv6
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  const privatePatterns = [
    // Localhost variants
    /^localhost$/i,
    /^localhost\./i, // localhost.localdomain
    /^127\.\d+\.\d+\.\d+$/, // 127.0.0.0/8
    /^0\.0\.0\.0$/,
    /^0\./, // 0.0.0.0/8

    // Private IPv4 (RFC 1918)
    /^10\.\d+\.\d+\.\d+$/, // 10.0.0.0/8
    /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/, // 172.16.0.0/12
    /^192\.168\.\d+\.\d+$/, // 192.168.0.0/16

    // Link-local IPv4
    /^169\.254\.\d+\.\d+$/, // 169.254.0.0/16

    // Loopback IPv6
    /^::1$/,
    /^0:0:0:0:0:0:0:1$/,

    // IPv6 private/internal
    /^fc[0-9a-f]{2}:/i, // fc00::/7 (Unique local)
    /^fd[0-9a-f]{2}:/i, // fd00::/8 (Unique local)
    /^fe[89ab][0-9a-f]:/i, // fe80::/10 (Link-local)

    // IPv4-mapped IPv6 with private IPs
    /^::ffff:127\./i, // ::ffff:127.x.x.x
    /^::ffff:10\./i, // ::ffff:10.x.x.x
    /^::ffff:172\.(1[6-9]|2\d|3[0-1])\./i, // ::ffff:172.16-31.x.x
    /^::ffff:192\.168\./i, // ::ffff:192.168.x.x
    /^::ffff:169\.254\./i, // ::ffff:169.254.x.x
    /^::ffff:0\./i, // ::ffff:0.x.x.x

    // Common bypass attempts
    /^0x[0-9a-f]+$/i, // Hex IP
    /^\d+$/, // Decimal IP (single number)
    /^[a-f0-9]+:[a-f0-9]+:[a-f0-9]+:[a-f0-9]+:[a-f0-9]+:[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/i, // Full IPv6 check
  ];

  return privatePatterns.some((pattern) => pattern.test(normalized));
}

async function uploadAvatar(
  imageUrl: string,
  filename: string
): Promise<object> {
  // Validate URL
  let url: URL;
  try {
    url = new URL(imageUrl);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Only HTTP(S) URLs are allowed");
    }
  } catch {
    throw new Error("Invalid image URL format");
  }

  // SSRF Protection: Block private IP ranges
  if (isPrivateHostname(url.hostname)) {
    throw new Error("Private/internal URLs are not allowed");
  }

  // SSRF Protection: Only allow known CDN domains for avatars
  if (!ALLOWED_AVATAR_DOMAINS.some((domain) => url.hostname.endsWith(domain))) {
    throw new Error(
      `Domain not allowed for avatar downloads. Allowed: ${ALLOWED_AVATAR_DOMAINS.join(", ")}`
    );
  }

  // Validate filename to prevent path traversal and ensure safe characters
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    throw new Error("Invalid filename: must not contain path separators");
  }

  // Allowlist for image extensions
  const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
  const lowerFilename = filename.toLowerCase();
  const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) => lowerFilename.endsWith(ext));
  if (!hasValidExtension) {
    throw new Error(
      `Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`
    );
  }

  // Sanitize filename: only allow alphanumeric, dash, underscore, dot
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  if (sanitizedFilename !== filename) {
    // Log but continue with sanitized name
    console.error(`Filename sanitized: "${filename}" -> "${sanitizedFilename}"`);
  }

  // Download the image
  const imageResponse = await fetchWithTimeout(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image: ${imageResponse.status}`);
  }

  const imageBlob = await imageResponse.blob();
  const imageBuffer = await imageBlob.arrayBuffer();

  // Create form data (use sanitized filename)
  const formData = new FormData();
  const file = new File([imageBuffer], sanitizedFilename, { type: imageBlob.type });
  formData.append("files", file);

  // Upload to Strapi
  const uploadResponse = await fetchWithTimeout(`${STRAPI_URL}/api/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    },
    body: formData,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(
      `Failed to upload image: ${uploadResponse.status} - ${sanitizeErrorMessage(errorText)}`
    );
  }

  const uploadedFiles = await uploadResponse.json();

  if (!Array.isArray(uploadedFiles) || uploadedFiles.length === 0) {
    throw new Error("Upload succeeded but returned no files");
  }

  const media = uploadedFiles[0];

  if (!media || !media.id) {
    throw new Error("Upload succeeded but returned invalid media data");
  }

  return {
    success: true,
    mediaId: media.id,
    url: media.url,
    filename: media.name,
  };
}

function getString(
  obj: Record<string, unknown>,
  key: string
): string | undefined {
  const value = obj[key];
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return undefined;
}

// ============================================================================
// MCP Server Setup
// ============================================================================

const server = new Server(
  {
    name: "linkedin-enrichment-tools",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: object;

    switch (name) {
      case "list_players_with_linkedin": {
        const listArgs = (args ?? {}) as ListPlayersArgs;
        result = await listPlayersWithLinkedIn(listArgs.page, listArgs.pageSize);
        break;
      }

      case "get_player": {
        const getArgs = (args ?? {}) as unknown as GetPlayerArgs;
        result = await getPlayer(getArgs.documentId);
        break;
      }

      case "scrape_linkedin_profile": {
        const scrapeArgs = (args ?? {}) as unknown as ScrapeLinkedInArgs;
        result = await scrapeLinkedInProfile(scrapeArgs.linkedinUrl);
        break;
      }

      case "update_player": {
        const updateArgs = (args ?? {}) as unknown as UpdatePlayerArgs;
        result = await updatePlayer(updateArgs.documentId, {
          company: updateArgs.company,
          tagline: updateArgs.tagline,
          bio: updateArgs.bio,
          website: updateArgs.website,
          avatarId: updateArgs.avatarId,
        });
        break;
      }

      case "upload_avatar": {
        const uploadArgs = (args ?? {}) as unknown as UploadAvatarArgs;
        result = await uploadAvatar(uploadArgs.imageUrl, uploadArgs.filename);
        break;
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown error",
          }),
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  validateConfig();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("LinkedIn Enrichment MCP Server running on stdio");
}

main().catch(console.error);
