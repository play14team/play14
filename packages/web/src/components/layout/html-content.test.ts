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

  it("accepts an uppercase https scheme", () => {
    expect(sanitize('<img src="HTTPS://cdn.play14.org/a.webp" />', false)).toContain("<img")
  })

  it("keeps title and class on images", () => {
    const html = sanitize(
      '<img src="https://cdn.play14.org/a.webp" title="Setup" class="diagram" />',
      false
    )
    expect(html).toContain('title="Setup"')
    expect(html).toContain('class="diagram"')
  })

  it("overrides author-supplied loading and decoding", () => {
    const html = sanitize(
      '<img src="https://cdn.play14.org/a.webp" loading="eager" decoding="sync" />',
      false
    )
    expect(html).toContain('loading="lazy"')
    expect(html).toContain('decoding="async"')
    expect(html).not.toContain("eager")
    expect(html).not.toContain('"sync"')
  })

  it("defaults a missing alt to empty", () => {
    expect(sanitize('<img src="https://cdn.play14.org/a.webp" />', false)).toContain('alt=""')
  })

  it("drops non-numeric width and height", () => {
    const html = sanitize(
      '<img src="https://cdn.play14.org/a.webp" width="50%" height="abc" />',
      false
    )
    expect(html).not.toContain("width")
    expect(html).not.toContain("height")
  })
})
