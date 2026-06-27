import type { CSSProperties, FC, ReactNode } from "react"
import { Easing, interpolate, useCurrentFrame } from "remotion"
import type { BoardMode } from "../episodes"
import { brandColors, brandSpectrum, fontFamily, fontWeight, neutrals } from "../theme"

// Playful, theme-neutral space names — events name spaces however they like.
const SPACES = ["Treehouse", "Workshop", "The stage", "Garden"]
const SLOTS = ["09:30", "11:00", "13:30", "15:00", "16:30"]

type Placed = { row: number; col: number; color: number; to?: { row: number; col: number } }
const STICKIES: Placed[] = [
  { row: 0, col: 0, color: 0 },
  { row: 1, col: 1, color: 3, to: { row: 3, col: 1 } },
  { row: 0, col: 2, color: 2 },
  { row: 2, col: 0, color: 4 },
  { row: 3, col: 3, color: 1, to: { row: 1, col: 3 } },
  { row: 2, col: 4, color: 0 },
  { row: 1, col: 4, color: 3 },
]

const COL0 = 200
const CELL_W = 240
const HEAD_H = 70
const ROW_H = 116
const GAP = 12

const StickyCard: FC<{ color: string; style?: CSSProperties; faded?: boolean }> = ({
  color,
  style,
  faded,
}) => (
  <div
    style={{
      width: CELL_W - GAP,
      height: ROW_H - GAP,
      borderRadius: 12,
      backgroundColor: color,
      boxShadow: "0 10px 26px rgba(0,0,0,0.35)",
      padding: 16,
      opacity: faded ? 0.28 : 1,
      ...style,
    }}
  >
    <div style={{ height: 8, width: "70%", borderRadius: 99, background: "rgba(0,0,0,0.32)" }} />
    <div
      style={{
        height: 8,
        width: "45%",
        borderRadius: 99,
        background: "rgba(0,0,0,0.22)",
        marginTop: 10,
      }}
    />
  </div>
)

/**
 * The marketplace board: spaces (rows) × time slots (columns) with game
 * stickies. `mode` highlights the spaces or the time slots, drops a new sticky
 * in ("place"), or shuffles stickies to new cells ("reorganize").
 */
