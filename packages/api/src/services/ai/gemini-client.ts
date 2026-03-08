/**
 * Google Gemini AI client for content generation
 * Uses Gemini 1.5 Flash model (free tier: 15 RPM, 1M tokens/day)
 */

import { createLogger } from "../observability/logger"
import {
  create7DayReminderPrompt,
  create30DayReminderPrompt,
  createAnnouncementPrompt,
} from "./prompts"
import type { EventContext, GeminiRequest, GeminiResponse, LinkedInPostContent } from "./types"

const log = createLogger("[Gemini]")

export class GeminiClient {
  private apiKey: string
  private baseUrl = "https://generativelanguage.googleapis.com/v1beta"
  private model: string

  constructor(apiKey: string, model = "gemini-1.5-flash") {
    if (!apiKey) {
      throw new Error("Gemini API key is required")
    }
    this.apiKey = apiKey
    this.model = model
  }

  /**
   * Generate content using Gemini API
   */
  private async generateContent(prompt: string): Promise<string> {
    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`

    const requestBody: GeminiRequest = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    }

    log.info("Generating content with Gemini", { model: this.model })

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorText = await response.text()
        log.error("Gemini API error", { status: response.status, error: errorText })
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
      }

      const data = (await response.json()) as GeminiResponse

      if (!data.candidates || data.candidates.length === 0) {
        throw new Error("No candidates returned from Gemini API")
      }

      const generatedText = data.candidates[0].content.parts[0].text

      if (data.usageMetadata) {
        log.info("Gemini API usage", {
          promptTokens: data.usageMetadata.promptTokenCount,
          completionTokens: data.usageMetadata.candidatesTokenCount,
          totalTokens: data.usageMetadata.totalTokenCount,
        })
      }

      return generatedText
    } catch (error) {
      log.error("Failed to generate content with Gemini", {}, error as Error)
      throw error
    }
  }

  /**
   * Extract hashtags from text
   */
  private extractHashtags(text: string): string[] {
    const hashtagRegex = /#\w+/g
    const matches = text.match(hashtagRegex)
    return matches ? [...new Set(matches)] : []
  }

  /**
   * Generate event announcement post
   */
  async generateEventAnnouncement(event: EventContext): Promise<LinkedInPostContent> {
    const prompt = createAnnouncementPrompt(event)

    try {
      const text = await this.generateContent(prompt)
      const hashtags = this.extractHashtags(text)

      return {
        text: text.trim(),
        imageUrl: event.imageUrl,
        link: `${process.env.FRONTEND_URL}/events/${event.slug}`,
        hashtags: hashtags.length > 0 ? hashtags : ["#play14", "#agile", "#games"],
      }
    } catch (error) {
      log.error("Failed to generate event announcement", { eventSlug: event.slug }, error as Error)
      // Fallback to simple template
      return this.fallbackAnnouncement(event)
    }
  }

  /**
   * Generate 30-day reminder post
   */
  async generateReminder30Days(event: EventContext): Promise<LinkedInPostContent> {
    const prompt = create30DayReminderPrompt(event)

    try {
      const text = await this.generateContent(prompt)
      const hashtags = this.extractHashtags(text)

      return {
        text: text.trim(),
        imageUrl: event.imageUrl,
        link: `${process.env.FRONTEND_URL}/events/${event.slug}`,
        hashtags: hashtags.length > 0 ? hashtags : ["#play14", "#agile"],
      }
    } catch (error) {
      log.error("Failed to generate 30-day reminder", { eventSlug: event.slug }, error as Error)
      return this.fallbackReminder(event, 30)
    }
  }

  /**
   * Generate 7-day reminder post
   */
  async generateReminder7Days(event: EventContext): Promise<LinkedInPostContent> {
    const prompt = create7DayReminderPrompt(event)

    try {
      const text = await this.generateContent(prompt)
      const hashtags = this.extractHashtags(text)

      return {
        text: text.trim(),
        imageUrl: event.imageUrl,
        link: `${process.env.FRONTEND_URL}/events/${event.slug}`,
        hashtags: hashtags.length > 0 ? hashtags : ["#play14", "#agile"],
      }
    } catch (error) {
      log.error("Failed to generate 7-day reminder", { eventSlug: event.slug }, error as Error)
      return this.fallbackReminder(event, 7)
    }
  }

  /**
   * Fallback announcement template (if AI fails)
   */
  private fallbackAnnouncement(event: EventContext): LinkedInPostContent {
    const startDate = new Date(event.start).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })

    const text = `📢 Exciting news! ${event.name} is coming to ${event.location.city}, ${event.location.country} on ${startDate}!

Join us for an amazing gathering of agile practitioners and game facilitators. Learn, play, and connect with the #play14 community.

Register now: ${process.env.FRONTEND_URL}/events/${event.slug}

#play14 #agile #games #${event.location.city.toLowerCase().replace(/\s+/g, "")}`

    return {
      text,
      imageUrl: event.imageUrl,
      link: `${process.env.FRONTEND_URL}/events/${event.slug}`,
      hashtags: ["#play14", "#agile", "#games"],
    }
  }

  /**
   * Fallback reminder template (if AI fails)
   */
  private fallbackReminder(event: EventContext, daysUntil: number): LinkedInPostContent {
    const urgency = daysUntil === 7 ? "Only 1 week left" : `${daysUntil} days to go`
    const emoji = daysUntil === 7 ? "⏰" : "📅"

    const text = `${emoji} ${urgency}! Don't miss ${event.name} in ${event.location.city}!

${daysUntil === 7 ? "Last chance to register!" : "Early bird registration available!"}

Learn more: ${process.env.FRONTEND_URL}/events/${event.slug}

#play14 #agile`

    return {
      text,
      imageUrl: event.imageUrl,
      link: `${process.env.FRONTEND_URL}/events/${event.slug}`,
      hashtags: ["#play14", "#agile"],
    }
  }
}

/**
 * Create a Gemini client instance
 */
export function createGeminiClient(): GeminiClient {
  const apiKey = process.env.GEMINI_API_KEY
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash"

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required")
  }

  return new GeminiClient(apiKey, model)
}
