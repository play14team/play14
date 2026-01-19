/**
 * Unit tests for calendar utilities
 */

import { describe, expect, it } from "vitest"
import { generateEventICS, generateGoogleCalendarUrl, generateOutlookCalendarUrl } from "./calendar"

describe("generateEventICS", () => {
  const baseEvent = {
    name: "Paris",
    slug: "paris-03",
    description: "Join us for an amazing play14 event!",
    start: "2025-03-14T09:00:00Z",
    end: "2025-03-16T17:00:00Z",
    contactEmail: "paris@play14.org",
    eventStatus: "Open",
  }

  it("generates valid ICS content", async () => {
    const ics = await generateEventICS(baseEvent)

    expect(ics).toContain("BEGIN:VCALENDAR")
    expect(ics).toContain("END:VCALENDAR")
    expect(ics).toContain("BEGIN:VEVENT")
    expect(ics).toContain("END:VEVENT")
  })

  it("includes event title with #play14 prefix", async () => {
    const ics = await generateEventICS(baseEvent)

    expect(ics).toContain("#play14 - Paris")
  })

  it("includes event description", async () => {
    const ics = await generateEventICS(baseEvent)

    expect(ics).toContain("Join us for an amazing play14 event!")
  })

  it("includes organizer when contactEmail provided", async () => {
    const ics = await generateEventICS(baseEvent)

    expect(ics).toContain("paris@play14.org")
  })

  it("includes categories", async () => {
    const ics = await generateEventICS(baseEvent)

    expect(ics).toContain("CATEGORIES")
    // Categories should include play, learning by doing, unconference
  })

  it("sets status to CONFIRMED for Open events", async () => {
    const ics = await generateEventICS({ ...baseEvent, eventStatus: "Open" })

    expect(ics).toContain("STATUS:CONFIRMED")
  })

  it("sets status to TENTATIVE for Announced events", async () => {
    const ics = await generateEventICS({ ...baseEvent, eventStatus: "Announced" })

    expect(ics).toContain("STATUS:TENTATIVE")
  })

  it("sets status to CANCELLED for Cancelled events", async () => {
    const ics = await generateEventICS({ ...baseEvent, eventStatus: "Cancelled" })

    expect(ics).toContain("STATUS:CANCELLED")
  })

  it("handles event without description", async () => {
    const eventWithoutDesc = { ...baseEvent, description: undefined }
    const ics = await generateEventICS(eventWithoutDesc)

    expect(ics).toContain("BEGIN:VEVENT")
    expect(ics).not.toContain("DESCRIPTION:")
  })

  it("handles event without contactEmail", async () => {
    const eventWithoutEmail = { ...baseEvent, contactEmail: undefined }
    const ics = await generateEventICS(eventWithoutEmail)

    expect(ics).toContain("BEGIN:VEVENT")
    expect(ics).not.toContain("ORGANIZER")
  })

  describe("with venue information", () => {
    it("includes venue name in location", async () => {
      const eventWithVenue = {
        ...baseEvent,
        venue: {
          name: "Conference Center",
          website: "https://venue.example.com",
        },
      }
      const ics = await generateEventICS(eventWithVenue)

      expect(ics).toContain("Conference Center")
    })

    it("includes place name in location", async () => {
      const eventWithVenue = {
        ...baseEvent,
        venue: {
          name: "Conference Center",
          location: {
            place_name: "Paris, France",
          },
        },
      }
      const ics = await generateEventICS(eventWithVenue)

      // ICS format escapes commas with backslash
      expect(ics).toContain("Paris\\, France")
    })

    it("includes geo coordinates from Mapbox format", async () => {
      const eventWithGeo = {
        ...baseEvent,
        venue: {
          name: "Conference Center",
          location: {
            geometry: {
              coordinates: [2.3522, 48.8566] as [number, number], // Paris coordinates
            },
          },
        },
      }
      const ics = await generateEventICS(eventWithGeo)

      // GEO format in ICS is lat;lon
      expect(ics).toContain("GEO:")
    })

    it("includes geo coordinates from simple format", async () => {
      const eventWithGeo = {
        ...baseEvent,
        venue: {
          name: "Conference Center",
          location: {
            lat: 48.8566,
            lng: 2.3522,
          },
        },
      }
      const ics = await generateEventICS(eventWithGeo)

      expect(ics).toContain("GEO:")
    })
  })

  describe("HTML stripping", () => {
    it("strips HTML tags from description", async () => {
      const eventWithHtml = {
        ...baseEvent,
        description: "<p>Join us for <strong>amazing</strong> games!</p>",
      }
      const ics = await generateEventICS(eventWithHtml)

      expect(ics).not.toContain("<p>")
      expect(ics).not.toContain("<strong>")
      expect(ics).not.toContain("</p>")
      expect(ics).toContain("Join us for amazing games!")
    })

    it("handles nested HTML tags", async () => {
      const eventWithNestedHtml = {
        ...baseEvent,
        description: "<div><p>Nested <span>content</span></p></div>",
      }
      const ics = await generateEventICS(eventWithNestedHtml)

      expect(ics).toContain("Nested content")
      expect(ics).not.toContain("<div>")
    })

    it("decodes HTML entities", async () => {
      const eventWithEntities = {
        ...baseEvent,
        description: "Games &amp; Fun &lt;3",
      }
      const ics = await generateEventICS(eventWithEntities)

      expect(ics).toContain("Games & Fun <3")
    })
  })
})

