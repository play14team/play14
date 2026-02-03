import { Section, Text } from "@react-email/components"
import { Layout } from "./components/layout"

interface NewsletterEmailProps {
  subject: string
  body: string
  previewText?: string
}

const contentStyle = {
  fontSize: "16px",
  lineHeight: "1.6",
  color: "#333333",
}

const headingStyle = {
  fontSize: "24px",
  fontWeight: "bold" as const,
  color: "#1a1a1a",
  marginBottom: "16px",
}

export default function NewsletterEmail({ subject, body, previewText }: NewsletterEmailProps) {
  return (
    <Layout preview={previewText || subject}>
      <Section>
        <Text style={headingStyle}>{subject}</Text>
        {/* Newsletter body is HTML content created by founders (trusted admin users) */}
        <div style={contentStyle} dangerouslySetInnerHTML={{ __html: body }} />
      </Section>
    </Layout>
  )
}

/**
 * Render the newsletter email to HTML string
 */
export async function renderNewsletterEmail(props: NewsletterEmailProps): Promise<string> {
  // Import render from @react-email/render at runtime
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { render } = require("@react-email/render")
  return await render(<NewsletterEmail {...props} />)
}