export const MarketplaceBoard: FC<{ mode: BoardMode }> = ({ mode }) => {
  const frame = useCurrentFrame()
  const enter = interpolate(frame, [0, 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  })
  const pulse = 1 + Math.sin(frame / 12) * 0.04

  const cellX = (col: number) => COL0 + col * CELL_W + GAP / 2
  const cellY = (row: number) => HEAD_H + row * ROW_H + GAP / 2

  const spacesActive = mode === "spaces"
  const slotsActive = mode === "timeslots"
  const dimGrid = spacesActive || slotsActive

  return (
    <div
      style={{
        position: "relative",
        width: COL0 + SLOTS.length * CELL_W,
        height: HEAD_H + SPACES.length * ROW_H,
        opacity: enter,
        scale: String(0.95 + enter * 0.05),
      }}
    >
      {/* time slot headers (columns) */}
      {SLOTS.map((slot, c) => (
        <div
          key={slot}
          style={{
            position: "absolute",
            left: cellX(c),
            top: 0,
            width: CELL_W - GAP,
            height: HEAD_H - GAP,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily,
            fontWeight: fontWeight.bold,
            fontSize: 34,
            color: slotsActive ? brandColors.yellow : "rgba(255,255,255,0.7)",
            opacity: spacesActive ? 0.3 : 1,
            scale: slotsActive ? String(pulse) : "1",
          }}
        >
          {slot}
        </div>
      ))}

      {/* space labels (rows) */}
      {SPACES.map((space, r) => (
        <div
          key={space}
          style={{
            position: "absolute",
            left: 0,
            top: cellY(r),
            width: COL0 - GAP,
            height: ROW_H - GAP,
            display: "flex",
            alignItems: "center",
            fontFamily,
            fontWeight: fontWeight.bold,
            fontSize: 30,
            color: spacesActive ? brandSpectrum[r % brandSpectrum.length] : "rgba(255,255,255,0.7)",
            opacity: slotsActive ? 0.3 : 1,
            scale: spacesActive ? String(pulse) : "1",
            transformOrigin: "left center",
          }}
        >
          {space}
        </div>
      ))}

      {/* grid cells */}
      {SPACES.map((space, r) =>
        SLOTS.map((slot, c) => (
          <div
            key={`${space}-${slot}`}
            style={{
              position: "absolute",
              left: cellX(c),
              top: cellY(r),
              width: CELL_W - GAP,
              height: ROW_H - GAP,
              borderRadius: 12,
              border: "2px solid rgba(255,255,255,0.1)",
              opacity: dimGrid ? 0.5 : 1,
            }}
          />
        ))
      )}

      {/* placed stickies */}
      {STICKIES.map((s, i) => {
        const popAt = mode === "overview" ? 10 + i * 5 : 0
        const pop = interpolate(frame, [popAt, popAt + 12], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.34, 1.56, 0.64, 1),
        })
        // reorganize: move stickies that have a `to` target
        let row = s.row
        let col = s.col
        if (mode === "reorganize" && s.to) {
          const move = interpolate(frame, [20, 50], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.65, 0, 0.35, 1),
          })
          row = s.row + (s.to.row - s.row) * move
          col = s.col + (s.to.col - s.col) * move
        }
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: cellX(col),
              top: cellY(row),
              scale: String(pop),
              opacity: pop,
            }}
          >
            <StickyCard color={brandSpectrum[s.color]} faded={dimGrid} />
          </div>
        )
      })}

      {/* place mode: a fresh sticky flies into an empty cell */}
      {mode === "place"
        ? (() => {
            const t = interpolate(frame, [10, 40], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            })
            const targetX = cellX(3)
            const targetY = cellY(0)
            const x = interpolate(t, [0, 1], [targetX + 520, targetX])
            const y = interpolate(t, [0, 1], [targetY + 420, targetY])
            const rot = interpolate(t, [0, 1], [12, 0])
            return (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  translate: `${x}px ${y}px`,
                  rotate: `${rot}deg`,
                }}
              >
                <StickyCard color={brandColors.yellow} />
              </div>
            )
          })()
        : null}
    </div>
  )
}

const Badge: FC<{ children: ReactNode; show: number; frame: number }> = ({
  children,
  show,
  frame,
}) => {
  const pop = interpolate(frame, [show, show + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
  })
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 18px",
        borderRadius: 999,
        background: "rgba(0,0,0,0.12)",
        fontFamily,
        fontWeight: fontWeight.bold,
        fontSize: 30,
        color: neutrals.ink,
        scale: String(pop),
        opacity: pop,
      }}
    >
      {children}
    </div>
  )
}

/** An empty day schedule with a big "?" — "a conference with no agenda?". */
export const EmptyAgenda: FC = () => {
  const frame = useCurrentFrame()
  const enter = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  })
  const qPulse = 1 + Math.sin(frame / 11) * 0.06
  const times = ["09:00", "10:30", "12:00", "14:00", "15:30"]
  return (
    <div
      style={{
        position: "relative",
        width: 640,
        opacity: enter,
        scale: String(0.94 + enter * 0.06),
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 20,
          padding: 40,
          borderRadius: 18,
          border: "2px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        {times.map((t, i) => {
          const rowIn = interpolate(frame, [8 + i * 5, 22 + i * 5], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
          return (
            <div
              key={t}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 26,
                opacity: rowIn,
                translate: `${(1 - rowIn) * -20}px 0`,
              }}
            >
              <div
                style={{
                  fontFamily,
                  fontWeight: fontWeight.bold,
                  fontSize: 30,
                  color: "rgba(255,255,255,0.4)",
                  width: 120,
                }}
              >
                {t}
              </div>
              <div
                style={{
                  flex: 1,
                  height: 12,
                  borderRadius: 99,
                  background: "rgba(255,255,255,0.08)",
                }}
              />
            </div>
          )
        })}
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontFamily,
            fontWeight: fontWeight.bold,
            fontSize: 240,
            color: brandColors.orange,
            scale: String(qPulse),
            textShadow: "0 12px 50px rgba(0,0,0,0.55)",
          }}
        >
          ?
        </div>
      </div>
    </div>
  )
}