describe("generateGoogleCalendarUrl", () => {
  const baseEvent = {
    name: "Paris",
    slug: "paris-03",
    description: "Join us for play14!",
    start: "2025-03-14T09:00:00Z",
    end: "2025-03-16T17:00:00Z",
  }

  it("returns a valid Google Calendar URL", () => {
    const url = generateGoogleCalendarUrl(baseEvent)

    expect(url).toContain("https://calendar.google.com/calendar/render")
    expect(url).toContain("action=TEMPLATE")
  })

  it("includes event title", () => {
    const url = generateGoogleCalendarUrl(baseEvent)

    expect(url).toContain("text=%23play14+-+Paris")
  })

  it("includes dates parameter", () => {
    const url = generateGoogleCalendarUrl(baseEvent)

    expect(url).toContain("dates=")
  })

  it("includes description", () => {
    const url = generateGoogleCalendarUrl(baseEvent)

    expect(url).toContain("details=")
  })

  it("includes location parameter", () => {
    const url = generateGoogleCalendarUrl(baseEvent)

    expect(url).toContain("location=")
  })

  it("strips HTML from description", () => {
    const eventWithHtml = {
      ...baseEvent,
      description: "<p>Join us for <b>play14</b>!</p>",
    }
    const url = generateGoogleCalendarUrl(eventWithHtml)

    expect(url).not.toContain("<p>")
    expect(url).not.toContain("<b>")
  })

  it("truncates long descriptions", () => {
    const longDescription = "A".repeat(2000)
    const eventWithLongDesc = {
      ...baseEvent,
      description: longDescription,
    }
    const url = generateGoogleCalendarUrl(eventWithLongDesc)

    // Description should be truncated to 1000 characters
    const detailsParam = new URL(url).searchParams.get("details")
    expect(detailsParam!.length).toBeLessThanOrEqual(1000)
  })
})

describe("generateOutlookCalendarUrl", () => {
  const baseEvent = {
    name: "Paris",
    slug: "paris-03",
    description: "Join us for play14!",
    start: "2025-03-14T09:00:00Z",
    end: "2025-03-16T17:00:00Z",
  }

  it("returns a valid Outlook Calendar URL", () => {
    const url = generateOutlookCalendarUrl(baseEvent)

    expect(url).toContain("https://outlook.live.com/calendar/0/deeplink/compose")
    expect(url).toContain("rru=addevent")
  })

  it("includes event subject", () => {
    const url = generateOutlookCalendarUrl(baseEvent)

    expect(url).toContain("subject=%23play14+-+Paris")
  })

  it("includes start and end dates", () => {
    const url = generateOutlookCalendarUrl(baseEvent)

    expect(url).toContain("startdt=")
    expect(url).toContain("enddt=")
  })

  it("includes body with description", () => {
    const url = generateOutlookCalendarUrl(baseEvent)

    expect(url).toContain("body=")
  })

  it("includes location", () => {
    const url = generateOutlookCalendarUrl(baseEvent)

    expect(url).toContain("location=")
  })

  it("strips HTML from body", () => {
    const eventWithHtml = {
      ...baseEvent,
      description: "<p>Join us for <b>play14</b>!</p>",
    }
    const url = generateOutlookCalendarUrl(eventWithHtml)

    expect(url).not.toContain("<p>")
    expect(url).not.toContain("<b>")
  })
})
