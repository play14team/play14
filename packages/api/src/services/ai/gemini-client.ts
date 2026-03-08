/**
 * Google Gemini AI client for LinkedIn post content generation
 * Uses @google/generative-ai SDK with gemini-2.5-flash default model
 */

import { GoogleGenerativeAI } from "@google/generative-ai"
import { createLogger } from "../observability/logger"
import {
  create7DayReminderPrompt,
  create30DayReminderPrompt,
  createAnnouncementPrompt,
} from "./prompts"
import type { EventContext, LinkedInPostContent } from "./types"

const log = createLogger("[Gemini]")

const DEFAULT_MODEL = "gemini-2.5-flash"
const GEMINI_TIMEOUT_MS = 60000

const SYSTEM_CONTEXT = `You are a content writer for #play14, a global community of agile game players and facilitators.
The community organizes events called "unconferences" where participants play serious games to learn agile practices.

Writing guidelines:
- Use a friendly, inclusive, and enthusiastic tone
- Keep content concise and engaging
- Focus on community, learning, and fun
- Use sentence case (only capitalize first word of sentences)
- Avoid corporate jargon - be authentic and human
- The audience includes agile coaches, scrum masters, facilitators, and anyone interested in serious games`

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = GEMINI_TIMEOUT_MS
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("AI generation timed out. Please try again."))
    }, timeoutMs)
  })

  try {
    const result = await Promise.race([promise, timeoutPromise])
    clearTimeout(timeoutId!)
    return result
  } catch (error) {
    clearTimeout(timeoutId!)
    throw error
  }
}

export class GeminiClient {
  private client: GoogleGenerativeAI
  private modelName: string

  constructor(apiKey: string, model?: string) {
    if (!apiKey) {
      throw new Error("Gemini API key is required")
    }
    this.client = new GoogleGenerativeAI(apiKey)
    this.modelName = model || process.env.GEMINI_MODEL || DEFAULT_MODEL
  }

  /**
   * Generate content using Gemini SDK
   */
  private async generateContent(prompt: string): Promise<string> {
    log.info("Generating content with Gemini", { model: this.modelName })

    const model = this.client.getGenerativeModel({ model: this.modelName })

    const result = await withTimeout(
      model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: `${SYSTEM_CONTEXT}\n\n${prompt}` }],
          },
        ],
      })
    )

    const response = result.response
    const text = response.text()

    if (!text) {
      throw new Error("No content returned from Gemini API")
    }

    log.info("Gemini content generated successfully")
    return text
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

  private fallbackAnnouncement(event: EventContext): LinkedInPostContent {
    const startDate = new Date(event.start).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })

    const text = `Exciting news! ${event.name} is coming to ${event.location.city}, ${event.location.country} on ${startDate}!

Join us for an amazing gathering of agile practitioners and game facilitators. Learn, play, and connect with the #play14 community.

Register now: ${process.env.FRONTEND_URL}/events/${event.slug}

#play14 #agile #games`

    return {
      text,
      imageUrl: event.imageUrl,
      link: `${process.env.FRONTEND_URL}/events/${event.slug}`,
      hashtags: ["#play14", "#agile", "#games"],
    }
  }

  private fallbackReminder(event: EventContext, daysUntil: number): LinkedInPostContent {
    const urgency = daysUntil === 7 ? "Only 1 week left" : `${daysUntil} days to go`

    const text = `${urgency}! Don't miss ${event.name} in ${event.location.city}!

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

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required")
  }

  return new GeminiClient(apiKey)
}
