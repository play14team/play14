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

function scrubStack(stack: string): string {
  return stack
    .split("\n")
    .map((line) =>
      line.replace(/\((\/[^)]+)\)/g, "(<path>)").replace(/(^|\s)(\/[^\s)]+)/g, "$1<path>")
    )
    .join("\n")
}

export function buildIssueReportUrl(ctx: IssueReportContext = {}): string {
  const params = new URLSearchParams({ template: TEMPLATE })

  if (ctx.errorMessage) {
    const safeMessage = ctx.errorMessage.replace(/\s+/g, " ").trim()
    params.set("title", `[Bug]: ${safeMessage}`.slice(0, TITLE_MAX))

    const whatHappened = [
      "An unexpected error occurred while browsing the website.",
      "",
      `**Error message:** ${safeMessage}`,
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
    const scrubbed = scrubStack(ctx.errorStack).slice(0, STACK_MAX)
    additional.push(`**Stack trace:**\n\`\`\`\n${scrubbed}\n\`\`\``)
  }
  if (additional.length > 0) {
    params.set("additional-context", additional.join("\n\n"))
  }

  const url = `${ISSUE_BASE_URL}?${params.toString()}`
  if (url.length <= URL_MAX) return url

  // Drop the verbose section first; if still too long, fall back to a hard slice.
  params.delete("additional-context")
  const shorter = `${ISSUE_BASE_URL}?${params.toString()}`
  return shorter.length <= URL_MAX ? shorter : shorter.slice(0, URL_MAX)
}
