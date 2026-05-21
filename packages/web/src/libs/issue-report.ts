// NOTE: errorMessage and pageUrl flow verbatim into a public GitHub issue — keep them free of PII.

const ISSUE_BASE_URL = "https://github.com/play14team/play14/issues/new"
const TEMPLATE = "bug_report.yml"

const TITLE_MAX = 200
const STACK_MAX = 2000
const URL_MAX = 8000

export type IssueReportContext = {
  errorMessage?: string
  errorDigest?: string
  errorStack?: string
  pageUrl?: string
  userAgent?: string
}

export function issueReportContextFromError(
  error: Error & { digest?: string },
  location: Pick<Location, "origin" | "pathname">,
  ua: Pick<Navigator, "userAgent">
): IssueReportContext {
  return {
    errorMessage: error.message,
    errorDigest: error.digest,
    errorStack: error.stack,
    // Strip query + hash so auth tokens / search terms / IDs in the
    // current URL don't get pre-filled into the public issue body.
    pageUrl: `${location.origin}${location.pathname}`,
    userAgent: ua.userAgent,
  }
}

// Match absolute filesystem paths anchored at recognisable roots so we don't
// accidentally scrub URL paths (e.g. `https://host/foo`) — only paths starting
// at typical Unix roots or with a Windows drive letter are redacted.
const UNIX_PATH_RE = /\/(?:home|Users|usr|var|tmp|opt|etc|root|app|srv|mnt)\/[^\s'")]+/g
const WINDOWS_PATH_RE = /[A-Za-z]:\\[^\s'")]+/g

function scrubPaths(line: string): string {
  return line.replace(UNIX_PATH_RE, "<path>").replace(WINDOWS_PATH_RE, "<path>")
}

function scrubStack(stack: string): string {
  return stack.split("\n").map(scrubPaths).join("\n")
}

function truncateStack(stack: string): string {
  if (stack.length <= STACK_MAX) return stack
  const head = stack.slice(0, STACK_MAX)
  const lastNewline = head.lastIndexOf("\n")
  return lastNewline > 0 ? `${head.slice(0, lastNewline)}\n…` : `${head}…`
}

export function buildIssueReportUrl(ctx: IssueReportContext = {}): string {
  const params = new URLSearchParams({ template: TEMPLATE })

  if (ctx.errorMessage) {
    // Titles need a single line; bodies can keep newlines so multi-line
    // messages stay readable. Both get path-scrubbed so server-side paths
    // never appear in the public issue.
    const titleMessage = scrubPaths(ctx.errorMessage.replace(/\s+/g, " ").trim())
    const bodyMessage = scrubPaths(ctx.errorMessage.replace(/[ \t]+/g, " ").trim())
    params.set("title", `[Bug]: ${titleMessage}`.slice(0, TITLE_MAX))

    const whatHappened = [
      "An unexpected error occurred while browsing the website.",
      "",
      `**Error message:** ${bodyMessage}`,
      ctx.errorDigest ? `**Error digest:** ${ctx.errorDigest}` : null,
    ]
      .filter((line): line is string => line !== null)
      .join("\n")
    params.set("what-happened", whatHappened)
  } else if (ctx.errorDigest) {
    params.set("title", `[Bug]: error ${ctx.errorDigest}`)
    params.set("what-happened", `An unexpected error occurred (digest: ${ctx.errorDigest}).`)
  }

  if (ctx.pageUrl) {
    params.set("page-url", ctx.pageUrl)
  }

  const additional: string[] = []
  if (ctx.userAgent) additional.push(`**User agent:** ${ctx.userAgent}`)
  if (ctx.errorStack) {
    const scrubbed = truncateStack(scrubStack(ctx.errorStack))
    additional.push(`**Stack trace:**\n\`\`\`\n${scrubbed}\n\`\`\``)
  }
  if (additional.length > 0) {
    params.set("additional-context", additional.join("\n\n"))
  }

  const url = `${ISSUE_BASE_URL}?${params.toString()}`
  if (url.length <= URL_MAX) return url

  // Drop the verbose section first; if even that's not enough (e.g. a page URL
  // longer than ~8 KB), fall back to the bare template so the link stays
  // navigable rather than slicing inside a percent-encoded sequence.
  params.delete("additional-context")
  const shorter = `${ISSUE_BASE_URL}?${params.toString()}`
  return shorter.length <= URL_MAX ? shorter : `${ISSUE_BASE_URL}?template=${TEMPLATE}`
}
