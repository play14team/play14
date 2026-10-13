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
  "img",
]

const LINK_ATTRS = ["href", "target", "rel", "class"]
const IMG_ATTRS = ["src", "alt", "title", "width", "height", "loading", "decoding", "class"]

// Only absolute https images render. Relative or templated sources such as
// the legacy `{{site.url}}/images/...` paths would show as broken images.
// The host is not checked here: the CSP `img-src` in next.config.mjs is the
// host gate (Cellar/CDN, Mapbox, YouTube), so other hosts are blocked there.
const isHttpsImage = (src: string | undefined) => /^https:\/\//i.test(src ?? "")

// Pixel dimensions only; anything else (percentages, junk) is dropped.
const isPixelSize = (value: string | undefined) => /^\d+$/.test(value ?? "")

function imgAttributes(attribs: sanitizeHtml.Attributes): sanitizeHtml.Attributes {
  const { width, height, ...rest } = attribs
  return {
    ...rest,
    ...(isPixelSize(width) ? { width } : {}),
    ...(isPixelSize(height) ? { height } : {}),
    // A missing alt marks the image decorative instead of announcing its URL.
    alt: attribs.alt ?? "",
    loading: "lazy",
    decoding: "async",
  }
}

function buildAllowedAttributes(preserveStyles: boolean): IOptions["allowedAttributes"] {
  const styleAttrs = preserveStyles ? ["style"] : []
  const attrs: Record<string, string[]> = {
    a: [...LINK_ATTRS, ...styleAttrs],
    img: IMG_ATTRS,
  }
  for (const tag of ALLOWED_TAGS) {
    if (tag === "a" || tag === "img") continue
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

export function sanitize(html: string, preserveStyles: boolean): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: buildAllowedAttributes(preserveStyles),
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["https"] },
    allowedSchemesAppliedToAttributes: ["href", "src"],
    allowProtocolRelative: true,
    exclusiveFilter: (frame) => frame.tag === "img" && !isHttpsImage(frame.attribs.src),
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      img: (tagName, attribs) => ({
        tagName,
        attribs: imgAttributes(attribs),
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
  return (
    <div
      className="html-content"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: content }}
    />
  )
}

export default HtmlContent
