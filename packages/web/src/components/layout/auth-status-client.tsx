"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import Avatar from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useFeatureFlags } from "@/libs/feature-flags"

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

export default function AuthStatusClient() {
  const router = useRouter()
  const t = useTranslations("admin.sidebar")
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const { flags, isLoading: isLoadingFlags } = useFeatureFlags()

  // Fetch user on client side to avoid forcing dynamic rendering on layouts
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user)
        setIsLoadingUser(false)
      })
      .catch(() => {
        setIsLoadingUser(false)
      })
  }, [])

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" })
    setUser(null)
    router.push("/")
    router.refresh()
  }

  // Show nothing while loading user or flags
  if (isLoadingUser || isLoadingFlags) {
    return null
  }

  if (!user) {
    // Only show login button if feature flag is enabled
    if (!flags?.loginEnabled) {
      return null
    }

    return (
      <Link href="/auth/login" className="auth-login-icon" title="Sign In">
        <i className="bx bx-log-in" />
      </Link>
    )
  }

  const playerSlug = user.player?.slug
  const avatarUrl = user.player?.avatar?.url

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="user-menu-trigger">
        <Avatar src={avatarUrl} alt={user.username} fallback={user.username} size="sm" />
        <i className="bx bx-chevron-down ui-dropdown-chevron" />
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
            <i className="bx bx-grid-alt" />
            {t("dashboard")}
          </Link>
        </DropdownMenuItem>

        {playerSlug && (
          <DropdownMenuItem asChild>
            <Link href={`/players/${playerSlug}`}>
              <i className="bx bx-user" />
              {t("myProfile")}
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem destructive onClick={handleSignOut}>
          <i className="bx bx-log-out" />
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
