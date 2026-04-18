"use client"

import Image from "next/image"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

interface LogoProps {
  width?: number
  height?: number
  className?: string
  priority?: boolean
}

const Logo = ({ width = 180, height = 60, className, priority = false }: LogoProps) => {
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Default to light mode logo during SSR/hydration
  const isDark = mounted && resolvedTheme === "dark"
  const logoSrc = isDark
    ? "/logo/play14_600x200_transparent-dark.png"
    : "/logo/play14_600x200_transparent-light.png"

  const src = mounted ? logoSrc : "/logo/play14_600x200_transparent-light.png"

  return (
    <Image
      src={src}
      alt="play14 logo"
      width={width}
      height={height}
      className={className}
      priority={priority}
      unoptimized
    />
  )
}

export default Logo
