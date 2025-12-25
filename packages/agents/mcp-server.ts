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

// ============================================================================
// Configuration
// ============================================================================

const STRAPI_URL = process.env.STRAPI_URL || "http://localhost:1337";
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;

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

// Fetch with timeout helper
const FETCH_TIMEOUT_MS = 30000;

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

interface SocialNetwork {
  id: number;
  url: string;
  type: string;
}

interface Player {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  company?: string;
  tagline?: string;
  bio?: string;
  website?: string;
  avatar?: {
    id: number;
    url: string;
    width?: number;
    height?: number;
  };
  socialNetworks?: SocialNetwork[];
}

interface StrapiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      total: number;
    };
  };
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
  // We'll fetch in batches of 100 (max allowed)
  const BATCH_SIZE = 100;
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
      "pagination[limit]": String(BATCH_SIZE),
      "pagination[start]": String(currentStart),
      "sort[0]": "name:asc",
    });

    const response = await fetchWithTimeout(
      `${STRAPI_URL}/api/players?${params}`,
      {
        headers: strapiHeaders,
      }
    );

    if (!response.ok) {
      const errorBody = await response
        .text()
        .catch(() => "Unable to read error body");
      throw new Error(`Strapi API error: ${response.status} - ${errorBody}`);
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
          bio: player.bio ? `${player.bio.substring(0, 100)}...` : null,
          website: player.website || null,
          hasAvatar: !!player.avatar,
          avatarUrl: player.avatar?.url || null,
        },
      }));

    allPlayersWithLinkedIn = allPlayersWithLinkedIn.concat(playersWithLinkedIn);

    // Check if we've fetched all players
    if (result.data.length < BATCH_SIZE) {
      break; // No more data
    }

    currentStart += BATCH_SIZE;

    // Safety check to prevent infinite loops
    if (currentStart > 10000) {
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
    throw new Error(`Strapi API error: ${response.status} - ${errorBody}`);
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

  // Normalize URL
  const match = linkedinUrl.match(
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i
  );
  if (!match) {
    throw new Error(`Invalid LinkedIn URL: ${linkedinUrl}`);
  }
  const normalizedUrl = `https://www.linkedin.com/in/${match[1]}`;

  try {
    // Run Apify actor - using vulnv/linkedin-profile-scraper (pay-per-use, no subscription)
    // Cost: $0.05 start fee + $0.00425 per profile
    const run = await apifyClient
      .actor("vulnv/linkedin-profile-scraper")
      .call({
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
  const updateData: Record<string, unknown> = {};

  if (data.company !== undefined) updateData.company = data.company;
  if (data.tagline !== undefined) updateData.tagline = data.tagline;
  if (data.bio !== undefined) updateData.bio = data.bio;
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
    throw new Error(`Failed to update player: ${response.status} - ${errorText}`);
  }

  const result: StrapiResponse<Player> = await response.json();

  return {
    success: true,
    documentId: result.data.documentId,
    name: result.data.name,
    updatedFields: Object.keys(updateData),
  };
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
    throw new Error(`Invalid image URL: ${imageUrl}`);
  }

  // Validate filename to prevent path traversal
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    throw new Error("Invalid filename: must not contain path separators");
  }

  // Download the image
  const imageResponse = await fetchWithTimeout(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image: ${imageResponse.status}`);
  }

  const imageBlob = await imageResponse.blob();
  const imageBuffer = await imageBlob.arrayBuffer();

  // Create form data
  const formData = new FormData();
  const file = new File([imageBuffer], filename, { type: imageBlob.type });
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
    throw new Error(`Failed to upload image: ${uploadResponse.status} - ${errorText}`);
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
      case "list_players_with_linkedin":
        result = await listPlayersWithLinkedIn(
          (args as { page?: number }).page,
          (args as { pageSize?: number }).pageSize
        );
        break;

      case "get_player":
        result = await getPlayer((args as { documentId: string }).documentId);
        break;

      case "scrape_linkedin_profile":
        result = await scrapeLinkedInProfile(
          (args as { linkedinUrl: string }).linkedinUrl
        );
        break;

      case "update_player": {
        const updateArgs = args as {
          documentId: string;
          company?: string;
          tagline?: string;
          bio?: string;
          website?: string;
          avatarId?: number;
        };
        result = await updatePlayer(updateArgs.documentId, {
          company: updateArgs.company,
          tagline: updateArgs.tagline,
          bio: updateArgs.bio,
          website: updateArgs.website,
          avatarId: updateArgs.avatarId,
        });
        break;
      }

      case "upload_avatar":
        result = await uploadAvatar(
          (args as { imageUrl: string }).imageUrl,
          (args as { filename: string }).filename
        );
        break;

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
