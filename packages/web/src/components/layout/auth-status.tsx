import { getAuthState } from "@/libs/auth"
import { getFeatureFlags } from "@/libs/feature-flags"
import Link from "next/link"
import UserMenu from "./user-menu"

export default async function AuthStatus() {
  const { isAuthenticated, user } = await getAuthState()

  if (isAuthenticated && user) {
    return <UserMenu user={user} />
  }

  // Only show login button if feature flag is enabled
  const flags = await getFeatureFlags()
  if (!flags.loginEnabled) {
    return null
  }

  return (
    <Link href="/auth/login" className="auth-login-icon" title="Sign In">
      <i className="bx bx-log-in" />
    </Link>
  )
}
