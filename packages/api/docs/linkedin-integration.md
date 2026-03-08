# LinkedIn Integration

Automated LinkedIn posting for #play14 events using Google Gemini AI for content generation.

## Features

- **Automatic Event Announcements**: Posts when events are published with "Announced" status
- **Scheduled Reminders**: Posts 30 days and 7 days before event start
- **AI-Generated Content**: Uses Google Gemini to create engaging post text
- **Manual Posting**: Admin interface for manual post preview and publishing
- **Audit Trail**: Complete history of all posts in database

## Architecture

### Components

1. **Gemini AI Service** (`src/services/ai/`)
   - Generates engaging post content
   - Fallback templates if AI fails
   - Free tier: 15 RPM, 1M tokens/day

2. **LinkedIn Service** (`src/services/linkedin/`)
   - OAuth token management with auto-refresh
   - Organization page posting
   - Image upload support

3. **Event Lifecycle Hook** (`src/api/event/content-types/event/lifecycles.ts`)
   - Triggers post on event publish
   - Only posts for "Announced" status
   - Prevents duplicate posts

4. **Cron Task** (`src/services/cron/linkedin-posts.ts`)
   - Runs daily at 07:00 UTC
   - Posts reminders for upcoming events
   - Distributed locking for multi-container deployments

5. **Admin Endpoints** (`src/api/linkedin-post/`)
   - `POST /admin/events/:slug/linkedin/preview` - Preview post
   - `POST /admin/events/:slug/linkedin/post` - Manual post

### Content Types

1. **linkedin-post**: Audit trail for all posts
   - event (relation to Event)
   - postType (announcement | reminder30days | reminder7days | manual)
   - content (text)
   - linkedInPostId (string)
   - imageUrl (string)
   - postStatus (draft | published | failed)
   - postedAt (datetime)
   - errorMessage (text)

2. **linkedin-token**: OAuth token storage (single type)
   - accessToken (encrypted text)
   - refreshToken (encrypted text)
   - expiresAt (datetime)
   - organizationId (string)

## Setup Instructions

### Step 1: LinkedIn App Setup

**IMPORTANT**: The Community Management API requires a dedicated LinkedIn application with no other products. If you have existing LinkedIn apps with other products, you must create a new app specifically for this integration.

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Click "Create app"
3. Fill in app details:
   - App name: "#play14 Community Platform - LinkedIn Automation"
   - LinkedIn Page: Select your organization page
   - Privacy policy URL: Your website
   - App logo: Upload #play14 logo
4. Click "Create app"
5. Navigate to "Products" tab
6. Request access to **Community Management API**
   - **Note**: This product requires that it be the ONLY product on the application for legal and security reasons
   - Do NOT request any other products (Share on LinkedIn, Marketing Developer Platform, etc.)
   - If you see an error about other provisioned/pending products, create a new dedicated app
7. Wait for approval (review process varies)
8. Navigate to "Auth" tab
9. Add redirect URI: `${PUBLIC_URL}/api/linkedin/oauth/callback`
   - Example: `https://community.play14.org/api/linkedin/oauth/callback`
10. Copy "Client ID" and "Client Secret" to your `.env` file:
    ```bash
    LINKEDIN_CLIENT_ID=your_client_id
    LINKEDIN_CLIENT_SECRET=your_client_secret
    ```

### Step 2: Get Organization ID

Your organization ID is required to post to your LinkedIn organization page. There are several ways to find it:

**Method 1: From Company Page URL (Easiest)**
1. Log in to LinkedIn as an admin of your organization page
2. Navigate to your company page: `https://www.linkedin.com/company/[your-company]/`
3. The organization ID is the numeric ID visible in the admin interface or URL

**Method 2: Using LinkedIn API**
1. Make an authenticated API request to: `https://api.linkedin.com/rest/organizations`
2. Find your organization in the response and note the numeric ID

**Method 3: From "See all jobs" URL**
1. Go to your LinkedIn company page
2. Click "See all jobs" if you have job postings
3. The URL will contain your organization ID as a numeric value

Once you have your organization ID (numeric format, e.g., `123456789`), add it to `.env`:
```bash
LINKEDIN_ORGANIZATION_ID=123456789
```

### Step 3: OAuth Token Generation

Run the OAuth setup script to obtain access and refresh tokens:

```bash
cd packages/api
bun run src/scripts/linkedin-oauth-setup.ts
```

The script will:
1. Start a local server
2. Open your browser to LinkedIn OAuth consent screen
3. After you authorize, exchange the code for tokens
4. Print tokens to the terminal

Copy the printed tokens to your `.env` file:

```bash
LINKEDIN_ACCESS_TOKEN=your_access_token
LINKEDIN_REFRESH_TOKEN=your_refresh_token
```

### Step 4: Gemini API Setup

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and add to `.env`:
   ```bash
   GEMINI_API_KEY=your_gemini_api_key
   GEMINI_MODEL=gemini-1.5-flash
   ```

**Free Tier**: 15 requests per minute, 1 million tokens per day (plenty for this use case)

### Step 5: Enable Integration

Add to `.env`:

```bash
LINKEDIN_ENABLED=true
```

### Step 6: Start Strapi

```bash
bun --filter play14-api develop
```

