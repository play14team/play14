# LinkedIn Testimonial Scraper

Automatically discovers and imports testimonials from LinkedIn posts mentioning #play14 into the Strapi CMS.

## Overview

This tool uses the [Apify API](https://apify.com) to search LinkedIn for posts containing the #play14 hashtag, extracts testimonial content, and creates corresponding records in Strapi. It also automatically creates or links player profiles based on the post authors.

## Features

- 🔍 **Search LinkedIn** by hashtag (#play14)
- 📊 **Smart content extraction** - removes noise, keeps relevant testimonial text
- 👤 **Player matching** - finds existing players or creates new ones
- 🔗 **LinkedIn profile linking** - adds LinkedIn URLs to player social networks
- ✅ **Duplicate detection** - skips testimonials that already exist
- 🧪 **Dry run mode** - preview without making changes
- 📝 **Detailed logging** - see exactly what's happening

## Prerequisites

1. **Apify Account** (Free tier available)
   - Sign up at https://apify.com
   - Get your API token from https://console.apify.com/account/integrations
   - Free tier includes $5 credit/month (~2,500 posts)

2. **Strapi API Access**
   - API URL (e.g., `https://community.play14.org`)
   - API Secret token with write permissions

## Setup

1. **Install dependencies:**

   ```bash
   bun install
   ```

2. **Configure environment variables:**

   Add to your `.env.local` or `.env`:

   ```bash
   # Apify API (for LinkedIn scraping)
   APIFY_API_TOKEN=your-apify-token-here

   # Strapi API (existing variables)
   STRAPI_API_URL=https://community.play14.org
   STRAPI_API_SECRET=your-strapi-token-here
   ```

## Usage

### Basic Usage

```bash
# Preview what would be created (dry run)
bun run scraper:linkedin --dry-run

# Create testimonials from last 50 posts
bun run scraper:linkedin

# Limit to 20 posts
bun run scraper:linkedin --max-posts 20

# Search a different hashtag
bun run scraper:linkedin --hashtag agile --max-posts 30
```

### CLI Options

```bash
Options:
  --hashtag, -h <tag>      Hashtag to search (default: play14)
  --max-posts, -m <num>    Maximum posts to fetch (default: 50)
  --dry-run, -d            Preview without creating records
  --info                   Show Apify actor information
  --help                   Show help message
```

### Examples

```bash
# Dry run to see what would be imported
bun run scraper:linkedin --dry-run

# Import up to 100 testimonials
bun run scraper:linkedin --max-posts 100

# Check Apify actor status
bun run scraper:linkedin --info

# Search custom hashtag
bun run scraper:linkedin --hashtag play14unconference
```

## How It Works

1. **Search LinkedIn**
   - Uses Apify's LinkedIn Hashtag Posts Scraper
   - Fetches posts containing the specified hashtag
   - Returns post content, author info, URLs, engagement metrics

2. **Validate Content**
   - Checks if post is suitable for testimonial
   - Must mention #play14
   - Must have sufficient content (50+ characters)
   - Filters out promotional/spam content

3. **Extract Testimonial**
   - Cleans formatting and removes LinkedIn markup
   - Extracts most relevant portion (if too long)
   - Prioritizes sentences with testimonial keywords

4. **Match or Create Player**
   - Searches by LinkedIn URL (most reliable)
   - Falls back to name matching
   - Creates new player if not found
   - Adds LinkedIn URL to existing players

5. **Create Testimonial**
   - Creates testimonial record in Strapi
   - Links to player via author relationship
   - Stores source URL for reference

## Data Flow

```
LinkedIn Posts → Apify API → Scraper → Analyzer → Strapi API
                                                      ↓
                                              Testimonials Collection
                                                      ↓
                                              Players Collection
```

## File Structure

```
src/scrapers/
├── linkedin/
│   ├── types.ts          # TypeScript interfaces
│   ├── scraper.ts        # Apify API integration
│   └── analyzer.ts       # Content extraction & validation
├── strapi/
│   ├── types.ts          # Strapi API types
│   ├── client.ts         # Strapi write operations
│   ├── players.ts        # Player matching & creation
│   └── testimonials.ts   # Testimonial processing
├── cli.ts                # Command-line interface
└── README.md             # This file
```

## Strapi Collections

### Testimonials Collection

```typescript
{
  content: string          // Testimonial text
  url: string             // Source LinkedIn post URL
  author: Player          // Relation to Players collection
  audio?: File            // Optional audio testimonial
}
```

### Players Collection

```typescript
{
  name: string
  slug: string            // URL-friendly identifier
  tagline?: string        // LinkedIn headline
  bio?: string           // About/bio text
  location?: string
  avatar?: File
  socialNetworks?: [      // LinkedIn, Twitter, etc.
    { type: string, url: string }
  ]
}
```

## Cost Estimation

Based on Apify's LinkedIn Hashtag Posts Scraper pricing:

- **Free tier:** $5 credit/month (~2,500 posts)
- **Pay-as-you-go:** ~$2 per 1,000 posts
- **Example:** 50 posts = ~$0.10

For monthly imports of 50-100 posts, the free tier is sufficient.

## Limitations

- **LinkedIn access:** Posts must be publicly accessible
- **Rate limits:** Apify enforces rate limiting
- **Content quality:** Some posts may not be suitable testimonials
- **Duplicate detection:** Based on URL only
- **API changes:** LinkedIn and Apify may change their APIs

## Troubleshooting

### Error: APIFY_API_TOKEN not set

```bash
# Solution: Add to .env.local
APIFY_API_TOKEN=your-token-here
```

### Error: No posts found

- Hashtag may not have recent posts
- Try increasing `--max-posts`
- Check hashtag spelling (don't include #)

### Error: Failed to create player

- Check Strapi API permissions
- Ensure STRAPI_API_SECRET has write access
- Verify slug uniqueness

### Error: Apify API 401

- Check APIFY_API_TOKEN is correct
- Verify account has credits available
- Check token hasn't expired

## Best Practices

1. **Start with dry run** - Always test with `--dry-run` first
2. **Regular imports** - Run weekly or monthly for fresh testimonials
3. **Monitor costs** - Check Apify dashboard for usage
4. **Manual review** - Review imported testimonials for quality
5. **Backup data** - Export Strapi data before bulk imports

## Future Enhancements

Potential improvements for future versions:

- [ ] Scheduled automatic runs (cron job)
- [ ] Sentiment analysis for testimonial quality
- [ ] Image extraction from LinkedIn posts
- [ ] Multi-language support
- [ ] Email notifications for new testimonials
- [ ] Webhook integration with Strapi
- [ ] Support for other social platforms (Twitter, etc.)

## Support

For issues or questions:

1. Check the [Apify Documentation](https://docs.apify.com)
2. Review Strapi API logs
3. Check the CLI help: `bun run scraper:linkedin --help`
4. Contact the #play14 development team

## License

Part of the play14-ui project. See repository root for license details.
