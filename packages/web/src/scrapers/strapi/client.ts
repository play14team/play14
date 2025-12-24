import type {
  StrapiPlayerInput,
  StrapiTestimonialInput,
  StrapiCreateResponse,
  StrapiPlayer,
  StrapiTestimonial,
} from "./types"

/**
 * Strapi Write API Client
 * Handles creating and updating records in Strapi
 */
export class StrapiWriteClient {
  private baseUrl: string
  private apiToken: string

  constructor() {
    this.baseUrl =
      (process.env.STRAPI_API_URL || "").replace(/\/$/, "") + "/api"
    this.apiToken = process.env.STRAPI_API_SECRET || ""

    if (!this.baseUrl || !this.apiToken) {
      throw new Error(
        "Missing required environment variables: STRAPI_API_URL and STRAPI_API_SECRET",
      )
    }
  }

  /**
   * Create a new player record
   */
  async createPlayer(
    data: StrapiPlayerInput,
  ): Promise<StrapiCreateResponse<StrapiPlayer>> {
    const response = await this.post<StrapiPlayer>("players", { data })
    return response
  }

  /**
   * Find player by slug
   */
  async findPlayerBySlug(slug: string): Promise<StrapiPlayer | null> {
    try {
      const response = await this.get<StrapiPlayer[]>(
        `players?filters[slug][$eq]=${slug}`,
      )
      return response.data?.[0] || null
    } catch (error) {
      console.error(`Error finding player by slug ${slug}:`, error)
      return null
    }
  }

  /**
   * Find player by social network URL (LinkedIn)
   */
  async findPlayerByLinkedIn(
    linkedInUrl: string,
  ): Promise<StrapiPlayer | null> {
    try {
      // Normalize LinkedIn URL for comparison
      const normalizedUrl = this.normalizeLinkedInUrl(linkedInUrl)

      const response = await this.get<StrapiPlayer[]>(
        `players?populate=socialNetworks&filters[socialNetworks][url][$contains]=${encodeURIComponent(normalizedUrl)}`,
      )
      return response.data?.[0] || null
    } catch (error) {
      console.error("Error finding player by LinkedIn URL:", error)
      return null
    }
  }

  /**
   * Find player by name (fuzzy match)
   */
  async findPlayerByName(name: string): Promise<StrapiPlayer | null> {
    try {
      const response = await this.get<StrapiPlayer[]>(
        `players?filters[name][$eqi]=${encodeURIComponent(name)}`,
      )
      return response.data?.[0] || null
    } catch (error) {
      console.error(`Error finding player by name ${name}:`, error)
      return null
    }
  }

  /**
   * Update player record
   */
  async updatePlayer(
    documentId: string,
    data: Partial<StrapiPlayerInput>,
  ): Promise<StrapiCreateResponse<StrapiPlayer>> {
    const response = await this.put<StrapiPlayer>(`players/${documentId}`, {
      data,
    })
    return response
  }

  /**
   * Create a new testimonial record
   */
  async createTestimonial(
    data: StrapiTestimonialInput,
  ): Promise<StrapiCreateResponse<StrapiTestimonial>> {
    const response = await this.post<StrapiTestimonial>("testimonials", {
      data,
    })
    return response
  }

  /**
   * Find testimonial by URL (to avoid duplicates)
   */
  async findTestimonialByUrl(url: string): Promise<StrapiTestimonial | null> {
    try {
      const response = await this.get<StrapiTestimonial[]>(
        `testimonials?filters[url][$eq]=${encodeURIComponent(url)}`,
      )
      return response.data?.[0] || null
    } catch (error) {
      console.error("Error finding testimonial by URL:", error)
      return null
    }
  }

  /**
   * Generic GET request
   */
  private async get<T>(endpoint: string): Promise<StrapiCreateResponse<T>> {
    const url = `${this.baseUrl}/${endpoint}`
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`GET ${endpoint} failed (${response.status}): ${error}`)
    }

    return (await response.json()) as StrapiCreateResponse<T>
  }

  /**
   * Generic POST request
   */
  private async post<T>(
    endpoint: string,
    body: any,
  ): Promise<StrapiCreateResponse<T>> {
    const url = `${this.baseUrl}/${endpoint}`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`POST ${endpoint} failed (${response.status}): ${error}`)
    }

    return (await response.json()) as StrapiCreateResponse<T>
  }

  /**
   * Generic PUT request
   */
  private async put<T>(
    endpoint: string,
    body: any,
  ): Promise<StrapiCreateResponse<T>> {
    const url = `${this.baseUrl}/${endpoint}`
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`PUT ${endpoint} failed (${response.status}): ${error}`)
    }

    return (await response.json()) as StrapiCreateResponse<T>
  }

  /**
   * Normalize LinkedIn URL for comparison
   */
  private normalizeLinkedInUrl(url: string): string {
    // Extract just the profile identifier
    const match = url.match(/linkedin\.com\/in\/([^/?]+)/)
    return match ? match[1] : url
  }
}