Strapi will automatically:
- Create `linkedin_posts` and `linkedin_token` tables
- Store OAuth tokens in database (if set in .env)
- Enable lifecycle hooks and cron tasks

## Usage

### Automatic Posting

**Event Announcement**:
1. Create an event in Strapi admin
2. Set `eventStatus` to "Announced"
3. Publish the event
4. → LinkedIn post is automatically created and posted

**Reminder Posts**:
- Cron job runs daily at 07:00 UTC
- Posts 30-day reminder for events starting in exactly 30 days
- Posts 7-day reminder for events starting in exactly 7 days

### Manual Posting

**Preview a post** (without publishing):

```bash
curl -X POST http://localhost:1337/api/admin/events/luxembourg-01/linkedin/preview \
  -H "Authorization: Bearer <admin-jwt>"
```

**Manually post to LinkedIn**:

```bash
curl -X POST http://localhost:1337/api/admin/events/luxembourg-01/linkedin/post \
  -H "Authorization: Bearer <admin-jwt>"
```

### Viewing Post History

1. Go to Strapi admin
2. Navigate to "LinkedIn Posts" content type
3. View all posts with status, timestamps, and error messages

## Testing

### Test Gemini AI

```bash
# Start Strapi
bun --filter play14-api develop

# In another terminal, test Gemini connection
bun run src/scripts/test-gemini.ts
```

### Test LinkedIn API

1. Use preview endpoint to test content generation
2. Check LinkedIn organization page for published posts
3. View audit trail in Strapi admin

### Test Lifecycle Hook

1. Create a test event
2. Set `eventStatus` to "Announced"
3. Publish the event
4. Check LinkedIn page for new post
5. Verify record in `linkedin_posts` table

### Test Cron Task

```bash
# Manually trigger cron task (requires Strapi running)
bun run src/scripts/test-cron.ts linkedInReminders
```

## Troubleshooting

### "This product cannot be requested because there are currently other provisioned products or other pending product requests"

**Problem**: You're trying to add Community Management API to an existing app that has other LinkedIn products.

**Solution**: Create a new, dedicated LinkedIn application specifically for the Community Management API. This product requires exclusivity for legal and security reasons. You cannot use an existing app that has other products like "Share on LinkedIn" or "Marketing Developer Platform".

### "LinkedIn tokens not configured"

**Solution**: Run the OAuth setup script or manually add tokens to `.env`

### "Gemini API key is required"

**Solution**: Add `GEMINI_API_KEY` to `.env` file

### "LinkedIn posting skipped (LINKEDIN_ENABLED=false)"

**Solution**: Set `LINKEDIN_ENABLED=true` in `.env`

### "Access token expired"

**Solution**: Tokens are automatically refreshed. If refresh fails, re-run OAuth setup script

### "Failed to upload image"

**Possible causes**:
- Image URL not accessible (check CORS)
- Image too large (LinkedIn limit: 8MB)
- Invalid image format

### "No events found for reminder"

Check:
- Event `start` date is exactly 30 or 7 days from now
- Event `eventStatus` is "Announced" or "Open"
- Event is published (not draft)

## Rate Limits

### Gemini API (Free Tier)
- **Rate**: 15 requests/minute, 1M tokens/day
- **Usage**: ~3 requests/day per event (announcement + 2 reminders)
- **Cost**: $0

### LinkedIn API
- **Rate**: 100 UGC posts per user per day
- **Usage**: ~3 posts/day per event
- **Cost**: $0

## Monitoring

### Logs

All LinkedIn activity is logged with the `[LinkedIn]` prefix:

```
[LinkedIn] Creating LinkedIn post
[LinkedIn] Image uploaded successfully
[LinkedIn] LinkedIn post created successfully
```

### Sentry

All errors are automatically reported to Sentry with tags:
- `module: linkedin`
- `event_slug: <slug>`
- `post_type: <type>`

### Audit Trail

All posts are stored in the `linkedin_posts` table with:
- Full post content
- LinkedIn post ID
- Timestamp
- Status (published/failed)
- Error messages (if failed)

## Security

1. **Token Encryption**: LinkedIn tokens are marked as `private` in schema
2. **OAuth State Validation**: CSRF protection in OAuth flow
3. **Permissions**: Only Host+ roles can preview/post manually
4. **Rate Limiting**: Respects both LinkedIn and Gemini rate limits
5. **Error Handling**: Never exposes API keys in error messages

## Future Enhancements

1. **Content Scheduling**: Queue posts for optimal engagement times
2. **A/B Testing**: Generate multiple variants and select best
3. **Engagement Tracking**: Fetch post analytics from LinkedIn
4. **Image Optimization**: Auto-crop/resize event images
5. **Multi-Language**: Generate posts in event location language
6. **Buzz Posts**: Weekly community roundups, milestone celebrations
7. **Admin UI Plugin**: Visual post preview/editor in Strapi admin

## References

- [LinkedIn Marketing API](https://docs.microsoft.com/en-us/linkedin/marketing/)
- [LinkedIn OAuth 2.0](https://docs.microsoft.com/en-us/linkedin/shared/authentication/authentication)
- [Google Gemini API](https://ai.google.dev/docs)
- [Strapi Lifecycle Hooks](https://docs.strapi.io/dev-docs/backend-customization/models#lifecycle-hooks)
