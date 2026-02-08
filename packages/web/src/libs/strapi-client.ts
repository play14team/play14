import "server-only"
import { type StrapiClient, strapi } from "@strapi/client"
import qs from "qs"
import { getAuthCookie } from "./auth"

// ============================================================================
// SSRF Protection Utilities
// ============================================================================

/**
 * Validates that a path segment is a safe identifier (slug, documentId, or numeric id)
 * Prevents SSRF attacks by ensuring path segments don't contain path traversal or URL manipulation
 *
 * Valid formats:
 * - Slugs: alphanumeric with hyphens and underscores (e.g., "my-event-2024")
 * - Document IDs: alphanumeric (e.g., "abc123def456")
 * - Numeric IDs: positive integers (e.g., "123")
 *
 * @throws Error if the identifier is invalid
 */
export function validatePathSegment(value: string, paramName = "id"): string {
  if (!value || typeof value !== "string") {
    throw new Error(`Invalid ${paramName}: must be a non-empty string`)
  }

  // Trim whitespace
  const trimmed = value.trim()

  // Check for empty after trim
  if (trimmed.length === 0) {
    throw new Error(`Invalid ${paramName}: must not be empty`)
  }

  // Check for maximum length to prevent DoS
  if (trimmed.length > 255) {
    throw new Error(`Invalid ${paramName}: exceeds maximum length`)
  }

  // Valid slug/documentId pattern: alphanumeric, hyphens, underscores
  // This prevents path traversal (../, ..\), URL manipulation, and injection
  const safePattern = /^[a-zA-Z0-9_-]+$/
  if (!safePattern.test(trimmed)) {
    throw new Error(`Invalid ${paramName}: contains invalid characters`)
  }

  return trimmed
}

/**
 * Validates multiple path segments at once
 * @throws Error if any identifier is invalid
 */
export function validatePathSegments(segments: Record<string, string>): Record<string, string> {
  const validated: Record<string, string> = {}
  for (const [name, value] of Object.entries(segments)) {
    validated[name] = validatePathSegment(value, name)
  }
  return validated
}

/**
 * Builds a safe API URL with validated path segments
 * Use this for all API calls with user-provided path parameters
 *
 * @example
 * ```typescript
 * // Instead of: `${STRAPI_URL}/api/admin/events/${slug}/edit`
 * // Use: buildApiUrl('/admin/events/:slug/edit', { slug })
 * const url = buildApiUrl('/admin/events/:slug/edit', { slug })
 * ```
 */
export function buildApiUrl(pathTemplate: string, params: Record<string, string> = {}): string {
  // Validate all parameters first
  const validatedParams = validatePathSegments(params)

  // Replace placeholders with validated values
  let path = pathTemplate
  for (const [name, value] of Object.entries(validatedParams)) {
    path = path.replace(`:${name}`, encodeURIComponent(value))
  }

  // Ensure no unreplaced placeholders remain
  if (path.includes(":")) {
    const missingParams = path.match(/:[a-zA-Z_]+/g)
    throw new Error(`Missing required path parameters: ${missingParams?.join(", ")}`)
  }

  const STRAPI_URL = process.env.STRAPI_API_URL || "http://localhost:1337"
  return `${STRAPI_URL}${path.startsWith("/api") ? path : `/api${path}`}`
}

const STRAPI_REST_ENDPOINT = `${(process.env.STRAPI_API_URL || "").replace(/\/$/, "")}/api`

// Fallback to production if primary endpoint is unavailable
const STRAPI_FALLBACK_ENDPOINT = process.env.STRAPI_FALLBACK_API_URL
  ? `${process.env.STRAPI_FALLBACK_API_URL.replace(/\/$/, "")}/api`
  : "https://community.play14.org/api"

/**
 * Fetch with timeout to prevent hanging connections
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = 30000
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Retry configuration for API requests
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  timeout: 30000, // 30 seconds per attempt
}

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Calculate exponential backoff delay with jitter
 */
function getBackoffDelay(attempt: number): number {
  const exponentialDelay = RETRY_CONFIG.baseDelay * 2 ** attempt
  const jitter = Math.random() * 1000 // Add up to 1 second of random jitter
  return Math.min(exponentialDelay + jitter, RETRY_CONFIG.maxDelay)
}

/**
 * Check if an error is retryable (timeout, network error, or 5xx server error)
 */
function isRetryableError(error: unknown, response?: Response): boolean {
  // Timeout errors (AbortError)
  if (error instanceof Error && error.name === "AbortError") {
    return true
  }
  // Network errors
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return true
  }
  // Server errors (5xx)
  if (response && response.status >= 500) {
    return true
  }
  // Rate limiting (429)
  if (response && response.status === 429) {
    return true
  }
  return false
}

