import { describe, expect, it } from "vitest"
import { sanitize } from "./html-content"

describe("sanitize", () => {
  it("keeps https images with their safe attributes", () => {
    const html = sanitize(
      '<p><img src="https://cdn.play14.org/a.webp" alt="Setup" width="1260" height="520" /></p>',
      false
    )
    expect(html).toContain('src="https://cdn.play14.org/a.webp"')
    expect(html).toContain('alt="Setup"')
    expect(html).toContain('width="1260"')
    expect(html).toContain('loading="lazy"')
  })

  it("drops images with non-https or relative sources", () => {
    for (const src of [
      "http://example.com/a.png",
      "//example.com/a.png",
      "{{site.url}}/images/games/a.png",
      "/images/a.png",
      "data:image/png;base64,AAAA",
      "javascript:alert(1)",
    ]) {
      expect(sanitize(`<p><img src="${src}" alt="x" /></p>`, false)).toBe("<p></p>")
    }
  })

  it("drops images without a source", () => {
    expect(sanitize('<p><img alt="x" /></p>', false)).toBe("<p></p>")
  })

  it("strips event handlers and styles from images", () => {
    const html = sanitize(
      '<img src="https://cdn.play14.org/a.webp" onerror="alert(1)" style="position:fixed" />',
      true
    )
    expect(html).not.toContain("onerror")
    expect(html).not.toContain("style")
  })
})
