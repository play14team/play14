import type { FC, ReactNode } from "react"
import { Easing, interpolate, useCurrentFrame } from "remotion"
import type { IconName } from "../episodes"
import { brandColors, brandSpectrum, fontFamily, fontWeight, neutrals } from "../theme"

/** Entrance pop (bounce) + gentle idle float, applied to an icon wrapper. */
const useIconMotion = (size: number, delay = 4, floatPx = 9) => {
  const frame = useCurrentFrame()
  const appear = interpolate(frame, [delay, delay + 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
  })
  const floatY = Math.sin(frame / 20) * floatPx
  return {
    width: size,
    height: size,
    opacity: appear,
    scale: String(0.5 + appear * 0.5),
    translate: `0 ${floatY}px`,
  }
}

const Svg: FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg viewBox="0 0 100 100" width="100%" height="100%" fill="none">
    {children}
  </svg>
)

const PeopleIcon: FC = () => (
  <Svg>
    <circle cx="28" cy="44" r="10" fill={brandColors.orange} />
    <path d="M12 80a16 16 0 0 1 32 0z" fill={brandColors.orange} />
    <circle cx="72" cy="44" r="10" fill={brandColors.green} />
    <path d="M56 80a16 16 0 0 1 32 0z" fill={brandColors.green} />
    <circle cx="50" cy="38" r="13" fill={brandColors.blue} />
    <path d="M30 82a20 20 0 0 1 40 0z" fill={brandColors.blue} />
  </Svg>
)

const FlagIcon: FC = () => (
  <Svg>
    <line
      x1="30"
      y1="16"
      x2="30"
      y2="88"
      stroke={neutrals.white}
      strokeWidth="6"
      strokeLinecap="round"
    />
    <path d="M30 20h46l-9 13 9 13H30z" fill={brandColors.red} />
  </Svg>
)

const PinIcon: FC = () => (
  <Svg>
    <path
      d="M50 14c-17 0-27 13-27 29 0 21 27 43 27 43s27-22 27-43c0-16-10-29-27-29z"
      fill={brandColors.red}
    />
    <circle cx="50" cy="42" r="11" fill={neutrals.white} />
  </Svg>
)

const SparkleIcon: FC = () => (
  <Svg>
    <path d="M50 10l9 31 31 9-31 9-9 31-9-31-31-9 31-9z" fill={brandColors.yellow} />
    <circle cx="82" cy="20" r="5" fill={brandColors.orange} />
    <circle cx="18" cy="80" r="4" fill={brandColors.blue} />
  </Svg>
)

const SunIcon: FC = () => {
  const frame = useCurrentFrame()
  const spin = `${frame * 0.4}deg`
  return (
    <div style={{ width: "100%", height: "100%", rotate: spin }}>
      <Svg>
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * Math.PI) / 4
          return (
            <line
              key={i}
              x1={50 + Math.cos(a) * 26}
              y1={50 + Math.sin(a) * 26}
              x2={50 + Math.cos(a) * 38}
              y2={50 + Math.sin(a) * 38}
              stroke={brandColors.orange}
              strokeWidth="6"
              strokeLinecap="round"
            />
          )
        })}
        <circle cx="50" cy="50" r="18" fill={brandColors.yellow} />
      </Svg>
    </div>
  )
}

const FeetIcon: FC = () => {
  const frame = useCurrentFrame()
  const foot = (cx: number, color: string, phase: number) => {
    const bob = Math.sin(frame / 9 + phase) * 7
    return (
      <g style={{ translate: `0 ${bob}px` }}>
        <ellipse cx={cx} cy="46" rx="12" ry="18" fill={color} />
        <ellipse cx={cx} cy="72" rx="9" ry="8" fill={color} />
      </g>
    )
  }
  return (
    <Svg>
      {foot(34, brandColors.blue, 0)}
      {foot(66, brandColors.green, Math.PI)}
    </Svg>
  )
}

const CalendarXIcon: FC = () => {
  const frame = useCurrentFrame()
  const draw = interpolate(frame, [14, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  return (
    <Svg>
      <rect x="18" y="26" width="64" height="56" rx="8" stroke={neutrals.white} strokeWidth="5" />
      <line x1="18" y1="42" x2="82" y2="42" stroke={neutrals.white} strokeWidth="5" />
      <line
        x1="34"
        y1="18"
        x2="34"
        y2="30"
        stroke={neutrals.white}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <line
        x1="66"
        y1="18"
        x2="66"
        y2="30"
        stroke={neutrals.white}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <line
        x1="34"
        y1="54"
        x2="66"
        y2="74"
        stroke={brandColors.red}
        strokeWidth="7"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - draw}
      />
      <line
        x1="66"
        y1="54"
        x2="34"
        y2="74"
        stroke={brandColors.red}
        strokeWidth="7"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - draw}
      />
    </Svg>
  )
}

