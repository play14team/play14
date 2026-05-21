import { describe, expect, it } from "vitest"
import { buildIssueReportUrl } from "./issue-report"

const BASE = "https://github.com/play14team/play14/issues/new"

describe("buildIssueReportUrl", () => {
  it("returns the bare template URL when no context is provided", () => {
    const url = new URL(buildIssueReportUrl())
    expect(`${url.origin}${url.pathname}`).toBe(BASE)
    expect(url.searchParams.get("template")).toBe("bug_report.yml")
    expect(url.searchParams.has("title")).toBe(false)
    expect(url.searchParams.has("what-happened")).toBe(false)
  })

  it("prefills title and what-happened from the error message", () => {
    const url = new URL(
      buildIssueReportUrl({
        errorMessage: "Cannot read property 'foo' of undefined",
        errorDigest: "abc123",
      })
    )
    expect(url.searchParams.get("title")).toBe("[Bug]: Cannot read property 'foo' of undefined")
    const what = url.searchParams.get("what-happened") ?? ""
    expect(what).toContain("Cannot read property 'foo' of undefined")
    expect(what).toContain("abc123")
  })

  it("falls back to the digest when no error message is available", () => {
    const url = new URL(buildIssueReportUrl({ errorDigest: "abc123" }))
    expect(url.searchParams.get("title")).toBe("[Bug]: error abc123")
    expect(url.searchParams.get("what-happened")).toContain("abc123")
  })

  it("propagates page URL and user agent to the issue form", () => {
    const url = new URL(
      buildIssueReportUrl({
        pageUrl: "https://play14.org/events",
        userAgent: "Mozilla/5.0",
      })
    )
    expect(url.searchParams.get("page-url")).toBe("https://play14.org/events")
    expect(url.searchParams.get("additional-context")).toContain("Mozilla/5.0")
  })

  it("caps the title length so the URL stays short", () => {
    const long = "x".repeat(500)
    const url = new URL(buildIssueReportUrl({ errorMessage: long }))
    expect((url.searchParams.get("title") ?? "").length).toBeLessThanOrEqual(200)
  })

  it("truncates the stack trace to keep the URL under GitHub's limit", () => {
    const stack = "frame\n".repeat(1000)
    const url = new URL(buildIssueReportUrl({ errorStack: stack }))
    const context = url.searchParams.get("additional-context") ?? ""
    expect(context).toContain("Stack trace:")
    expect(context.length).toBeLessThan(2500)
  })
})
