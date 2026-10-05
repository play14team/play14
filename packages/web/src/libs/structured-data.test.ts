/**
 * Unit tests for schema.org JSON-LD builders
 */

import { describe, expect, it } from "vitest"
import type { Article, Event, Game } from "@/models/strapi"
import {
  articleJsonLd,
  breadcrumbJsonLd,
  eventJsonLd,
  gameJsonLd,
  organizationJsonLd,
  websiteJsonLd,
} from "./structured-data"

const baseEvent: Event = {
  slug: "luxembourg-2026",
  name: "#play14 Luxembourg 2026",
  start: "2026-03-13T17:00:00.000Z",
  end: "2026-03-15T16:00:00.000Z",
  eventStatus: "Open",
  description: "<p>Three days of <strong>play</strong>.</p>",
  ticketingMode: "internal",
  defaultImage: { name: "cover", url: "https://cdn.play14.org/cover.jpg" },
  location: { name: "Luxembourg", country: "LU" },
  venue: {
    name: "LuxInnovation",
    location: { geometry: { coordinates: [6.13, 49.61] }, place_name: "5 Av. des Hauts-Fourneaux" },
  },
  hosts: [{ slug: "jane", name: "Jane Doe" }],
}

describe("eventJsonLd", () => {
  it("covers the fields Google requires for Event rich results", () => {
    const ld = eventJsonLd(baseEvent, "fr")
    expect(ld).toMatchObject({
      "@type": "Event",
      name: "#play14 Luxembourg 2026",
      startDate: "2026-03-13T17:00:00.000Z",
      url: "https://play14.org/fr/events/luxembourg-2026",
      eventStatus: "https://schema.org/EventScheduled",
      description: "Three days of play.",
      image: ["https://cdn.play14.org/cover.jpg"],
      location: {
        "@type": "Place",
        name: "LuxInnovation",
        address: { addressLocality: "Luxembourg", addressCountry: "LU" },
        geo: { latitude: 49.61, longitude: 6.13 },
      },
      offers: { url: "https://play14.org/fr/events/luxembourg-2026" },
    })
    expect(ld.organizer).toEqual([
      expect.objectContaining({ "@type": "Organization", name: "#play14" }),
      { "@type": "Person", name: "Jane Doe" },
    ])
  })

  it("marks cancelled events and drops their offers", () => {
    const ld = eventJsonLd({ ...baseEvent, eventStatus: "Cancelled" }, "en")
    expect(ld.eventStatus).toBe("https://schema.org/EventCancelled")
    expect(ld.offers).toBeUndefined()
  })

  it("uses the external registration link for external ticketing", () => {
    const ld = eventJsonLd(
      {
        ...baseEvent,
        ticketingMode: "external",
        registration: { link: "https://tickets.example" },
      },
      "en"
    )
    expect(ld.offers).toMatchObject({ url: "https://tickets.example" })
  })
})

describe("articleJsonLd", () => {
  const article: Article = {
    slug: "hello",
    title: "Hello",
    summary: "A summary",
    publishedAt: "2024-01-01T00:00:00.000Z",
    author: { name: "Jane Doe", slug: "jane" },
  }

  it("uses the summary and the page URL", () => {
    expect(articleJsonLd(article, "en")).toMatchObject({
      headline: "Hello",
      description: "A summary",
      author: { "@type": "Person", name: "Jane Doe" },
      mainEntityOfPage: "https://play14.org/articles/hello",
    })
  })

  it("points at the original for cross-posted articles", () => {
    expect(
      articleJsonLd({ ...article, cannonical: "https://blog.example/hello" }, "en").mainEntityOfPage
    ).toBe("https://blog.example/hello")
  })

  it("ignores a cannonical that is not an absolute URL", () => {
    expect(articleJsonLd({ ...article, cannonical: "hello" }, "en").mainEntityOfPage).toBe(
      "https://play14.org/articles/hello"
    )
  })
})

describe("breadcrumbJsonLd", () => {
  it("links every item but the current one", () => {
    const ld = breadcrumbJsonLd("de", [
      { name: "#play14", pathname: "/" },
      { name: "Events", pathname: "/events" },
      { name: "Current" },
    ])
    expect(ld.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "#play14", item: "https://play14.org/de" },
      { "@type": "ListItem", position: 2, name: "Events", item: "https://play14.org/de/events" },
      { "@type": "ListItem", position: 3, name: "Current" },
    ])
  })
})

describe("gameJsonLd", () => {
  const game: Game = {
    slug: "marshmallow-challenge",
    name: "Marshmallow challenge",
    category: "Team building",
    summary: "<p>Build the <em>tallest</em> tower.</p>",
    tags: [{ value: "teamwork" }, { value: "prototyping" }],
    defaultImage: { name: "cover", url: "/uploads/cover.jpg" },
    proposedBy: [{ slug: "jane", name: "Jane Doe" }],
    documentedBy: [
      { slug: "jane", name: "Jane Doe" },
      { slug: "john", name: "John Roe" },
    ],
  } as Game

  it("merges proposers and documenters into one author list without duplicates", () => {
    expect(gameJsonLd(game, "it")).toMatchObject({
      "@type": "Game",
      url: "https://play14.org/it/games/marshmallow-challenge",
      description: "Build the tallest tower.",
      genre: "Team building",
      keywords: "teamwork, prototyping",
      image: ["https://play14.org/uploads/cover.jpg"],
      author: [
        { "@type": "Person", name: "Jane Doe" },
        { "@type": "Person", name: "John Roe" },
      ],
    })
  })

  it("omits the author when nobody is credited", () => {
    const ld = gameJsonLd({ ...game, proposedBy: [], documentedBy: undefined }, "en")
    expect(ld).not.toHaveProperty("author")
    expect(ld.publisher).toMatchObject({ "@id": "https://play14.org/#organization" })
  })
})

describe("organizationJsonLd / websiteJsonLd", () => {
  it("share the organization @id so the website's publisher resolves to it", () => {
    const org = organizationJsonLd("A community")
    const site = websiteJsonLd("pt", "A community")
    expect(org).toMatchObject({
      "@type": "NGO",
      url: "https://play14.org",
      description: "A community",
    })
    expect(site).toMatchObject({ "@type": "WebSite", inLanguage: "pt" })
    expect(site.publisher).toMatchObject({ "@id": org["@id"] })
  })
})
