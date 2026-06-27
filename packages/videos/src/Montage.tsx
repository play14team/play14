import { Audio } from "@remotion/media"
import type { FC, ReactNode } from "react"
import {
  AbsoluteFill,
  type CalculateMetadataFunction,
  Easing,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion"
import { communityAudio, valueColor } from "./community"
import { BrandBackground } from "./components/BrandBackground"
import { BrandMedia } from "./components/BrandMedia"
import { BrandSubtitle, BrandTitle } from "./components/BrandText"
import { ColorAccentBar } from "./components/ColorAccentBar"
import { ConceptIcon, FloatingParticles } from "./components/icons"
import { Play14Logo } from "./components/Play14Logo"
import { Play14Wordmark } from "./components/Play14Wordmark"
import { getAudioDuration } from "./lib/audio-duration"
import {
  type ClipItem,
  type MediaItem,
  montageByValue,
  montageClips,
  valueOrder,
} from "./media.generated"
import {
  brandColors,
  fontFamily,
  fontWeight,
  neutrals,
  spacing,
  tagline,
  videoFormat,
} from "./theme"

const { fps } = videoFormat

const HEAD = 72 // wordmark cold-open
const MOTTO = 92 // "be ready to be surprised" card
const OUTRO = 104 // closing logo
const VO_DELAY = 6
const TAIL = 36
const STILLS_PER_VALUE = 3
const CARD_W = 1600
const CARD_H = 904

type Shot = { item: MediaItem | ClipItem; kind: "photo" | "clip"; value: string; first: boolean }

/** Flatten the curated media into a value-ordered shot list (clips lead each value). */
const buildShots = (): Shot[] => {
  const shots: Shot[] = []
  for (const v of valueOrder) {
    const clips = montageClips.filter((c) => c.value === v)
    const stills = montageByValue[v].slice(0, STILLS_PER_VALUE)
    const group: Shot[] = [
      ...clips.map((c) => ({ item: c, kind: "clip" as const, value: v, first: false })),
      ...stills.map((s) => ({ item: s, kind: "photo" as const, value: v, first: false })),
    ]
    group.forEach((g, i) => {
      shots.push({ ...g, first: i === 0 })
    })
  }
  return shots
}

const SHOTS = buildShots()

export type MontageProps = Record<string, unknown>

export const calculateMontageMetadata: CalculateMetadataFunction<MontageProps> = async () => {
  const seconds = await getAudioDuration(staticFile(communityAudio))
  const voFrames = Math.ceil(seconds * fps)
  return { durationInFrames: voFrames + VO_DELAY + TAIL }
}

/** Local-frame cross-fade wrapper that also centers its content. */
const Fade: FC<{ dur: number; children: ReactNode }> = ({ dur, children }) => {
  const f = useCurrentFrame()
  const opacity = interpolate(f, [0, 10, dur - 12, dur], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  return (
    <AbsoluteFill style={{ opacity, alignItems: "center", justifyContent: "center" }}>
      {children}
    </AbsoluteFill>
  )
}

const ValueLabel: FC<{ value: string; accent: string }> = ({ value, accent }) => {
  const f = useCurrentFrame()
  const t = interpolate(f, [4, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  })
  return (
    <div
      style={{
        position: "absolute",
        top: 26,
        left: 30,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        opacity: t,
        translate: `${(1 - t) * -16}px 0`,
      }}
    >
      <div
        style={{
          fontFamily,
          fontWeight: fontWeight.bold,
          fontSize: 44,
          letterSpacing: "0.04em",
          textTransform: "lowercase",
          color: neutrals.white,
          textShadow: "0 2px 10px rgba(0,0,0,0.7)",
        }}
      >
        {value}
      </div>
      <div style={{ width: 120, height: 8, borderRadius: 999, backgroundColor: accent }} />
    </div>
  )
}

const MontageShot: FC<{ shot: Shot; index: number; dur: number }> = ({ shot, index, dur }) => {
  const accent = valueColor[shot.value] ?? brandColors.orange
  return (
    <Fade dur={dur}>
      <div style={{ position: "relative", width: CARD_W, height: CARD_H }}>
        <BrandMedia
          item={shot.item}
          kind={shot.kind}
          width={CARD_W}
          height={CARD_H}
          accent={accent}
          motion={index % 2 === 0 ? "zoom-in" : "zoom-out"}
          durationInFrames={dur}
          radius={30}
          showCredit={false}
        />
        {shot.first ? <ValueLabel value={shot.value} accent={accent} /> : null}
      </div>
    </Fade>
  )
}

const MottoCard: FC = () => {
  const f = useCurrentFrame()
  const pop = interpolate(f, [4, 24], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
  })
  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: spacing.lg }}
    >
      <ConceptIcon name="sparkle" size={160} />
      <BrandTitle fontSize={124} style={{ scale: String(0.7 + pop * 0.3), opacity: pop }}>
        Be ready to be surprised
      </BrandTitle>
      <ColorAccentBar delay={18} width={560} height={16} />
    </div>
  )
}

const Closing: FC = () => {
  const f = useCurrentFrame()
  const t = interpolate(f, [2, 24], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  })
  const sub = interpolate(f, [18, 34], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: spacing.lg }}
    >
      <div style={{ opacity: t, scale: String(0.84 + t * 0.16), translate: `0 ${(1 - t) * 22}px` }}>
        <Play14Logo onDark width={920} />
      </div>
      <BrandSubtitle style={{ opacity: sub }}>{tagline}</BrandSubtitle>
      <ColorAccentBar delay={22} width={640} height={16} />
      <BrandSubtitle
        fontSize={40}
        color={brandColors.blue}
        style={{ opacity: sub, fontWeight: fontWeight.bold }}
      >
        play14.org
      </BrandSubtitle>
    </div>
  )
}

export const Montage: FC<MontageProps> = () => {
  const { durationInFrames: total } = useVideoConfig()

  const mediaStart = HEAD - 16
  const mediaEnd = total - OUTRO - MOTTO - 12
  const window = Math.max(1, mediaEnd - mediaStart)
  const weights = SHOTS.map((s) => (s.kind === "clip" ? 1.5 : 1))
  const wsum = weights.reduce((a, b) => a + b, 0)

  let cursor = mediaStart
  const placed = SHOTS.map((shot, i) => {
    const dur = Math.max(34, Math.round((window * weights[i]) / wsum))
    const from = cursor
    cursor += dur
    return { shot, i, from, dur }
  })

  const mottoFrom = total - OUTRO - MOTTO
  const outroFrom = total - OUTRO

  return (
    <AbsoluteFill>
      <BrandBackground variant="dark" />
      <FloatingParticles />

      <Sequence durationInFrames={HEAD}>
        <Fade dur={HEAD}>
          <Play14Wordmark fontSize={300} animate delay={4} />
        </Fade>
      </Sequence>

      {placed.map(({ shot, i, from, dur }) => (
        <Sequence key={`${shot.item.src}-${i}`} from={from} durationInFrames={dur + 16}>
          <MontageShot shot={shot} index={i} dur={dur + 16} />
        </Sequence>
      ))}

      <Sequence from={mottoFrom} durationInFrames={MOTTO + 6}>
        <Fade dur={MOTTO + 6}>
          <MottoCard />
        </Fade>
      </Sequence>

      <Sequence from={outroFrom} durationInFrames={OUTRO + TAIL}>
        <Fade dur={OUTRO + TAIL}>
          <Closing />
        </Fade>
      </Sequence>

      <Sequence from={VO_DELAY}>
        <Audio src={staticFile(communityAudio)} />
      </Sequence>
    </AbsoluteFill>
  )
}
