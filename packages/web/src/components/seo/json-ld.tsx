type JsonLdProps = {
  data: Record<string, unknown> | Array<Record<string, unknown>>
}

/**
 * Renders schema.org structured data. `<` is escaped so CMS content cannot
 * close the script tag (see the Next.js JSON-LD guide).
 */
export default function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  )
}
