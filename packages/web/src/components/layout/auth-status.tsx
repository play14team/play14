import Link from "next/link"
import { getAuthState } from "@/libs/auth"
import UserMenu from "./user-menu"

export default async function AuthStatus() {
  const { isAuthenticated, user } = await getAuthState()

  if (isAuthenticated && user) {
    return <UserMenu user={user} />
  }

  return (
    <Link href="/auth/login" className="auth-login-icon" title="Sign In">
      <i className="bx bx-log-in"></i>
    </Link>
  )
}
