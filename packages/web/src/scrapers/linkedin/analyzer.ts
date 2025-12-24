import type { LinkedInPost } from "./types"

/**
 * Testimonial Content Analyzer
 * Extracts and cleans testimonial content from LinkedIn posts
 */
export class TestimonialAnalyzer {
  /**
   * Extract the most relevant testimonial content from a LinkedIn post
   */
  static extractTestimonial(post: LinkedInPost): string {
    let content = post.text || ""

    // Remove common LinkedIn formatting
    content = this.cleanContent(content)

    // If content is too short, it's probably not a good testimonial
    if (content.length < 50) {
      return ""
    }

    // If content is too long, try to extract the most relevant part
    if (content.length > 500) {
      content = this.extractRelevantPortion(content)
    }

    return content
  }

  /**
   * Clean LinkedIn post content
   */
  private static cleanContent(text: string): string {
    return (
      text
        // Remove excessive whitespace
        .replace(/\s+/g, " ")
        // Remove "See more" and similar prompts
        .replace(/\.\.\.\s*(see more|read more)/gi, "")
        // Remove LinkedIn mentions format (keep the name only)
        .replace(/@\[([^\]]+)\]\([^)]+\)/g, "$1")
        // Trim
        .trim()
    )
  }

  /**
   * Extract the most relevant portion from long posts
   * Prioritizes content mentioning #play14 or key terms
   */
  private static extractRelevantPortion(text: string): string {
    // Split into sentences
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]

    // Keywords that indicate valuable testimonial content
    const keywords = [
      "play14",
      "learned",
      "experience",
      "amazing",
      "great",
      "wonderful",
      "inspired",
      "valuable",
      "insightful",
      "fun",
      "engaging",
      "transformative",
      "recommend",
      "community",
      "networking",
      "games",
      "agile",
    ]

    // Score each sentence based on keyword presence
    const scoredSentences = sentences.map((sentence) => {
      const lowerSentence = sentence.toLowerCase()
      const score = keywords.reduce((acc, keyword) => {
        return acc + (lowerSentence.includes(keyword) ? 1 : 0)
      }, 0)
      return { sentence, score }
    })

    // Sort by score and take top sentences until we hit ~400 chars
    const relevantSentences = scoredSentences
      .sort((a, b) => b.score - a.score)
      .reduce((acc, { sentence }) => {
        if (acc.length + sentence.length <= 400) {
          acc.push(sentence)
        }
        return acc
      }, [] as string[])

    return relevantSentences.join(" ").trim()
  }

  /**
   * Check if post content is suitable for a testimonial
   */
  static isValidTestimonial(post: LinkedInPost): boolean {
    const text = post.text?.toLowerCase() || ""

    // Must mention #play14
    if (!text.includes("play14")) {
      return false
    }

    // Should have some substance (at least 50 chars)
    if (text.length < 50) {
      return false
    }

    // Filter out promotional/spam content
    const spamIndicators = [
      "buy now",
      "click here",
      "limited offer",
      "discount",
      "sale",
    ]

    if (spamIndicators.some((indicator) => text.includes(indicator))) {
      return false
    }

    return true
  }

  /**
   * Generate a slug from author name
   */
  static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  }

  /**
   * Extract first name and last name from full name
   */
  static parseAuthorName(fullName: string): {
    firstName: string
    lastName: string
  } {
    const parts = fullName.trim().split(/\s+/)
    return {
      firstName: parts[0] || fullName,
      lastName: parts.slice(1).join(" ") || "",
    }
  }
}
