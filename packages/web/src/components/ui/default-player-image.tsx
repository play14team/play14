"use client"

import { useTheme } from "next-themes"
import Image from "next/image"
import { useEffect, useState } from "react"

const LIGHT_SRC = "/default-player.png"
const DARK_SRC = "/default-player-dark.png"

interface DefaultPlayerImageProps {
  width: number
  height: number
  sizes?: string
  className?: string
  style?: React.CSSProperties
  priority?: boolean
  alt?: string
}

export default function DefaultPlayerImage({
  width,
  height,
  sizes,
  className,
  style,
  priority = false,
  alt = "default player image",
}: DefaultPlayerImageProps) {
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === "dark"
  const src = isDark ? DARK_SRC : LIGHT_SRC

  return (
    <Image
      src={mounted ? src : LIGHT_SRC}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      className={className}
      priority={priority}
      unoptimized
      style={style}
    />
  )
}
