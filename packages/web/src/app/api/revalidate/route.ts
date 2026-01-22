import { revalidatePath } from "next/cache"
import { type NextRequest, NextResponse } from "next/server"

/**
 * On-demand revalidation endpoint for external services (e.g., Strapi webhooks).
 *
 * This endpoint allows the API to trigger revalidation of static pages after
 * data changes that happen outside of Next.js (like ticket purchases via Stripe webhooks).
 *
 * Security: Protected by a shared secret token.
 *
 * Usage:
 *   POST /api/revalidate
 *   Headers: { "x-revalidate-token": "<REVALIDATE_SECRET>" }
 *   Body: { "type": "event", "slug": "event-slug" }
 */
export async function POST(request: NextRequest) {
  const token = request.headers.get("x-revalidate-token")
  const secret = process.env.REVALIDATE_SECRET

  // Validate the secret token
  if (!secret) {
    console.error("[Revalidate] REVALIDATE_SECRET not configured")
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 })
  }

  if (token !== secret) {
    console.warn("[Revalidate] Invalid token received")
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { type, slug } = body

    if (!type) {
      return NextResponse.json({ error: "Missing 'type' parameter" }, { status: 400 })
    }

    switch (type) {
      case "event":
        if (!slug) {
          return NextResponse.json(
            { error: "Missing 'slug' for event revalidation" },
            { status: 400 }
          )
        }
        // Revalidate the specific event page
        revalidatePath(`/events/${slug}`)
        // Revalidate event listing pages
        revalidatePath("/events")
        revalidatePath("/events/map")
        revalidatePath("/events/calendar")
        // Revalidate filter pages (status, country, location, year)
        revalidatePath("/events/statuses", "layout")
        revalidatePath("/events/countries", "layout")
        revalidatePath("/events/locations", "layout")
        revalidatePath("/events/year", "layout")
        // Revalidate home page (may show upcoming events)
        revalidatePath("/")
        console.log(`[Revalidate] Event pages revalidated for slug: ${slug}`)
        break

      case "player":
        if (!slug) {
          return NextResponse.json(
            { error: "Missing 'slug' for player revalidation" },
            { status: 400 }
          )
        }
        revalidatePath(`/players/${slug}`)
        revalidatePath("/players")
        // Revalidate filter pages (positions, letter pages)
        revalidatePath("/players/positions", "layout")
        revalidatePath("/players/name", "layout")
        console.log(`[Revalidate] Player pages revalidated for slug: ${slug}`)
        break

      case "game":
        if (!slug) {
          return NextResponse.json(
            { error: "Missing 'slug' for game revalidation" },
            { status: 400 }
          )
        }
        revalidatePath(`/games/${slug}`)
        revalidatePath("/games")
        // Revalidate filter pages (categories, tags)
        revalidatePath("/games/categories", "layout")
        revalidatePath("/games/tags", "layout")
        console.log(`[Revalidate] Game pages revalidated for slug: ${slug}`)
        break

      case "article":
        if (!slug) {
          return NextResponse.json(
            { error: "Missing 'slug' for article revalidation" },
            { status: 400 }
          )
        }
        revalidatePath(`/articles/${slug}`)
        revalidatePath("/articles")
        // Revalidate filter pages (categories, tags)
        revalidatePath("/articles/categories", "layout")
        revalidatePath("/articles/tags", "layout")
        console.log(`[Revalidate] Article pages revalidated for slug: ${slug}`)
        break

      case "event-location":
        if (!slug) {
          return NextResponse.json(
            { error: "Missing 'slug' for event-location revalidation" },
            { status: 400 }
          )
        }
        revalidatePath(`/events/locations/${slug}`)
        revalidatePath("/events/locations", "layout")
        revalidatePath("/events/countries", "layout")
        console.log(`[Revalidate] Event location pages revalidated for slug: ${slug}`)
        break

      case "home":
        revalidatePath("/")
        console.log("[Revalidate] Home page revalidated")
        break

      case "all-events":
        revalidatePath("/events", "layout")
        revalidatePath("/")
        console.log("[Revalidate] All event pages revalidated")
        break

      case "all-players":
        revalidatePath("/players", "layout")
        console.log("[Revalidate] All player pages revalidated")
        break

      case "all-games":
        revalidatePath("/games", "layout")
        console.log("[Revalidate] All game pages revalidated")
        break

      case "all-articles":
        revalidatePath("/articles", "layout")
        console.log("[Revalidate] All article pages revalidated")
        break

      default:
        return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 })
    }

    return NextResponse.json({ revalidated: true, type, slug })
  } catch (error) {
    console.error("[Revalidate] Error:", error)
    return NextResponse.json({ error: "Failed to revalidate" }, { status: 500 })
  }
}
