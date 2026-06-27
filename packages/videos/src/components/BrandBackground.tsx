import type { CSSProperties, FC, ReactNode } from "react"
import { AbsoluteFill } from "remotion"
import { brandColors, neutrals } from "../theme"

export type BrandBackgroundVariant = "dark" | "light"

export type BrandBackgroundProps = {
  /** `dark` (default) is the signature #play14 black; `light` is near-white. */
  variant?: BrandBackgroundVariant
  /** Soft brand-colored glows behind the content. Defaults to `true`. */
  glow?: boolean
  children?: ReactNode
  style?: CSSProperties
}

/**
 * Full-frame #play14 background. Use as the base layer of every scene.
 * Decorative glows sit behind the children; readable content goes in `children`.
 */
export const BrandBackground: FC<BrandBackgroundProps> = ({
  variant = "dark",
  glow = true,
  children,
  style,
}) => {
  const isDark = variant === "dark"
  const base = isDark ? neutrals.ink : neutrals.white
  // Glows are stronger on dark, whisper-soft on light.
  const glowAlpha = isDark ? 0.22 : 0.12

  return (
    <AbsoluteFill style={{ backgroundColor: base, ...style }}>
      {glow ? (
        <AbsoluteFill>
          <div
            style={{
              position: "absolute",
              top: "-25%",
              left: "-15%",
              width: "70%",
              height: "70%",
              background: `radial-gradient(circle, ${hexToRgba(brandColors.orange, glowAlpha)} 0%, transparent 65%)`,
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-30%",
              right: "-15%",
              width: "75%",
              height: "75%",
              background: `radial-gradient(circle, ${hexToRgba(brandColors.blue, glowAlpha)} 0%, transparent 65%)`,
            }}
          />
        </AbsoluteFill>
      ) : null}
      {children}
    </AbsoluteFill>
  )
}

/** Convert a `#rrggbb` hex to an `rgba()` string at the given alpha. */
const hexToRgba = (hex: string, alpha: number): string => {
  const value = hex.replace("#", "")
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
