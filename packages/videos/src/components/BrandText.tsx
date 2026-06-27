import type { CSSProperties, FC, ReactNode } from "react"
import { fontFamily, fontSize, fontWeight, neutrals } from "../theme"

type BrandTextProps = {
  children: ReactNode
  color?: string
  fontSize?: number
  align?: CSSProperties["textAlign"]
  style?: CSSProperties
}

/**
 * Bold headline in the brand font. Sentence case only, per the brand voice
 * (e.g. "Play is the way", not "Play Is The Way").
 */
export const BrandTitle: FC<BrandTextProps> = ({
  children,
  color = neutrals.white,
  fontSize: size = fontSize.title,
  align = "center",
  style,
}) => (
  <div
    style={{
      fontFamily,
      fontWeight: fontWeight.bold,
      fontSize: size,
      lineHeight: 1.05,
      letterSpacing: "-0.015em",
      color,
      textAlign: align,
      margin: 0,
      ...style,
    }}
  >
    {children}
  </div>
)

/** Lighter supporting line — taglines, subheads, captions. */
export const BrandSubtitle: FC<BrandTextProps> = ({
  children,
  color = "rgba(255, 255, 255, 0.82)",
  fontSize: size = fontSize.subtitle,
  align = "center",
  style,
}) => (
  <div
    style={{
      fontFamily,
      fontWeight: fontWeight.medium,
      fontSize: size,
      lineHeight: 1.25,
      letterSpacing: "0.01em",
      color,
      textAlign: align,
      margin: 0,
      ...style,
    }}
  >
    {children}
  </div>
)
