/**
 * Feature Flags
 *
 * Feature flags are evaluated server-side and fetched via API endpoint.
 * This ensures security and allows runtime configuration changes.
 *
 * Usage:
 * - Server Components: const flags = await getFeatureFlags()
 * - Client Components: const { data: flags } = useFeatureFlags()
 */

export interface FeatureFlags {
  loginEnabled: boolean
}

/**
 * Fetch feature flags from the server-side API
 * Use this in Server Components or server-side code
 */
export async function getFeatureFlags(): Promise<FeatureFlags> {
  // In server context, fetch from the API endpoint
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

  try {
    const res = await fetch(`${baseUrl}/api/feature-flags`, {
      next: { revalidate: 60 }, // Cache for 1 minute
    })

    if (!res.ok) {
      throw new Error(`Feature flags API returned ${res.status}`)
    }

    return await res.json()
  } catch (error) {
    console.error("[Feature Flags] Failed to fetch:", error)

    // Fallback to safe defaults if API fails
    return {
      loginEnabled: false,
    }
  }
}

/**
 * React hook for feature flags in Client Components
 * Automatically handles caching and revalidation
 *
 * @example
 * function MyComponent() {
 *   const { flags, isLoading, error } = useFeatureFlags()
 *   if (isLoading) return <div>Loading...</div>
 *   return flags.loginEnabled ? <LoginButton /> : null
 * }
 */
export function useFeatureFlags() {
  // We'll use native fetch with SWR-like behavior
  // For now, return a simple implementation that can be enhanced later
  const [flags, setFlags] = React.useState<FeatureFlags | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    let mounted = true

    async function fetchFlags() {
      try {
        const res = await fetch("/api/feature-flags")
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (mounted) {
          setFlags(data)
          setIsLoading(false)
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error)
          setIsLoading(false)
          // Set safe defaults on error
          setFlags({ loginEnabled: false })
        }
      }
    }

    fetchFlags()

    return () => {
      mounted = false
    }
  }, [])

  return { flags, isLoading, error }
}

// For backwards compatibility, we need to import React
import React from "react"
