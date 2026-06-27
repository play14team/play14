import type { CSSProperties, FC } from "react"
import { Easing, interpolate, useCurrentFrame } from "remotion"
import { brandColors, brandSpectrum, neutrals } from "../theme"

/**
 * A friendly, gender-neutral SVG person (head + bell torso), in a brand color.
 * Idle bob makes a crowd feel alive. `armRaised` gives a presenter pose.
 */
export const Person: FC<{
  color: string
  size?: number
  armRaised?: boolean
  idle?: boolean
  phase?: number
  style?: CSSProperties
}> = ({ color, size = 120, armRaised = false, idle = true, phase = 0, style }) => {
  const frame = useCurrentFrame()
  const bob = idle ? Math.sin(frame / 17 + phase) * 2.5 : 0
  return (
    <div style={{ width: size, height: size * 1.32, translate: `0 ${bob}px`, ...style }}>
      <svg viewBox="0 0 100 132" width="100%" height="100%" fill="none">
        {armRaised ? (
          <line
            x1="64"
            y1="74"
            x2="88"
            y2="34"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
          />
        ) : null}
        <path d="M26 128C26 70 30 46 50 46s24 24 24 82z" fill={color} />
        <circle cx="50" cy="26" r="17" fill={color} />
      </svg>
    </div>
  )
}

/** A row of people in brand colors at varied heights, gently bobbing. */
export const Crowd: FC<{ count?: number; size?: number; style?: CSSProperties }> = ({
  count = 6,
  size = 150,
  style,
}) => (
  <div style={{ display: "flex", alignItems: "flex-end", gap: size * 0.1, ...style }}>
    {Array.from({ length: count }).map((_, i) => (
      <Person
        key={i}
        color={brandSpectrum[i % brandSpectrum.length]}
        size={size * (i % 2 === 0 ? 1 : 0.86)}
        phase={i * 0.8}
      />
    ))}
  </div>
)

/** A small colored speech/idea bubble that pops in. */
const IdeaBubble: FC<{ color: string; delay: number }> = ({ color, delay }) => {
  const frame = useCurrentFrame()
  const pop = interpolate(frame, [delay, delay + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
  })
  return (
    <div style={{ width: 66, height: 54, scale: String(pop), opacity: pop }}>
      <svg viewBox="0 0 66 54" width="100%" height="100%">
        <rect x="4" y="4" width="58" height="34" rx="11" fill={color} />
        <path d="M24 38v13l15-13z" fill={color} />
      </svg>
    </div>
  )
}

/** A row of people, each popping a colored idea bubble — "everyone's a contributor". */
export const ContributorCrowd: FC = () => (
  <div style={{ display: "flex", alignItems: "flex-end", gap: 26 }}>
    {Array.from({ length: 5 }).map((_, i) => {
      const color = brandSpectrum[i % brandSpectrum.length]
      return (
        <div
          key={i}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
        >
          <IdeaBubble color={color} delay={8 + i * 6} />
          <Person color={color} size={140} phase={i} />
        </div>
      )
    })}
  </div>
)

/** A speech bubble with animated "talking" dots. */
export const SpeechBubble: FC<{ size?: number }> = ({ size = 150 }) => {
  const frame = useCurrentFrame()
  return (
    <div style={{ width: size, height: size * 0.72 }}>
      <svg viewBox="0 0 100 72" width="100%" height="100%">
        <rect x="4" y="4" width="92" height="46" rx="14" fill={neutrals.white} />
        <path d="M22 48v18l18-18z" fill={neutrals.white} />
        {[28, 50, 72].map((cx, i) => {
          const s = (Math.sin(frame / 6 - i * 0.7) + 1) / 2
          return (
            <circle
              key={cx}
              cx={cx}
              cy="27"
              r="6"
              fill={brandColors.gray}
              opacity={0.35 + s * 0.65}
            />
          )
        })}
      </svg>
    </div>
  )
}

/** A presenter pitching at a board to an audience — the marketplace pitch. */
export const PitchScene: FC = () => {
  const frame = useCurrentFrame()
  const presenterIn = interpolate(frame, [4, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  })
  const crowdIn = interpolate(frame, [14, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 130 }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: presenterIn,
          translate: `${(1 - presenterIn) * -40}px 0`,
        }}
      >
        <SpeechBubble size={170} />
        <div style={{ height: 12 }} />
        <Person color={brandColors.orange} size={200} armRaised />
      </div>
      <div style={{ opacity: crowdIn, translate: `${(1 - crowdIn) * 40}px 0` }}>
        <Crowd count={5} size={130} />
      </div>
    </div>
  )
}

/**
 * The "law of two feet": a person walks from one group to another. Two clusters
 * of people, and a single walker that crosses between them, looping.
 */
export const WalkBetweenGroups: FC = () => {
  const frame = useCurrentFrame()
  // Walker eases from left group to right group and the stride bobs.
  const t = (Math.sin(frame / 38) + 1) / 2 // 0..1..0 ping-pong
  const x = interpolate(t, [0, 1], [0, 360])
  const stride = Math.abs(Math.sin(frame / 6)) * 6
  return (
    <div style={{ position: "relative", width: 1100, height: 320 }}>
      <div style={{ position: "absolute", left: 40, bottom: 0 }}>
        <Crowd count={3} size={120} />
      </div>
      <div style={{ position: "absolute", right: 40, bottom: 0 }}>
        <Crowd count={3} size={120} />
      </div>
      <div style={{ position: "absolute", left: 380, bottom: stride, translate: `${x}px 0` }}>
        <Person color={brandColors.red} size={150} idle={false} />
      </div>
    </div>
  )
}