/**
 * Strapi REST API query parameters
 */
export interface StrapiParams {
  filters?: Record<string, unknown>
  sort?: string[]
  pagination?: {
    page?: number
    pageSize?: number
    limit?: number
    start?: number
  }
  populate?: string | string[] | Record<string, unknown>
  fields?: string[]
}

/**
 * Strapi pagination metadata
 */
export interface StrapiPagination {
  page: number
  pageSize: number
  pageCount: number
  total: number
}

/**
 * Strapi REST API response structure
 */
export interface StrapiResponse<T> {
  data: T
  meta?: {
    pagination?: StrapiPagination
  }
}

/**
 * Normalized response structure matching GraphQL _connection pattern
 * This allows components to work with both GraphQL and REST responses
 */
export interface StrapiConnectionResponse<T> {
  nodes: T[]
  pageInfo: StrapiPagination
}

/**
 * Default pagination values
 */
const defaultPagination: StrapiPagination = {
  page: 1,
  pageSize: 25,
  pageCount: 1,
  total: 0,
}

/**
 * Attempts to fetch from a specific endpoint with retry logic
 */
async function tryFetch(
  baseUrl: string,
  endpoint: string,
  queryString: string,
  token: string | undefined
): Promise<{ response: Response; url: string } | null> {
  const url = `${baseUrl}/${endpoint}${queryString}`

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(
        url,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
          },
        },
        RETRY_CONFIG.timeout
      )

      if (response.ok) {
        return { response, url }
      }

      // Check if we should retry based on status code
      if (isRetryableError(null, response) && attempt < RETRY_CONFIG.maxRetries) {
        const delay = getBackoffDelay(attempt)
        console.warn(
          `[Strapi] Request returned ${response.status}, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries}):`,
          url
        )
        await sleep(delay)
        continue
      }

      console.warn("[Strapi] Request returned error:", url, response.status, response.statusText)
      return null
    } catch (error) {
      // Check if we should retry based on error type
      if (isRetryableError(error) && attempt < RETRY_CONFIG.maxRetries) {
        const delay = getBackoffDelay(attempt)
        console.warn(
          `[Strapi] Request failed with ${error instanceof Error ? error.name : "error"}, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries}):`,
          url
        )
        await sleep(delay)
        continue
      }

      console.warn(
        "[Strapi] Request failed:",
        url,
        error instanceof Error ? error.message : String(error)
      )
      return null
    }
  }

  return null
}

/**
 * Safely parse JSON response with error handling
 */
async function parseJsonResponse<T>(response: Response, url: string): Promise<StrapiResponse<T>> {
  try {
    return (await response.json()) as StrapiResponse<T>
  } catch (error) {
    console.error(
      "[Strapi] Failed to parse JSON:",
      url,
      error instanceof Error ? error.message : String(error)
    )
    throw new Error("Invalid JSON response from Strapi API")
  }
}

/**
 * Main REST query function
 * Executes a GET request to the Strapi REST API with the provided parameters
 * Falls back to production endpoint if primary is unavailable
 */
export async function restQuery<T>(
  endpoint: string,
  params?: StrapiParams
): Promise<StrapiResponse<T>> {
  const queryString = params ? `?${qs.stringify(params, { encodeValuesOnly: true })}` : ""

  const primaryToken = process.env.STRAPI_API_SECRET
  const fallbackToken = process.env.STRAPI_FALLBACK_API_SECRET || process.env.STRAPI_API_SECRET

  // Try primary endpoint first
  const primaryResult = await tryFetch(STRAPI_REST_ENDPOINT, endpoint, queryString, primaryToken)

  if (primaryResult) {
    return parseJsonResponse<T>(primaryResult.response, primaryResult.url)
  }

  // Fallback to production if primary failed and fallback is different
  if (STRAPI_REST_ENDPOINT !== STRAPI_FALLBACK_ENDPOINT) {
    console.log(
      `[Strapi] Primary endpoint unavailable, trying fallback: ${STRAPI_FALLBACK_ENDPOINT}`
    )

    const fallbackResult = await tryFetch(
      STRAPI_FALLBACK_ENDPOINT,
      endpoint,
      queryString,
      fallbackToken
    )

    if (fallbackResult) {
      return parseJsonResponse<T>(fallbackResult.response, fallbackResult.url)
    }
  }

  // Both endpoints failed
  const url = `${STRAPI_REST_ENDPOINT}/${endpoint}${queryString}`
  console.error("==================== REST API Error ====================")
  console.error("Endpoint:", url)
  console.error("Both primary and fallback endpoints failed")
  console.error("=========================================================")
  throw new Error("REST API Error: Unable to reach Strapi API")
}

