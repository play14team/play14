"use client"

import * as AvatarPrimitive from "@radix-ui/react-avatar"
import clsx from "clsx"

interface AvatarProps {
  src?: string | null
  alt?: string
  fallback?: string
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  className?: string
}

/**
 * Get initials from a name (up to 2 characters)
 */
function getInitials(name?: string): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export default function Avatar({ src, alt, fallback, size = "md", className }: AvatarProps) {
  const initials = getInitials(fallback || alt)

  return (
    <AvatarPrimitive.Root className={clsx("ui-avatar", `ui-avatar-${size}`, className)}>
      {src && <AvatarPrimitive.Image className="ui-avatar-image" src={src} alt={alt || ""} />}
      <AvatarPrimitive.Fallback className="ui-avatar-fallback" delayMs={600}>
        {initials}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
}
