import type { CSSProperties, FC } from "react"
import { Easing, interpolate, useCurrentFrame } from "remotion"
import { brandColors, fontFamily, fontWeight, neutrals, wordmarkSegments } from "../theme"

export type Play14WordmarkProps = {
  fontSize?: number
  /** Background context — controls the neutral `14` (white on dark, gray on light). */
  onDark?: boolean
  /** Stagger each segment in (opacity + rise + scale). Defaults to `false`. */
  animate?: boolean
  /** Frame the first segment starts on (relative to the enclosing Sequence). */
  delay?: number
  /** Frames between consecutive segments. */
  stagger?: number
  style?: CSSProperties
}

/**
 * The `#play14` wordmark rendered in the brand font with each segment in its
 * brand color (`#` red · `p` orange · `l` yellow · `a` green · `y` blue · `14`
 * neutral). Crisp at any size and animatable, unlike the raster logo assets.
 */
export const Play14Wordmark: FC<Play14WordmarkProps> = ({
  fontSize = 280,
  onDark = true,
  animate = false,
  delay = 0,
  stagger = 5,
  style,
}) => {
  const frame = useCurrentFrame()
  const neutral = onDark ? neutrals.white : brandColors.gray
  const rise = fontSize * 0.22

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        fontFamily,
        fontWeight: fontWeight.bold,
        fontSize,
        lineHeight: 1,
        letterSpacing: "-0.01em",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {wordmarkSegments.map((segment, i) => {
        const start = delay + i * stagger
        const opacity = animate
          ? interpolate(frame, [start, start + 12], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          : 1
        const t = animate
          ? interpolate(frame, [start, start + 16], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            })
          : 1

        return (
          <span
            key={segment.text}
            style={{
              color: segment.color ?? neutral,
              opacity,
              translate: `0 ${(1 - t) * rise}px`,
              scale: 0.85 + t * 0.15,
              display: "inline-block",
            }}
          >
            {segment.text}
          </span>
        )
      })}
    </div>
  )
}