/** A large sticky note being filled in, step by step (the propose-a-game comic). */
export const WriteStickyScene: FC = () => {
  const frame = useCurrentFrame()
  const inSticky = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
  })
  const stem = interpolate(frame, [14, 28], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  const bloom = interpolate(frame, [24, 38], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
  })
  const words = ["My", "awesome", "game"]

  return (
    <div
      style={{
        width: 920,
        height: 560,
        background: brandColors.yellow,
        borderRadius: 16,
        rotate: "-3deg",
        boxShadow: "0 40px 90px rgba(0,0,0,0.5)",
        padding: 56,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 48,
        scale: String(0.6 + inSticky * 0.4),
        opacity: inSticky,
      }}
    >
      {/* flower drawing (left) */}
      <div style={{ flexShrink: 0, width: 220, display: "flex", justifyContent: "center" }}>
        <svg viewBox="0 0 120 200" width="190" height="316" fill="none">
          <line
            x1="60"
            y1="190"
            x2="60"
            y2="92"
            stroke={brandColors.green}
            strokeWidth="7"
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - stem}
          />
          <ellipse
            cx="42"
            cy="150"
            rx="16"
            ry="9"
            fill={brandColors.green}
            opacity={stem}
            transform="rotate(-25 42 150)"
          />
          <g style={{ scale: String(bloom), transformOrigin: "60px 70px" }}>
            {Array.from({ length: 6 }).map((_, i) => {
              const a = (i * Math.PI) / 3
              return (
                <circle
                  key={i}
                  cx={60 + Math.cos(a) * 22}
                  cy={70 + Math.sin(a) * 22}
                  r="15"
                  fill={brandColors.red}
                />
              )
            })}
            <circle cx="60" cy="70" r="14" fill={brandColors.orange} />
          </g>
        </svg>
      </div>

      {/* right column: title written word by word, then badges */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 36,
        }}
      >
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {words.map((w, i) => {
            const at = 28 + i * 7
            const o = interpolate(frame, [at, at + 8], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
            return (
              <span
                key={w}
                style={{
                  fontFamily,
                  fontWeight: fontWeight.bold,
                  fontSize: 68,
                  color: neutrals.ink,
                  opacity: o,
                }}
              >
                {w}
              </span>
            )
          })}
        </div>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Badge show={48} frame={frame}>
            <svg viewBox="0 0 32 24" width="34" height="26">
              <circle cx="10" cy="8" r="6" fill={neutrals.ink} />
              <circle cx="22" cy="8" r="6" fill={neutrals.ink} />
              <path d="M2 24c0-6 4-9 8-9s8 3 8 9zM14 24c0-6 4-9 8-9s8 3 8 9z" fill={neutrals.ink} />
            </svg>
            5–40
          </Badge>
          <Badge show={54} frame={frame}>
            <svg viewBox="0 0 24 24" width="28" height="28">
              <circle cx="12" cy="12" r="10" fill="none" stroke={neutrals.ink} strokeWidth="3" />
              <path
                d="M12 7v6l4 2"
                fill="none"
                stroke={neutrals.ink}
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            45 min
          </Badge>
          <Badge show={62} frame={frame}>
            @me
          </Badge>
        </div>
      </div>
    </div>
  )
}