const QuestionIcon: FC = () => {
  const frame = useCurrentFrame()
  return (
    <Svg>
      <text
        x="38"
        y="66"
        textAnchor="middle"
        fill={brandColors.blue}
        fontFamily="DIN Alternate"
        fontWeight={700}
        fontSize="58"
        style={{ translate: `0 ${Math.sin(frame / 16) * 4}px` }}
      >
        ?
      </text>
      <text
        x="68"
        y="48"
        textAnchor="middle"
        fill={brandColors.orange}
        fontFamily="DIN Alternate"
        fontWeight={700}
        fontSize="38"
        style={{ translate: `0 ${Math.sin(frame / 16 + 1.6) * 4}px` }}
      >
        ?
      </text>
    </Svg>
  )
}

const GiftIcon: FC = () => (
  <Svg>
    <rect x="24" y="46" width="52" height="36" rx="5" fill={brandColors.green} />
    <rect x="20" y="34" width="60" height="14" rx="4" fill={brandColors.blue} />
    <rect x="44" y="34" width="12" height="48" fill={brandColors.red} />
    <path d="M50 34c-12-16-26-2-0 0 26-2 12-16 0 0z" fill={brandColors.red} />
  </Svg>
)

const StickyIcon: FC = () => (
  <Svg>
    <g style={{ rotate: "-5deg", transformOrigin: "50px 50px" }}>
      <rect x="24" y="22" width="52" height="56" rx="4" fill={brandColors.yellow} />
      <line
        x1="33"
        y1="38"
        x2="67"
        y2="38"
        stroke={neutrals.ink}
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.75"
      />
      <line
        x1="33"
        y1="50"
        x2="67"
        y2="50"
        stroke={neutrals.ink}
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.55"
      />
      <line
        x1="33"
        y1="62"
        x2="55"
        y2="62"
        stroke={neutrals.ink}
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.55"
      />
    </g>
  </Svg>
)

const ICONS: Record<IconName, FC> = {
  people: PeopleIcon,
  flag: FlagIcon,
  pin: PinIcon,
  sparkle: SparkleIcon,
  sun: SunIcon,
  feet: FeetIcon,
  "calendar-x": CalendarXIcon,
  question: QuestionIcon,
  gift: GiftIcon,
  sticky: StickyIcon,
}

/** A brand-style animated concept icon (entrance pop + idle float). */
export const ConceptIcon: FC<{ name: IconName; size?: number; delay?: number }> = ({
  name,
  size = 170,
  delay = 4,
}) => {
  const Icon = ICONS[name]
  return (
    <div style={useIconMotion(size, delay)}>
      <Icon />
    </div>
  )
}

