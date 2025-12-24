#!/usr/bin/env node

import { LinkedInScraper } from "./linkedin/scraper"
import { TestimonialService } from "./strapi/testimonials"
import type { ScraperOptions } from "./linkedin/types"

/**
 * LinkedIn Testimonial Scraper CLI
 * Searches LinkedIn for #play14 posts and creates testimonials in Strapi
 */
async function main() {
  console.log("=".repeat(60))
  console.log("🎯 LinkedIn Testimonial Scraper for #play14")
  console.log("=".repeat(60))
  console.log()

  // Parse command line arguments
  const args = process.argv.slice(2)
  const options = parseArgs(args)

  // Validate environment variables
  const apifyToken = process.env.APIFY_API_TOKEN
  const strapiUrl = process.env.STRAPI_API_URL
  const strapiSecret = process.env.STRAPI_API_SECRET

  if (!apifyToken) {
    console.error("❌ Error: APIFY_API_TOKEN environment variable is required")
    console.error(
      "   Get your token from: https://console.apify.com/account/integrations",
    )
    process.exit(1)
  }

  if (!strapiUrl || !strapiSecret) {
    console.error(
      "❌ Error: STRAPI_API_URL and STRAPI_API_SECRET environment variables are required",
    )
    process.exit(1)
  }

  try {
    // Initialize services
    const scraper = new LinkedInScraper(apifyToken)
    const testimonialService = new TestimonialService()

    // Show configuration
    console.log("⚙️  Configuration:")
    console.log(`   Hashtag: #${options.hashtag}`)
    console.log(`   Max posts: ${options.maxPosts}`)
    console.log(`   Dry run: ${options.dryRun ? "Yes" : "No"}`)
    console.log()

    // Get actor info (optional, for debugging)
    if (args.includes("--info")) {
      console.log("ℹ️  Fetching Apify actor info...")
      const actorInfo = await scraper.getActorInfo()
      if (actorInfo) {
        console.log(`   Name: ${actorInfo.name}`)
        console.log(`   Description: ${actorInfo.description}`)
        console.log()
      }
    }

    // Step 1: Search LinkedIn posts
    console.log("🔍 Step 1: Searching LinkedIn...")
    const posts = await scraper.searchByHashtag(options)

    if (posts.length === 0) {
      console.log("   ℹ️  No posts found")
      return
    }

    console.log(`   ✅ Found ${posts.length} posts`)
    console.log()

    // Step 2: Process posts and create testimonials
    console.log("📝 Step 2: Processing posts...")
    const results = await testimonialService.processPosts(posts, options.dryRun)

    // Display results
    console.log()
    console.log("=".repeat(60))
    console.log("📊 Results Summary")
    console.log("=".repeat(60))
    console.log(`   Processed: ${results.processed}`)
    console.log(`   Created:   ${results.created}`)
    console.log(`   Skipped:   ${results.skipped}`)
    console.log(`   Errors:    ${results.errors.length}`)

    if (results.errors.length > 0) {
      console.log()
      console.log("❌ Errors:")
      results.errors.forEach((error) => {
        console.log(`   - ${error}`)
      })
    }

    console.log()

    if (options.dryRun) {
      console.log("🧪 This was a dry run. No changes were made to Strapi.")
      console.log("   Run without --dry-run to create testimonials.")
    } else {
      console.log("✅ Done! Testimonials have been added to Strapi.")
    }
  } catch (error) {
    console.error()
    console.error("❌ Fatal error:", error)
    console.error()
    process.exit(1)
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): ScraperOptions {
  const options: ScraperOptions = {
    hashtag: "play14",
    maxPosts: 50,
    dryRun: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    switch (arg) {
      case "--hashtag":
      case "-h":
        options.hashtag = args[++i]?.replace(/^#/, "") || "play14"
        break

      case "--max-posts":
      case "-m":
        options.maxPosts = parseInt(args[++i], 10) || 50
        break

      case "--dry-run":
      case "-d":
        options.dryRun = true
        break

      case "--help":
        showHelp()
        process.exit(0)
        break
    }
  }

  return options
}

/**
 * Show help message
 */
function showHelp() {
  console.log("LinkedIn Testimonial Scraper for #play14")
  console.log()
  console.log("Usage:")
  console.log("  bun run scraper:linkedin [options]")
  console.log()
  console.log("Options:")
  console.log("  --hashtag, -h <tag>      Hashtag to search (default: play14)")
  console.log("  --max-posts, -m <num>    Maximum posts to fetch (default: 50)")
  console.log("  --dry-run, -d            Preview without creating records")
  console.log("  --info                   Show Apify actor information")
  console.log("  --help                   Show this help message")
  console.log()
  console.log("Environment Variables:")
  console.log("  APIFY_API_TOKEN         Your Apify API token (required)")
  console.log("  STRAPI_API_URL          Strapi API base URL (required)")
  console.log("  STRAPI_API_SECRET       Strapi API token (required)")
  console.log()
  console.log("Examples:")
  console.log("  bun run scraper:linkedin --dry-run")
  console.log("  bun run scraper:linkedin --max-posts 100")
  console.log("  bun run scraper:linkedin --hashtag agile --max-posts 20")
  console.log()
}

// Run the CLI
main()
