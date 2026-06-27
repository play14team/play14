import { Video } from "@remotion/media"
import type { CSSProperties, FC } from "react"
import { Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion"
import { fontFamily, fontWeight, neutrals } from "../theme"

export type BrandMediaItem = {
  src: string
  loc?: string
  year?: string
  orientation?: string
}

/** Slow Ken Burns move applied to the media inside the frame. */
export type MediaMotion = "zoom-in" | "zoom-out" | "pan-left" | "pan-right"

export type BrandMediaProps = {
  item: BrandMediaItem
  kind?: "photo" | "clip"
  width: number | string
  height: number | string
  /** Brand color (hex) for the border + glow + credit dot. */
  accent?: string
  radius?: number
  motion?: MediaMotion
  /** Used to pace the Ken Burns move across the scene. */
  durationInFrames?: number
  /** Frame the card fades/scales in on (relative to the enclosing Sequence). */
  appearAt?: number
  showCredit?: boolean
  creditDelay?: number
  borderWidth?: number
  style?: CSSProperties
}

const EASE = Easing.bezier(0.16, 1, 0.3, 1)

const hexToRgba = (hex: string, alpha: number): string => {
  const v = hex.replace("#", "")
  const r = parseInt(v.slice(0, 2), 16)
  const g = parseInt(v.slice(2, 4), 16)
  const b = parseInt(v.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * A real #play14 photo or clip, framed in the brand style: a rounded card with
 * a colored border + soft glow, a slow Ken Burns drift, a bottom scrim, and a
 * location · year credit. Makes documentary media read as intentional, not
 * pasted in. Source is cover-cropped so any aspect ratio fills the card.
 */
export const BrandMedia: FC<BrandMediaProps> = ({
  item,
  kind = "photo",
  width,
  height,
  accent = neutrals.white,
  radius = 28,
  motion = "zoom-in",
  durationInFrames = 150,
  appearAt = 0,
  showCredit = true,
  creditDelay = 10,
  borderWidth = 2,
  style,
}) => {
  const frame = useCurrentFrame()

  const intro = interpolate(frame, [appearAt, appearAt + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  })

  const p = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  let scale = 1
  let tx = 0
  if (motion === "zoom-in") scale = 1.06 + p * 0.12
  else if (motion === "zoom-out") scale = 1.18 - p * 0.12
  else if (motion === "pan-left") {
    scale = 1.16
    tx = interpolate(p, [0, 1], [4, -4])
  } else {
    scale = 1.16
    tx = interpolate(p, [0, 1], [-4, 4])
  }

  const mediaStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transformOrigin: "center center",
    transform: `scale(${scale}) translateX(${tx}%)`,
  }

  const credit = interpolate(frame, [appearAt + creditDelay, appearAt + creditDelay + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  })

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        borderRadius: radius,
        overflow: "hidden",
        backgroundColor: neutrals.black,
        border: `${borderWidth}px solid ${hexToRgba(accent, 0.55)}`,
        boxShadow: `0 28px 80px rgba(0,0,0,0.5), 0 14px 50px ${hexToRgba(accent, 0.26)}`,
        opacity: intro,
        scale: String(0.97 + intro * 0.03),
        translate: `0 ${(1 - intro) * 18}px`,
        ...style,
      }}
    >
      {kind === "clip" ? (
        <Video src={staticFile(item.src)} muted loop style={mediaStyle} />
      ) : (
        <Img src={staticFile(item.src)} style={mediaStyle} />
      )}

      {/* bottom scrim for credit legibility */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "38%",
          background: "linear-gradient(to top, rgba(0,0,0,0.62), transparent)",
        }}
      />
      {/* brand accent bar along the bottom edge */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 6,
          backgroundColor: accent,
        }}
      />

      {showCredit && (item.loc || item.year) ? (
        <div
          style={{
            position: "absolute",
            left: 22,
            bottom: 22,
            display: "flex",
            alignItems: "center",
            gap: 12,
            opacity: credit,
            fontFamily,
            fontWeight: fontWeight.bold,
            fontSize: 26,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: neutrals.white,
            textShadow: "0 2px 8px rgba(0,0,0,0.6)",
          }}
        >
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              backgroundColor: accent,
              display: "inline-block",
            }}
          />
          {[item.loc, item.year].filter(Boolean).join(" · ")}
        </div>
      ) : null}
    </div>
  )
}
