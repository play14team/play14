import type { FC } from "react"
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion"
import { BrandBackground, BrandSubtitle, ColorAccentBar, Play14Wordmark } from "./components"
import { safeArea, spacing } from "./theme"

export type BrandIntroProps = {
  /** Supporting line under the wordmark. */
  tagline: string
}

/**
 * Reference #play14 intro card. Demonstrates the brand style end to end:
 * branded background + glows, the animated colored wordmark, a tagline, and the
 * signature color accent bar. Use it as a template for new compositions.
 */
export const BrandIntro: FC<BrandIntroProps> = ({ tagline }) => {
  const frame = useCurrentFrame()

  // Tagline rises and fades in after the wordmark has mostly landed.
  const taglineStart = 28
  const taglineOpacity = interpolate(frame, [taglineStart, taglineStart + 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  const taglineRise = interpolate(frame, [taglineStart, taglineStart + 16], [24, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  })

  return (
    <BrandBackground variant="dark">
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          padding: `${safeArea.y}px ${safeArea.x}px`,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: spacing.lg,
          }}
        >
          <Play14Wordmark animate delay={4} fontSize={300} />
          <BrandSubtitle style={{ opacity: taglineOpacity, translate: `0 ${taglineRise}px` }}>
            {tagline}
          </BrandSubtitle>
          <ColorAccentBar delay={42} width={640} height={18} />
        </div>
      </AbsoluteFill>
    </BrandBackground>
  )
}