/**
 * Normalizes a paginated REST response to match GraphQL _connection structure
 * This allows components to remain unchanged during migration
 *
 * REST: { data: [...], meta: { pagination: {...} } }
 * GraphQL: { entity_connection: { nodes: [...], pageInfo: {...} } }
 */
export function normalizeConnection<T>(response: StrapiResponse<T[]>): StrapiConnectionResponse<T> {
  return {
    nodes: response.data || [],
    pageInfo: response.meta?.pagination || defaultPagination,
  }
}

/**
 * Extracts a single entity from REST response
 * Handles both single object and array responses
 */
export function normalizeEntity<T>(response: StrapiResponse<T | T[]>): T | null {
  if (!response.data) return null
  return Array.isArray(response.data) ? response.data[0] || null : response.data
}

/**
 * Helper to get document ID (Strapi 5)
 * documentId is the primary identifier (string)
 */
export function getDocumentId(
  item: { documentId?: string; id?: string | number } | null | undefined
): string | null {
  return item?.documentId || item?.id?.toString() || null
}

// ============================================================================
// @strapi/client SDK Integration
// ============================================================================

const STRAPI_URL = process.env.STRAPI_API_URL || "http://localhost:1337"

/**
 * Get an authenticated Strapi client instance.
 * Uses the current user's JWT from the auth cookie.
 *
 * @returns Strapi client configured with baseURL and auth token
 * @throws Error if user is not authenticated
 *
 * @example
 * ```typescript
 * const client = await getStrapiClient()
 * const events = client.collection('events')
 * const allEvents = await events.find()
 * ```
 */
export async function getStrapiClient(): Promise<StrapiClient> {
  const jwt = await getAuthCookie()
  if (!jwt) {
    throw new Error("Not authenticated - cannot create Strapi client")
  }

  return strapi({
    baseURL: `${STRAPI_URL}/api`,
    auth: jwt,
  })
}

/**
 * Get a Strapi client instance without authentication.
 * Use this for public endpoints that don't require auth.
 *
 * @returns Strapi client configured with baseURL only
 *
 * @example
 * ```typescript
 * const client = getPublicStrapiClient()
 * const events = client.collection('events')
 * const publicEvents = await events.find({ filters: { isPublished: true } })
 * ```
 */
export function getPublicStrapiClient(): StrapiClient {
  return strapi({
    baseURL: `${STRAPI_URL}/api`,
  })
}

/**
 * Re-export the StrapiClient type for use in other modules
 */
export type { StrapiClient }

// ============================================================================
// Safe Fetch Helpers using @strapi/client
// ============================================================================

/**
 * Options for strapiFetch
 */
export interface StrapiFetchOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  body?: unknown
  headers?: Record<string, string>
  cache?: RequestCache
  /** Skip authentication entirely (for public endpoints) */
  noAuth?: boolean
  /** Use auth if available, but don't fail if not authenticated */
  optionalAuth?: boolean
}

/**
 * Result type for strapiFetch
 */
export interface StrapiFetchResult<T> {
  ok: boolean
  status: number
  data?: T
  error?: string
}

/**
 * Build a safe path with validated parameters
 * Internal helper for strapiFetch
 */
function buildSafePath(pathTemplate: string, params: Record<string, string> = {}): string {
  // Validate all parameters first
  const validatedParams = validatePathSegments(params)

  // Replace placeholders with validated values
  let path = pathTemplate
  for (const [name, value] of Object.entries(validatedParams)) {
    path = path.replace(`:${name}`, encodeURIComponent(value))
  }

  // Ensure no unreplaced placeholders remain
  if (path.includes(":")) {
    const missingParams = path.match(/:[a-zA-Z_]+/g)
    throw new Error(`Missing required path parameters: ${missingParams?.join(", ")}`)
  }

  // Ensure path starts with /
  return path.startsWith("/") ? path : `/${path}`
}

/**
 * Get appropriate Strapi client based on auth options
 */
async function getClientForOptions(
  options: Pick<StrapiFetchOptions, "noAuth" | "optionalAuth">
): Promise<StrapiClient> {
  if (options.noAuth) {
    return getPublicStrapiClient()
  }
  if (options.optionalAuth) {
    const jwt = await getAuthCookie()
    if (jwt) {
      return strapi({
        baseURL: `${STRAPI_URL}/api`,
        auth: jwt,
      })
    }
    return getPublicStrapiClient()
  }
  return getStrapiClient()
}

