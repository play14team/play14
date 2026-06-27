import type { CSSProperties, FC, ReactNode } from "react"
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion"
import { safeArea } from "../theme"

const FADE = 9

export type SceneShellProps = {
  /** Scene length in frames — used to fade the content out at the end. */
  durationInFrames: number
  children: ReactNode
  style?: CSSProperties
}

/**
 * Wraps a scene's content: centers it within the safe area and cross-fades it
 * in and out. The background lives behind all scenes (in {@link Explainer}),
 * so only the content fades — the brand backdrop stays continuous.
 */
export const SceneShell: FC<SceneShellProps> = ({ durationInFrames, children, style }) => {
  const frame = useCurrentFrame()
  const opacity = interpolate(
    frame,
    [0, FADE, durationInFrames - FADE, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  )

  return (
    <AbsoluteFill
      style={{
        opacity,
        alignItems: "center",
        justifyContent: "center",
        padding: `${safeArea.y}px ${safeArea.x}px`,
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  )
}
