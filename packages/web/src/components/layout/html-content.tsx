import parse from "html-react-parser"
import DOMPurify from "isomorphic-dompurify"

/**
 * Allowed HTML tags for user-generated content
 * Matches CKEditor5/Tiptap output
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

// Strip inline styles from HTML to allow theme colors to apply
function stripInlineStyles(html: string): string {
  return html.replace(/\s*style="[^"]*"/gi, "")
}

/**
 * Sanitize HTML content to prevent XSS attacks
 */
function sanitizeHtml(html: string): string {
  // DOMPurify works both on client and server (via jsdom in SSR)
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Remove dangerous URI schemes
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  })

  // Post-process: ensure all links have safe attributes
  return sanitized.replace(/<a\s+([^>]*href=["'][^"']*["'][^>]*)>/gi, (_match, attrs) => {
    // Add target="_blank" if not present
    if (!attrs.includes("target=")) {
      attrs += ' target="_blank"'
    }
    // Add rel="noopener noreferrer" if not present
    if (!attrs.includes("rel=")) {
      attrs += ' rel="noopener noreferrer"'
    }
    return `<a ${attrs}>`
  })
}

const HtmlContent = ({
  children,
  preserveStyles = false,
}: {
  children: string | undefined
  preserveStyles?: boolean
}) => {
  if (!children) return <></>

  // Sanitize first to prevent XSS, then optionally strip styles
  const sanitized = sanitizeHtml(children)
  const content = preserveStyles ? sanitized : stripInlineStyles(sanitized)
  return <>{parse(content)}</>
}

export default HtmlContent