/**
 * Safe fetch using @strapi/client with SSRF-protected path building.
 * Validates all path parameters before making the request.
 *
 * @param pathTemplate - Path template with :param placeholders (e.g., "/admin/events/:slug/edit")
 * @param params - Object mapping param names to values
 * @param options - Fetch options (method, body, headers, noAuth, optionalAuth)
 * @returns Promise with fetch result
 *
 * @example
 * ```typescript
 * // GET request
 * const result = await strapiFetch<EventData>("/admin/events/:slug/edit", { slug })
 *
 * // POST request with body
 * const result = await strapiFetch<EventData>("/admin/events/:slug/publish", { slug }, {
 *   method: "POST",
 *   body: { data: { ... } }
 * })
 *
 * // Public endpoint (no auth)
 * const result = await strapiFetch<EventData>("/events/:eventId/tickets", { eventId }, { noAuth: true })
 *
 * // Optional auth (use if available)
 * const result = await strapiFetch<OrderData>("/ticket-orders", {}, { optionalAuth: true, method: "POST", body: {...} })
 * ```
 */
export async function strapiFetch<T>(
  pathTemplate: string,
  params: Record<string, string> = {},
  options: StrapiFetchOptions = {}
): Promise<StrapiFetchResult<T>> {
  const path = buildSafePath(pathTemplate, params)
  const { method = "GET", body, headers = {}, cache, noAuth, optionalAuth } = options

  try {
    const client = await getClientForOptions({ noAuth, optionalAuth })

    const response = await client.fetch(path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      cache,
    })

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        error?: { message?: string }
      }
      return {
        ok: false,
        status: response.status,
        error: errorData?.error?.message || `Request failed (${response.status})`,
      }
    }

    const data = (await response.json()) as T
    return {
      ok: true,
      status: response.status,
      data,
    }
  } catch (error) {
    // Handle "Not authenticated" error for non-auth endpoints gracefully
    if (noAuth || optionalAuth) {
      // If auth fails and it's optional, return error result
      const errorMsg = error instanceof Error ? error.message : "Unknown error occurred"
      return {
        ok: false,
        status: 0,
        error: errorMsg,
      }
    }
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

/**
 * Safe fetch for FormData uploads.
 * Uses fetchWithTimeout directly (bypassing @strapi/client's 10s default timeout)
 * to support long-running uploads like CSV imports.
 * Does not set Content-Type header (let browser set it with boundary).
 *
 * @param pathTemplate - Path template with :param placeholders
 * @param params - Object mapping param names to values
 * @param formData - FormData to upload
 * @param timeout - Timeout in milliseconds (default 120000 = 2 minutes)
 * @returns Promise with fetch result
 */
export async function strapiFetchFormData<T>(
  pathTemplate: string,
  params: Record<string, string>,
  formData: FormData,
  timeout = 120000
): Promise<StrapiFetchResult<T>> {
  const path = buildSafePath(pathTemplate, params)
  const jwt = await getAuthCookie()
  if (!jwt) {
    return { ok: false, status: 0, error: "Not authenticated" }
  }

  const url = `${STRAPI_URL}/api${path}`

  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${jwt}` },
        body: formData,
        // Don't set Content-Type - browser will set it with boundary
      },
      timeout
    )

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        error?: { message?: string }
      }
      return {
        ok: false,
        status: response.status,
        error: errorData?.error?.message || `Upload failed (${response.status})`,
      }
    }

    const data = (await response.json()) as T
    return {
      ok: true,
      status: response.status,
      data,
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

/**
 * Safe fetch with query parameters using @strapi/client.
 *
 * @param pathTemplate - Path template with :param placeholders
 * @param params - Object mapping param names to values
 * @param queryParams - URLSearchParams or object for query string
 * @param options - Additional fetch options
 * @returns Promise with fetch result
 */
export async function strapiFetchWithQuery<T>(
  pathTemplate: string,
  params: Record<string, string>,
  queryParams: URLSearchParams | Record<string, string>,
  options: Omit<StrapiFetchOptions, "body"> = {}
): Promise<StrapiFetchResult<T>> {
  const { method = "GET", headers = {}, cache, noAuth, optionalAuth } = options
  const client = await getClientForOptions({ noAuth, optionalAuth })
  const basePath = buildSafePath(pathTemplate, params)

  const queryString =
    queryParams instanceof URLSearchParams
      ? queryParams.toString()
      : new URLSearchParams(queryParams).toString()

  const path = queryString ? `${basePath}?${queryString}` : basePath

  try {
    const response = await client.fetch(path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      cache,
    })

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        error?: { message?: string }
      }
      return {
        ok: false,
        status: response.status,
        error: errorData?.error?.message || `Request failed (${response.status})`,
      }
    }

    const data = (await response.json()) as T
    return {
      ok: true,
      status: response.status,
      data,
    }
  } catch (error) {
    if (noAuth || optionalAuth) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error occurred"
      return {
        ok: false,
        status: 0,
        error: errorMsg,
      }
    }
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}
