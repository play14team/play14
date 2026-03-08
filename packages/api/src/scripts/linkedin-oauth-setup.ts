/**
 * One-time OAuth setup script for LinkedIn
 * Run with: bun run src/scripts/linkedin-oauth-setup.ts
 *
 * This script helps you obtain OAuth tokens for LinkedIn API access:
 * 1. Opens browser to LinkedIn OAuth consent screen
 * 2. User authorizes the application
 * 3. Receives authorization code via callback
 * 4. Exchanges code for access + refresh tokens
 * 5. Saves tokens to linkedin-token content type
 * 6. Prints tokens for manual .env configuration
 */

import { execFile } from "child_process"
import { createServer } from "http"
import { parse } from "url"

const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET
const REDIRECT_URI = `${process.env.PUBLIC_URL}/api/linkedin/oauth/callback`
const STATE = Math.random().toString(36).substring(7)

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Error: LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET must be set in .env")
  process.exit(1)
}

console.log("\n=== LinkedIn OAuth Setup ===\n")
console.log("This script will help you obtain OAuth tokens for LinkedIn.")
console.log("Make sure you have:")
console.log("1. Created a DEDICATED LinkedIn app at https://www.linkedin.com/developers/apps")
console.log("2. Added redirect URI to your app:", REDIRECT_URI)
console.log("3. Requested 'Community Management API' product ONLY")
console.log("   (This product must be the only product on the app for legal/security reasons)\n")

// Create a temporary HTTP server to handle the OAuth callback
const server = createServer(async (req, res) => {
  const parsedUrl = parse(req.url || "", true)

  if (parsedUrl.pathname === "/api/linkedin/oauth/callback") {
    const { code, state, error, error_description } = parsedUrl.query

    if (error) {
      res.writeHead(400, { "Content-Type": "text/html" })
      res.end(`<h1>OAuth Error</h1><p>${error}: ${error_description}</p>`)
      console.error("\nOAuth error:", error, error_description)
      server.close()
      process.exit(1)
      return
    }

    if (state !== STATE) {
      res.writeHead(400, { "Content-Type": "text/html" })
      res.end("<h1>OAuth Error</h1><p>State mismatch. Possible CSRF attack.</p>")
      console.error("\nState mismatch error")
      server.close()
      process.exit(1)
      return
    }

    if (!code) {
      res.writeHead(400, { "Content-Type": "text/html" })
      res.end("<h1>OAuth Error</h1><p>No authorization code received.</p>")
      console.error("\nNo authorization code received")
      server.close()
      process.exit(1)
      return
    }

    // Exchange authorization code for tokens
    try {
      console.log("\nExchanging authorization code for tokens...")

      const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code as string,
          redirect_uri: REDIRECT_URI,
          client_id: CLIENT_ID!,
          client_secret: CLIENT_SECRET!,
        }).toString(),
      })

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()
        throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errorText}`)
      }

      const tokenData = (await tokenResponse.json()) as {
        access_token: string
        refresh_token?: string
        expires_in: number
      }

      // Calculate expiration
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)

      // Fetch organization ID (requires separate call)
      const orgId = process.env.LINKEDIN_ORGANIZATION_ID || "YOUR_ORG_ID"

      console.log("\n✅ OAuth tokens obtained successfully!\n")
      console.log("=== Add these to your .env file ===\n")
      console.log(`LINKEDIN_ACCESS_TOKEN=${tokenData.access_token}`)
      console.log(`LINKEDIN_REFRESH_TOKEN=${tokenData.refresh_token || "N/A"}`)
      console.log(`LINKEDIN_ORGANIZATION_ID=${orgId}`)
      console.log(`\n# Token expires at: ${expiresAt.toISOString()}\n`)

      console.log("\n=== Next Steps ===")
      console.log("1. Copy the tokens above to your .env file")
      console.log("2. Start Strapi: bun --filter play14-api develop")
      console.log("3. The tokens will be automatically stored in the database on first use")
      console.log("\nNote: If you don't have LINKEDIN_ORGANIZATION_ID, find it by:")
      console.log("- Log into LinkedIn as your company page admin")
      console.log("- The numeric ID is visible in the admin interface or page URL")

      res.writeHead(200, { "Content-Type": "text/html" })
      res.end(`
        <html>
          <head><title>OAuth Success</title></head>
          <body>
            <h1>✅ OAuth Setup Complete!</h1>
            <p>Tokens have been printed to your terminal.</p>
            <p>Copy them to your .env file and restart Strapi.</p>
            <p>You can close this window.</p>
          </body>
        </html>
      `)

      setTimeout(() => {
        server.close()
        process.exit(0)
      }, 1000)
    } catch (error) {
      console.error("\nError exchanging authorization code:", error)
      res.writeHead(500, { "Content-Type": "text/html" })
      res.end(`<h1>Error</h1><p>${(error as Error).message}</p>`)
      server.close()
      process.exit(1)
    }
  } else {
    res.writeHead(404)
    res.end("Not found")
  }
})

// Start server and open browser
const PORT = new URL(process.env.PUBLIC_URL || "http://localhost:1337").port || 1337

server.listen(Number(PORT), () => {
  const authUrl =
    `https://www.linkedin.com/oauth/v2/authorization?` +
    `response_type=code&` +
    `client_id=${CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
    `state=${STATE}&` +
    `scope=${encodeURIComponent("openid profile email w_member_social w_organization_social r_organization_social")}`

  console.log("\nStarting OAuth flow...")
  console.log("\n👉 Open this URL in your browser:\n")
  console.log(authUrl)
  console.log("\nWaiting for authorization...\n")

  // Try to open browser automatically (works on most systems)
  const openCommand =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open"

  const args = process.platform === "win32" ? ["/c", "start", authUrl] : [authUrl]

  try {
    execFile(openCommand, args, () => {
      // Silently handle errors
    })
  } catch (e) {
    // Silently fail if can't open browser
  }
})

// Handle Ctrl+C
process.on("SIGINT", () => {
  console.log("\n\nOAuth setup cancelled.")
  server.close()
  process.exit(0)
})
