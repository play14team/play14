"use client"

import Avatar from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { StrapiUser } from "@/libs/auth"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface UserMenuProps {
  user: StrapiUser
}

export default function UserMenu({ user }: UserMenuProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    // Call signout endpoint
    await fetch("/api/auth/signout", { method: "POST" })
    router.push("/")
    router.refresh()
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
            Admin Dashboard
          </Link>
        </DropdownMenuItem>

        {playerSlug && (
          <DropdownMenuItem asChild>
            <Link href={`/players/${playerSlug}`}>
              <i className="bx bx-user" />
              My Profile
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem destructive onClick={handleSignOut}>
          <i className="bx bx-log-out" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
