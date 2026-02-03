/**
 * Gemini AI Content Generation Service
 *
 * Uses Google's Generative AI (Gemini) to help create and improve newsletter content.
 * Free tier: 15 requests/minute, 1M tokens/day - sufficient for newsletter writing.
 */

import { GoogleGenerativeAI } from "@google/generative-ai"

const SYSTEM_CONTEXT = `You are a content writer for #play14, a global community of agile game players and facilitators.
The community organizes events called "unconferences" where participants play serious games to learn agile practices.

Writing guidelines:
- Use a friendly, inclusive, and enthusiastic tone
- Keep content concise and engaging
- Focus on community, learning, and fun
- Use sentence case (only capitalize first word of sentences)
- Avoid corporate jargon - be authentic and human
- The audience includes agile coaches, scrum masters, facilitators, and anyone interested in serious games`

// Default to gemini-2.5-flash as it has the best price-performance ratio
// Note: gemini-2.0-flash is deprecated and shutting down March 31, 2026
const DEFAULT_MODEL = "gemini-2.5-flash"

// Valid Gemini model names for reference
const VALID_MODELS = [
  "gemini-3-pro-preview",
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
  "gemini-2.0-flash", // deprecated
]

function getGeminiClient(): GoogleGenerativeAI | null {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    strapi.log.error("[GeminiContent] GEMINI_API_KEY is not configured")
    return null
  }

  return new GoogleGenerativeAI(apiKey)
}

// Timeout for Gemini API calls (60 seconds)
const GEMINI_TIMEOUT_MS = 60000

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = GEMINI_TIMEOUT_MS
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("AI generation timed out. Please try a simpler prompt."))
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

function getModelName(): string {
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL

  // Log warning if model doesn't match known valid models
  if (!VALID_MODELS.includes(model)) {
    strapi.log.warn(
      `[GeminiContent] Model "${model}" may not be valid. Known models: ${VALID_MODELS.join(", ")}`
    )
  }

  strapi.log.info(`[GeminiContent] Using model: ${model}`)
  return model
}

/**
 * Generate a newsletter draft based on a prompt
 */
export async function generateDraft(prompt: string): Promise<{
  success: boolean
  content?: string
  error?: string
}> {
  const client = getGeminiClient()

  if (!client) {
    return { success: false, error: "AI service is not configured" }
  }

  try {
    const model = client.getGenerativeModel({ model: getModelName() })

    const result = await withTimeout(
      model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${SYSTEM_CONTEXT}

Write a newsletter for the #play14 community based on this prompt:

${prompt}

Format the newsletter with:
- A compelling opening paragraph
- The main content with clear sections if needed
- A call to action or closing thought

Output the newsletter content in HTML format suitable for email (use <p>, <h2>, <h3>, <ul>, <li>, <strong>, <em> tags as needed). Do not include <html>, <head>, or <body> tags - just the content.`,
              },
            ],
          },
        ],
      })
    )

    const response = result.response
    const text = response.text()

    strapi.log.info("[GeminiContent] Draft generated successfully")
    return { success: true, content: text }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    strapi.log.error(`[GeminiContent] Error generating draft: ${errorMessage}`)

    // Check if it's a model not found error
    if (errorMessage.includes("not found") || errorMessage.includes("404")) {
      const currentModel = process.env.GEMINI_MODEL || DEFAULT_MODEL
      return {
        success: false,
        error: `Model "${currentModel}" not found. Valid models: ${VALID_MODELS.slice(0, 3).join(", ")}`,
      }
    }

    // Check for timeout
    if (errorMessage.includes("timed out")) {
      return { success: false, error: errorMessage }
    }

    return { success: false, error: "Failed to generate content" }
  }
}

/**
 * Improve existing content based on instructions
 */
export async function improveContent(
  content: string,
  instructions: string
): Promise<{
  success: boolean
  content?: string
  error?: string
}> {
  const client = getGeminiClient()

  if (!client) {
    return { success: false, error: "AI service is not configured" }
  }

  try {
    const model = client.getGenerativeModel({ model: getModelName() })

    const result = await withTimeout(
      model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${SYSTEM_CONTEXT}

Here is the current newsletter content:

${content}

Please improve this content based on these instructions:
${instructions}

Keep the same HTML formatting style. Output only the improved content, no explanations.`,
              },
            ],
          },
        ],
      })
    )

    const response = result.response
    const text = response.text()

    strapi.log.info("[GeminiContent] Content improved successfully")
    return { success: true, content: text }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    strapi.log.error(`[GeminiContent] Error improving content: ${errorMessage}`)

    if (errorMessage.includes("not found") || errorMessage.includes("404")) {
      const currentModel = process.env.GEMINI_MODEL || DEFAULT_MODEL
      return {
        success: false,
        error: `Model "${currentModel}" not found. Valid models: ${VALID_MODELS.slice(0, 3).join(", ")}`,
      }
    }

    if (errorMessage.includes("timed out")) {
      return { success: false, error: errorMessage }
    }

    return { success: false, error: "Failed to improve content" }
  }
}

/**
 * Generate subject line suggestions based on content
 */
export async function suggestSubjects(content: string): Promise<{
  success: boolean
  subjects?: string[]
  error?: string
}> {
  const client = getGeminiClient()

  if (!client) {
    return { success: false, error: "AI service is not configured" }
  }

  try {
    const model = client.getGenerativeModel({ model: getModelName() })

    const result = await withTimeout(
      model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${SYSTEM_CONTEXT}

Based on this newsletter content, suggest 5 compelling email subject lines.

Newsletter content:
${content}

Requirements for subject lines:
- Keep under 60 characters
- Be engaging and specific
- Use sentence case
- Avoid spam trigger words
- Make the reader want to open the email

Output exactly 5 subject lines, one per line, without numbering or bullet points.`,
              },
            ],
          },
        ],
      })
    )

    const response = result.response
    const text = response.text()
    const subjects = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && line.length <= 100)
      .slice(0, 5)

    strapi.log.info("[GeminiContent] Subject lines generated successfully")
    return { success: true, subjects }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    strapi.log.error(`[GeminiContent] Error generating subjects: ${errorMessage}`)

    if (errorMessage.includes("not found") || errorMessage.includes("404")) {
      const currentModel = process.env.GEMINI_MODEL || DEFAULT_MODEL
      return {
        success: false,
        error: `Model "${currentModel}" not found. Valid models: ${VALID_MODELS.slice(0, 3).join(", ")}`,
      }
    }

    if (errorMessage.includes("timed out")) {
      return { success: false, error: errorMessage }
    }

    return { success: false, error: "Failed to generate subject lines" }
  }
}
