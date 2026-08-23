/**
 * Translation controller using Google Gemini directly.
 */

import { GoogleGenerativeAI } from "@google/generative-ai"

/**
 * Must list every locale in `packages/web/src/messages/`. A missing entry does
 * not fail loudly — the code below falls back to the bare code, so the prompt
 * became "translate from English to it", where "it" reads as the pronoun rather
 * than Italian. Keep this in step when a locale is added.
 */
export const LOCALE_NAMES: Record<string, string> = {
  en: "English",
  fr: "French",
  es: "Spanish",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
}

const DEFAULT_MODEL = "gemini-2.5-flash"
const GEMINI_TIMEOUT_MS = 60000

/**
 * Recognises Gemini's daily-quota rejection.
 *
 * The SDK surfaces it as a plain Error whose message carries the HTTP status
 * and the API's status name, so string matching is the only option. Matched
 * broadly on purpose: mistaking another 429 for a quota problem still tells the
 * editor something true (too many requests, wait), whereas missing a real quota
 * error puts them back to guessing at "Translation failed".
 */
export function isQuotaExhausted(message: string): boolean {
  return /429|RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(message)
}

async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Translation timed out")), GEMINI_TIMEOUT_MS)
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

export default {
  async translate(ctx) {
    try {
      const { text, sourceLocale, targetLocale, format = "plain" } = ctx.request.body

      if (!text || !sourceLocale || !targetLocale) {
        return ctx.badRequest("Missing required fields: text, sourceLocale, targetLocale")
      }

      const apiKey = process.env.GEMINI_API_KEY
      if (!apiKey) {
        strapi.log.error("[Translate] GEMINI_API_KEY is not configured")
        return ctx.internalServerError("Translation service is not configured")
      }

      const sourceName = LOCALE_NAMES[sourceLocale] || sourceLocale
      const targetName = LOCALE_NAMES[targetLocale] || targetLocale

      const formatInstruction =
        format === "html"
          ? "The text is HTML. Preserve all HTML tags, attributes, and structure exactly. Only translate the visible text content."
          : "Translate the plain text as-is."

      const client = new GoogleGenerativeAI(apiKey)
      const model = client.getGenerativeModel({ model: process.env.GEMINI_MODEL || DEFAULT_MODEL })

      const result = await withTimeout(
        model.generateContent({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Translate the following text from ${sourceName} to ${targetName}.

${formatInstruction}

Do not add any explanation or commentary. Output only the translated text.

Text to translate:
${text}`,
                },
              ],
            },
          ],
        })
      )

      const translation = result.response.text()

      return ctx.send({
        translation,
        sourceLocale,
        targetLocale,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)

      if (isQuotaExhausted(message)) {
        // Gemini's free tier resets daily, so this is worth telling the editor
        // apart from a genuine failure — they only need to come back tomorrow.
        strapi.log.warn(`[Translate] Gemini quota exhausted: ${message}`)
        ctx.status = 429
        ctx.body = {
          error: {
            status: 429,
            name: "QuotaExhaustedError",
            message: "Daily translation quota reached",
          },
        }
        return
      }

      strapi.log.error("Translation error:", message)
      return ctx.internalServerError("Translation failed")
    }
  },
}
