import { describe, expect, it } from "vitest"
import { sanitizeHtml, sanitizePlainText } from "./sanitize"

describe("sanitize utilities", () => {
  describe("sanitizeHtml", () => {
    it("returns null for null input", () => {
      expect(sanitizeHtml(null)).toBeNull()
    })

    it("returns null for undefined input", () => {
      expect(sanitizeHtml(undefined)).toBeNull()
    })

    it("returns null for empty string", () => {
      expect(sanitizeHtml("")).toBeNull()
      expect(sanitizeHtml("   ")).toBeNull()
    })

    it("returns null for non-string input", () => {
      expect(sanitizeHtml(123 as any)).toBeNull()
      expect(sanitizeHtml({} as any)).toBeNull()
    })

    it("preserves allowed HTML tags", () => {
      const input = "<p>Hello <strong>world</strong></p>"
      expect(sanitizeHtml(input)).toBe("<p>Hello <strong>world</strong></p>")
    })

    it("preserves text formatting tags", () => {
      const input = "<p><em>italic</em> <u>underline</u> <s>strikethrough</s></p>"
      expect(sanitizeHtml(input)).toBe(
        "<p><em>italic</em> <u>underline</u> <s>strikethrough</s></p>"
      )
    })

    it("preserves headings", () => {
      const input = "<h2>Title</h2><h3>Subtitle</h3><h4>Section</h4>"
      expect(sanitizeHtml(input)).toBe("<h2>Title</h2><h3>Subtitle</h3><h4>Section</h4>")
    })

    it("preserves lists", () => {
      const input = "<ul><li>Item 1</li><li>Item 2</li></ul>"
      expect(sanitizeHtml(input)).toBe("<ul><li>Item 1</li><li>Item 2</li></ul>")
    })

    it("preserves links with href", () => {
      const input = '<a href="https://example.com">Link</a>'
      const result = sanitizeHtml(input)
      expect(result).toContain('href="https://example.com"')
      expect(result).toContain("Link")
    })

    it("adds target=_blank and rel=noopener noreferrer to links", () => {
      const input = '<a href="https://example.com">Link</a>'
      const result = sanitizeHtml(input)
      expect(result).toContain('target="_blank"')
      expect(result).toContain('rel="noopener noreferrer"')
    })

    it("removes script tags", () => {
      const input = '<p>Hello</p><script>alert("xss")</script>'
      expect(sanitizeHtml(input)).toBe("<p>Hello</p>")
    })

    it("removes onclick attributes", () => {
      const input = '<p onclick="alert(\'xss\')">Click me</p>'
      expect(sanitizeHtml(input)).toBe("<p>Click me</p>")
    })

    it("removes javascript: URLs", () => {
      const input = '<a href="javascript:alert(\'xss\')">Click</a>'
      const result = sanitizeHtml(input)
      expect(result).not.toContain("javascript:")
    })

    it("removes iframe tags", () => {
      const input = '<p>Text</p><iframe src="https://evil.com"></iframe>'
      expect(sanitizeHtml(input)).toBe("<p>Text</p>")
    })

    it("removes img tags with onerror", () => {
      const input = '<img src="x" onerror="alert(\'xss\')">'
      // img is not in allowed tags, so content is stripped and returns null
      expect(sanitizeHtml(input)).toBeNull()
    })

    it("removes style tags", () => {
      const input = "<p>Hello</p><style>body{display:none}</style>"
      expect(sanitizeHtml(input)).toBe("<p>Hello</p>")
    })

    it("preserves blockquote", () => {
      const input = "<blockquote>A wise quote</blockquote>"
      expect(sanitizeHtml(input)).toBe("<blockquote>A wise quote</blockquote>")
    })

    it("preserves code blocks", () => {
      const input = "<pre><code>const x = 1;</code></pre>"
      expect(sanitizeHtml(input)).toBe("<pre><code>const x = 1;</code></pre>")
    })

    it("returns null when all content is stripped", () => {
      const input = '<script>alert("xss")</script>'
      expect(sanitizeHtml(input)).toBeNull()
    })
  })

  describe("sanitizePlainText", () => {
    it("returns null for null input", () => {
      expect(sanitizePlainText(null)).toBeNull()
    })

    it("returns null for undefined input", () => {
      expect(sanitizePlainText(undefined)).toBeNull()
    })

    it("returns null for empty string", () => {
      expect(sanitizePlainText("")).toBeNull()
      expect(sanitizePlainText("   ")).toBeNull()
    })

    it("returns null for non-string input", () => {
      expect(sanitizePlainText(123 as any)).toBeNull()
    })

    it("strips all HTML tags", () => {
      const input = "<p>Hello <strong>world</strong></p>"
      expect(sanitizePlainText(input)).toBe("Hello world")
    })

    it("strips script tags and their content", () => {
      const input = 'Text<script>alert("xss")</script>More'
      expect(sanitizePlainText(input)).toBe("TextMore")
    })

    it("preserves plain text", () => {
      const input = "Just plain text"
      expect(sanitizePlainText(input)).toBe("Just plain text")
    })

    it("trims whitespace", () => {
      const input = "  Hello world  "
      expect(sanitizePlainText(input)).toBe("Hello world")
    })
  })
})
