/**
 * HTML sanitization utilities for user-generated content
 *
 * Uses DOMPurify to sanitize HTML content and prevent XSS attacks.
 * This module provides server-side sanitization for all user-submitted HTML fields.
 */

import DOMPurify from "isomorphic-dompurify"

/**
 * Allowed HTML tags for bio/description fields
 * Matches CKEditor5 defaultHtml preset output
 */
const ALLOWED_TAGS = [
  // Text formatting
  "p",
  "br",
  "strong",
  "em",
  "u",
  "s",
  "sub",
  "sup",
  // Headings
  "h2",
  "h3",
  "h4",
  // Lists
  "ul",
  "ol",
  "li",
  // Links
  "a",
  // Blockquote
  "blockquote",
  // Code
  "code",
  "pre",
]

/**
 * Allowed HTML attributes
 */
const ALLOWED_ATTR = ["href", "target", "rel", "class"]

/**
 * Sanitize HTML content for rich text fields (bio, descriptions)
 *
 * @param html - Raw HTML content from user input
 * @returns Sanitized HTML string safe for storage and rendering
 */
export function sanitizeHtml(html: string | null | undefined): string | null {
  if (html === null || html === undefined) {
    return null
  }

  if (typeof html !== "string") {
    return null
  }

  // Trim whitespace
  const trimmed = html.trim()
  if (trimmed === "") {
    return null
  }

  // Sanitize with DOMPurify
  const sanitized = DOMPurify.sanitize(trimmed, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Force all links to open in new tab safely
    ADD_ATTR: ["target"],
    // Remove dangerous URI schemes
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    // Don't return empty string if content was all unsafe
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
  })

  // Post-process: ensure all external links have rel="noopener noreferrer"
  const withSafeLinks = sanitized.replace(
    /<a\s+([^>]*href=["'][^"']*["'][^>]*)>/gi,
    (_match, attrs) => {
      // Add target="_blank" if not present
      if (!attrs.includes("target=")) {
        attrs += ' target="_blank"'
      }
      // Add rel="noopener noreferrer" if not present
      if (!attrs.includes("rel=")) {
        attrs += ' rel="noopener noreferrer"'
      }
      return `<a ${attrs}>`
    }
  )

  // Return null if sanitization removed all content
  // Use loop to handle nested/reconstructed tags (e.g., "<scr<script>ipt>")
  let textContent = withSafeLinks
  let previousContent: string
  do {
    previousContent = textContent
    textContent = textContent.replace(/<[^>]*>/g, "")
  } while (textContent !== previousContent)
  textContent = textContent.trim()
  if (textContent === "") {
    return null
  }

  return withSafeLinks
}

/**
 * Sanitize plain text content (removes all HTML)
 *
 * @param text - Text that may contain HTML
 * @returns Plain text with all HTML stripped
 */
export function sanitizePlainText(text: string | null | undefined): string | null {
  if (text === null || text === undefined) {
    return null
  }

  if (typeof text !== "string") {
    return null
  }

  const trimmed = text.trim()
  if (trimmed === "") {
    return null
  }

  // Remove all HTML tags
  const stripped = DOMPurify.sanitize(trimmed, { ALLOWED_TAGS: [] })

  return stripped.trim() || null
}
