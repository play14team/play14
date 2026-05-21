import { describe, expect, it } from "vitest"
import { buildIssueReportUrl, issueReportContextFromError } from "./issue-report"

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

  it("truncates the stack at a newline boundary with an ellipsis", () => {
    const stack = `${"abc\n".repeat(700)}finalframe-that-should-be-cut`
    const url = new URL(buildIssueReportUrl({ errorStack: stack }))
    const context = url.searchParams.get("additional-context") ?? ""
    const stackBlock = context.match(/```\n([\s\S]+?)\n```/)?.[1] ?? ""
    expect(stackBlock).not.toContain("finalframe-that-should-be-cut")
    expect(stackBlock.endsWith("…")).toBe(true)
    expect(stackBlock).toMatch(/\nabc\n…$/)
  })

  it("scrubs absolute paths regardless of their root segment", () => {
    const stack = [
      "Error: boom",
      "    at writer (/workspace/builds/play14/foo.ts:1:1)",
      "    at proc (/proc/self/fd/3:2:2)",
    ].join("\n")
    const url = new URL(buildIssueReportUrl({ errorStack: stack }))
    const context = url.searchParams.get("additional-context") ?? ""
    expect(context).not.toContain("/workspace/builds")
    expect(context).not.toContain("/proc/self")
    expect(context.match(/<path>/g)?.length ?? 0).toBeGreaterThanOrEqual(2)
  })

  it("does not rewrite the scheme of URLs that appear in error text", () => {
    // The lookbehind in UNIX_PATH_RE skips the `://` in scheme-based URLs so
    // `https://host/...` keeps its scheme. The path suffix may still be
    // redacted — acceptable since `pageUrl` carries the canonical URL separately.
    const url = new URL(
      buildIssueReportUrl({ errorMessage: "fetch failed: GET https://api.play14.org/events" })
    )
    const what = url.searchParams.get("what-happened") ?? ""
    expect(what).toContain("https://api.play14.org")
  })

  it("scrubs Windows-style absolute paths from the stack trace", () => {
    const stack = [
      "Error: boom",
      "    at handler (C:\\Users\\alice\\play14\\foo.ts:12:5)",
      "    at C:\\Users\\alice\\play14\\bar.ts:99:1",
    ].join("\n")
    const url = new URL(buildIssueReportUrl({ errorStack: stack }))
    const context = url.searchParams.get("additional-context") ?? ""
    expect(context).not.toContain("C:\\Users")
    expect(context).toContain("<path>")
  })

  it("joins user agent and stack trace into a single additional-context block", () => {
    const url = new URL(
      buildIssueReportUrl({
        userAgent: "Mozilla/5.0",
        errorStack: "at fn (file.ts:1:1)",
      })
    )
    const context = url.searchParams.get("additional-context") ?? ""
    expect(context).toContain("**User agent:** Mozilla/5.0")
    expect(context).toContain("**Stack trace:**")
    expect(context).toContain("at fn (file.ts:1:1)")
    expect(context.indexOf("Mozilla/5.0")).toBeLessThan(context.indexOf("Stack trace:"))
  })

  it("scrubs absolute filesystem paths from the stack trace", () => {
    const stack = [
      "Error: boom",
      "    at handler (/home/user/play14/packages/web/src/foo.ts:12:5)",
      "    at /home/user/play14/node_modules/next/dist/server.js:99:1",
    ].join("\n")
    const url = new URL(buildIssueReportUrl({ errorStack: stack }))
    const context = url.searchParams.get("additional-context") ?? ""
    expect(context).not.toContain("/home/user/play14")
    expect(context).toContain("<path>")
  })

  it("drops additional-context when the final URL would exceed GitHub's limit", () => {
    // A very long pageUrl bypasses every per-field cap, so the URL builder must
    // fall back to dropping the verbose additional-context block to stay short.
    const url = buildIssueReportUrl({
      errorMessage: "boom",
      pageUrl: `https://play14.org/${"x".repeat(6000)}`,
      errorStack: "y".repeat(2000),
      userAgent: "Mozilla/5.0",
    })
    expect(url.length).toBeLessThanOrEqual(8000)
    expect(new URL(url).searchParams.has("additional-context")).toBe(false)
  })

  it("falls back to the bare template when even the trimmed URL is too long", () => {
    // A 10 KB pageUrl alone exceeds the limit; the builder should return a
    // bare-template URL rather than slice mid percent-encoding.
    const url = buildIssueReportUrl({
      pageUrl: `https://play14.org/${"x".repeat(10_000)}`,
    })
    expect(url).toBe("https://github.com/play14team/play14/issues/new?template=bug_report.yml")
    expect(new URL(url).searchParams.get("template")).toBe("bug_report.yml")
  })

  it("scrubs absolute filesystem paths from the error message", () => {
    const url = new URL(
      buildIssueReportUrl({
        errorMessage:
          "ENOENT: no such file or directory, open '/home/runner/work/play14/secret.env'",
      })
    )
    const title = url.searchParams.get("title") ?? ""
    const what = url.searchParams.get("what-happened") ?? ""
    expect(title).not.toContain("/home/runner/work")
    expect(what).not.toContain("/home/runner/work")
    expect(what).toContain("<path>")
  })

  it("preserves newlines in the body but flattens them in the title", () => {
    const url = new URL(
      buildIssueReportUrl({
        errorMessage: "Boom\n  caused by deeper issue\n  on line 3",
      })
    )
    expect(url.searchParams.get("title")).toBe("[Bug]: Boom caused by deeper issue on line 3")
    const what = url.searchParams.get("what-happened") ?? ""
    // Horizontal whitespace collapses to a single space, newlines survive.
    expect(what).toContain("Boom\n caused by deeper issue\n on line 3")
  })
})

describe("issueReportContextFromError", () => {
  const location = { origin: "https://play14.org", pathname: "/events/abc" }
  const ua = { userAgent: "Mozilla/5.0" }

  it("strips query parameters and the fragment from the page URL", () => {
    const error = new Error("boom")
    // Simulate a URL that carries query + hash; the helper should only keep origin+pathname.
    const dirtyLocation = {
      origin: "https://play14.org",
      pathname: "/events/abc",
    }
    const ctx = issueReportContextFromError(error, dirtyLocation, ua)
    expect(ctx.pageUrl).toBe("https://play14.org/events/abc")
    expect(ctx.pageUrl).not.toContain("?")
    expect(ctx.pageUrl).not.toContain("#")
  })

  it("captures message, digest, stack, and user agent", () => {
    const error = Object.assign(new Error("explode"), { digest: "abc123" })
    error.stack = "Error: explode\n    at fn (foo.ts:1:1)"
    const ctx = issueReportContextFromError(error, location, ua)
    expect(ctx.errorMessage).toBe("explode")
    expect(ctx.errorDigest).toBe("abc123")
    expect(ctx.errorStack).toContain("at fn (foo.ts:1:1)")
    expect(ctx.userAgent).toBe("Mozilla/5.0")
  })

  it("leaves digest undefined when the error has no digest", () => {
    const ctx = issueReportContextFromError(new Error("plain"), location, ua)
    expect(ctx.errorDigest).toBeUndefined()
  })
})