/** Three space options (open floor / tables / projector) — for "wherever it is". */
export const SpaceOptions: FC = () => {
  const frame = useCurrentFrame()
  const chips: { label: string; color: string; glyph: ReactNode }[] = [
    {
      label: "open floor",
      color: brandColors.red,
      glyph: <circle cx="40" cy="38" r="9" fill={brandColors.red} />,
    },
    {
      label: "tables",
      color: brandColors.green,
      glyph: (
        <>
          <rect x="18" y="28" width="18" height="16" rx="3" fill={brandColors.green} />
          <rect x="44" y="28" width="18" height="16" rx="3" fill={brandColors.green} />
        </>
      ),
    },
    {
      label: "projector",
      color: brandColors.blue,
      glyph: (
        <>
          <rect x="18" y="20" width="44" height="7" rx="3" fill={brandColors.blue} />
          <path d="M40 27 26 52 54 52z" fill={brandColors.blue} opacity="0.45" />
        </>
      ),
    },
  ]
  return (
    <div style={{ display: "flex", gap: 28 }}>
      {chips.map((c, i) => {
        const pop = interpolate(frame, [6 + i * 6, 22 + i * 6], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.34, 1.56, 0.64, 1),
        })
        const floatY = Math.sin(frame / 18 + i) * 5
        return (
          <div
            key={c.label}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              scale: String(pop),
              opacity: pop,
              translate: `0 ${floatY}px`,
            }}
          >
            <div
              style={{
                width: 168,
                height: 124,
                borderRadius: 16,
                border: `3px solid ${c.color}`,
                background: "rgba(255,255,255,0.04)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg viewBox="0 0 80 70" width="100" height="88" fill="none">
                {c.glyph}
              </svg>
            </div>
            <div
              style={{
                fontFamily,
                fontWeight: fontWeight.medium,
                fontSize: 26,
                color: "rgba(255,255,255,0.75)",
              }}
            >
              {c.label}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** A bumblebee that buzzes side to side with flapping wings. */
export const Bee: FC<{ size?: number }> = ({ size = 200 }) => {
  const frame = useCurrentFrame()
  const buzzX = Math.sin(frame / 14) * 26
  const buzzY = Math.sin(frame / 9) * 8
  const tilt = `${Math.sin(frame / 14) * 10}deg`
  const wing = 0.55 + Math.abs(Math.sin(frame / 2)) * 0.45
  return (
    <div style={{ width: size, height: size, translate: `${buzzX}px ${buzzY}px`, rotate: tilt }}>
      <Svg>
        <g style={{ scale: `1 ${wing}`, transformOrigin: "50px 40px" }}>
          <ellipse
            cx="36"
            cy="38"
            rx="16"
            ry="11"
            fill={neutrals.white}
            stroke={neutrals.ink}
            strokeWidth="2.5"
          />
          <ellipse
            cx="64"
            cy="38"
            rx="16"
            ry="11"
            fill={neutrals.white}
            stroke={neutrals.ink}
            strokeWidth="2.5"
          />
        </g>
        <ellipse
          cx="50"
          cy="58"
          rx="20"
          ry="16"
          fill={brandColors.yellow}
          stroke={neutrals.ink}
          strokeWidth="3"
        />
        <path
          d="M44 44v28M52 43v30M60 47v22"
          stroke={neutrals.ink}
          strokeWidth="5"
          strokeLinecap="round"
        />
        <line
          x1="44"
          y1="30"
          x2="40"
          y2="18"
          stroke={neutrals.ink}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <line
          x1="56"
          y1="30"
          x2="60"
          y2="18"
          stroke={neutrals.ink}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="40" cy="17" r="2.5" fill={neutrals.ink} />
        <circle cx="60" cy="17" r="2.5" fill={neutrals.ink} />
      </Svg>
    </div>
  )
}

/** A butterfly that floats up and down with flapping wings. */
export const Butterfly: FC<{ size?: number }> = ({ size = 200 }) => {
  const frame = useCurrentFrame()
  const floatY = Math.sin(frame / 16) * 16
  const flap = 0.6 + Math.abs(Math.sin(frame / 4)) * 0.4
  return (
    <div style={{ width: size, height: size, translate: `0 ${floatY}px` }}>
      <Svg>
        <g style={{ scale: `${flap} 1`, transformOrigin: "50px 50px" }}>
          <ellipse cx="32" cy="38" rx="17" ry="15" fill={brandColors.blue} />
          <ellipse cx="35" cy="64" rx="13" ry="13" fill={brandColors.green} />
          <ellipse cx="68" cy="38" rx="17" ry="15" fill={brandColors.blue} />
          <ellipse cx="65" cy="64" rx="13" ry="13" fill={brandColors.green} />
        </g>
        <rect x="48" y="34" width="4" height="38" rx="2" fill={neutrals.ink} />
        <line
          x1="50"
          y1="34"
          x2="42"
          y2="22"
          stroke={neutrals.ink}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <line
          x1="50"
          y1="34"
          x2="58"
          y2="22"
          stroke={neutrals.ink}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </Svg>
    </div>
  )
}

const PARTICLES = Array.from({ length: 18 }).map((_, i) => ({
  x: (i * 53) % 100,
  size: 6 + (i % 4) * 4,
  color: brandSpectrum[i % brandSpectrum.length],
  speed: 0.04 + (i % 5) * 0.012,
  phase: (i % 7) * 1.3,
}))

/** Subtle drifting brand-colored dots, sit behind scene content. */
export const FloatingParticles: FC = () => {
  const frame = useCurrentFrame()
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {PARTICLES.map((p, i) => {
        const y = (110 - ((frame * p.speed + p.phase * 10) % 120)) % 120
        const opacity = 0.12 + Math.abs(Math.sin(frame / 40 + p.phase)) * 0.16
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${y}%`,
              width: p.size,
              height: p.size,
              borderRadius: 999,
              backgroundColor: p.color,
              opacity,
            }}
          />
        )
      })}
    </div>
  )
}
