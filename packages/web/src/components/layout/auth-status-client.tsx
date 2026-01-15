"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import Avatar from "@/components/ui/avatar"
import { useFeatureFlags } from "@/libs/feature-flags"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface AuthUser {
  id: number
  username: string
  email: string
  player?: {
    slug: string
    avatar?: {
      url: string
    }
  }
}

interface AuthStatusClientProps {
  initialUser: AuthUser | null
}

export default function AuthStatusClient({
  initialUser,
}: AuthStatusClientProps) {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(initialUser)
  const { flags, isLoading } = useFeatureFlags()

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" })
    setUser(null)
    router.push("/")
    router.refresh()
  }

  if (!user) {
    // Only show login button if feature flag is enabled
    // Show nothing while loading flags to avoid flash of login button
    if (isLoading || !flags?.loginEnabled) {
      return null
    }

    return (
      <Link href="/auth/login" className="auth-login-icon" title="Sign In">
        <i className="bx bx-log-in"></i>
      </Link>
    )
  }

  const playerSlug = user.player?.slug
  const avatarUrl = user.player?.avatar?.url

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="user-menu-trigger">
        <Avatar
          src={avatarUrl}
          alt={user.username}
          fallback={user.username}
          size="sm"
        />
        <i className="bx bx-chevron-down ui-dropdown-chevron"></i>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <div className="user-menu-info">
            <span className="user-menu-name">{user.username}</span>
            <span className="user-menu-email">{user.email}</span>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/admin">
            <i className="bx bx-grid-alt"></i>
            Admin Dashboard
          </Link>
        </DropdownMenuItem>

        {playerSlug && (
          <DropdownMenuItem asChild>
            <Link href={`/players/${playerSlug}`}>
              <i className="bx bx-user"></i>
              My Profile
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem destructive onClick={handleSignOut}>
          <i className="bx bx-log-out"></i>
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
