const { GoogleGenerativeAI } = require("@google/generative-ai")

/**
 * Convert locale code to full language name
 */
function getLanguageName(locale) {
  const languageMap = {
    en: "English",
    fr: "French",
    es: "Spanish",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    nl: "Dutch",
    pl: "Polish",
    ru: "Russian",
    ja: "Japanese",
    zh: "Chinese",
    ko: "Korean",
    ar: "Arabic",
  }

  return languageMap[locale] || locale
}

module.exports = {
  provider: "gemini",
  name: "Gemini AI Translation",

  /**
   * @param {Object} providerOptions
   * @param {string} providerOptions.apiKey - Gemini API key
   * @param {string} [providerOptions.model] - Gemini model name
   */
  init(providerOptions) {
    const { apiKey = "", model = "gemini-2.0-flash-exp" } = providerOptions || {}
    const genAI = new GoogleGenerativeAI(apiKey)
    const selectedModel = model

    return {
      /**
       * Translate text using Gemini AI
       * @param {Object} options
       * @param {string} options.text - Text to translate
       * @param {string} options.sourceLocale - Source locale code
       * @param {string} options.targetLocale - Target locale code
       * @param {string} options.format - Format type (plain, html, markdown)
       */
      async translate({ text, sourceLocale, targetLocale, format }) {
        if (!text || text.trim().length === 0) {
          return [{ text: "" }]
        }

        try {
          const geminiModel = genAI.getGenerativeModel({ model: selectedModel })

          // Build context-aware prompt based on format
          const formatInstructions =
            format === "html"
              ? "Preserve all HTML tags, attributes, and structure exactly as they are. Only translate the text content between tags."
              : format === "markdown"
                ? "Preserve all markdown syntax (headers, links, bold, italic, etc.). Only translate the text content."
                : "Translate the plain text naturally."

          const prompt = `You are a professional translator. Translate the following ${format} text from ${getLanguageName(sourceLocale)} to ${getLanguageName(targetLocale)}.

IMPORTANT RULES:
1. ${formatInstructions}
2. Maintain the exact same tone and style as the original
3. Keep all special characters, numbers, and formatting
4. Do not add any explanations or notes
5. Return ONLY the translated text, nothing else

Text to translate:
${text}

Translation:`

          const result = await geminiModel.generateContent(prompt)
          const translation = result.response.text().trim()

          return [{ text: translation }]
        } catch (error) {
          console.error("[Gemini Translation] Error:", error)
          throw new Error(
            `Translation failed: ${error instanceof Error ? error.message : "Unknown error"}`
          )
        }
      },

      /**
       * Get usage information (optional)
       */
      async usage() {
        return {
          count: 0,
          limit: 999999,
        }
      },
    }
  },
}
