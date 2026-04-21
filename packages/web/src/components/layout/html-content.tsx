import sanitizeHtml, { type IOptions } from "sanitize-html"

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "u",
  "s",
  "sub",
  "sup",
  "h1",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "a",
  "blockquote",
  "code",
  "pre",
]

const LINK_ATTRS = ["href", "target", "rel", "class"]

function buildAllowedAttributes(preserveStyles: boolean): IOptions["allowedAttributes"] {
  const styleAttrs = preserveStyles ? ["style"] : []
  const attrs: Record<string, string[]> = {
    a: [...LINK_ATTRS, ...styleAttrs],
  }
  for (const tag of ALLOWED_TAGS) {
    if (tag === "a") continue
    attrs[tag] = ["class", ...styleAttrs]
  }
  return attrs
}

// Transform all-caps text to sentence case in HTML
function normalizeAllCapsText(html: string): string {
  // Match text content inside tags (not tag names or attributes)
  return html.replace(/>([^<]+)</g, (match, text) => {
    // Only process if text has letters and is all-caps
    if (!/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(text)) return match
    if (/[a-zà-öø-ÿ]/.test(text)) return match // Has lowercase, skip

    const letters = text.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, "")
    if (letters.length < 3) return match // Too short, skip

    const upper = letters.replace(/[^A-ZÀ-ÖØ-Þ]/g, "")
    if (upper.length / letters.length <= 0.8) return match // Not mostly caps, skip

    // Transform to sentence case
    const lower = text.toLocaleLowerCase()
    const normalized = lower.replace(/(^\s*[a-zà-öø-ÿ])|([.!?]\s+[a-zà-öø-ÿ])/g, (m: string) =>
      m.toLocaleUpperCase()
    )

    return `>${normalized}<`
  })
}

function sanitize(html: string, preserveStyles: boolean): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: buildAllowedAttributes(preserveStyles),
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesAppliedToAttributes: ["href"],
    allowProtocolRelative: true,
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
    },
  })
}

const HtmlContent = ({
  children,
  preserveStyles = false,
}: {
  children: string | undefined
  preserveStyles?: boolean
}) => {
  if (!children) return null

  const sanitized = sanitize(children, preserveStyles)
  const content = normalizeAllCapsText(sanitized)

  // content is sanitized by sanitize-html above. suppressHydrationWarning
  // guards against minor whitespace/attribute-ordering drift between the
  // server-rendered HTML string and the client's parsed DOM.
  return <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: content }} />
}

export default HtmlContent
