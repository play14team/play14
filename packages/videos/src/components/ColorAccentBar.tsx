import type { CSSProperties, FC } from "react"
import { Easing, interpolate, useCurrentFrame } from "remotion"
import { brandSpectrum } from "../theme"

export type ColorAccentBarProps = {
  /** Colors, left to right. Defaults to the #play14 vivid spectrum. */
  colors?: readonly string[]
  width?: number | string
  height?: number
  radius?: number
  /** Animate a left-to-right reveal. Defaults to `true`. */
  animate?: boolean
  /** Frame to start the reveal on (relative to the enclosing Sequence). */
  delay?: number
  /** Reveal length in frames. */
  duration?: number
  style?: CSSProperties
}

/**
 * The signature #play14 multi-color stripe. Great as a divider, an underline,
 * or a footer accent. By default it wipes in from left to right.
 */
export const ColorAccentBar: FC<ColorAccentBarProps> = ({
  colors = brandSpectrum,
  width = 600,
  height = 16,
  radius = 999,
  animate = true,
  delay = 0,
  duration = 18,
  style,
}) => {
  const frame = useCurrentFrame()

  const progress = animate
    ? interpolate(frame, [delay, delay + duration], [0, 100], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      })
    : 100

  return (
    <div
      style={{
        display: "flex",
        width,
        height,
        borderRadius: radius,
        overflow: "hidden",
        // Reveal left to right without distorting the segments.
        clipPath: `inset(0 ${100 - progress}% 0 0)`,
        ...style,
      }}
    >
      {colors.map((color, i) => (
        <div key={`${color}-${i}`} style={{ flex: 1, backgroundColor: color, height: "100%" }} />
      ))}
    </div>
  )
}
