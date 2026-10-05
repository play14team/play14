import { serializeJsonLd } from "@/libs/structured-data"

type JsonLdProps = {
  data: Record<string, unknown> | Array<Record<string, unknown>>
}

/** Renders schema.org structured data, escaped by `serializeJsonLd`. */
export default function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  )
}
