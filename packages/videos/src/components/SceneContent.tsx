import type { CSSProperties, FC, ReactNode } from "react"
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion"
import type { IconName, SceneVisual } from "../episodes"
import { boardClip, montageByValue, punchins, valueOrder } from "../media.generated"
import { brandColors, fontFamily, fontWeight, neutrals, spacing, tagline } from "../theme"
import { BrandMedia, type BrandMediaItem } from "./BrandMedia"
import { BrandSubtitle, BrandTitle } from "./BrandText"
import { ColorAccentBar } from "./ColorAccentBar"
import { Bee, Butterfly, ConceptIcon, SpaceOptions } from "./icons"
import { EmptyAgenda, MarketplaceBoard, WriteStickyScene } from "./marketplace"
import { Play14Logo } from "./Play14Logo"
import { ContributorCrowd, Crowd, PitchScene, WalkBetweenGroups } from "./people"

/** Resolve a scene's `media` key to a staged photo/clip. */
const resolveMedia = (key: string): { item: BrandMediaItem; kind: "photo" | "clip" } | null => {
  if (key === "boardClip") return { item: boardClip, kind: "clip" }
  const p = (punchins as Record<string, BrandMediaItem>)[key]
  return p ? { item: p, kind: "photo" } : null
}

/** One representative photo per value — a warm, people-filled outro backdrop. */
const OUTRO_PHOTOS = valueOrder.map((v) => montageByValue[v][0]).filter(Boolean)

const MontageBackdrop: FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame()
  const per = Math.max(26, Math.floor(durationInFrames / Math.max(1, OUTRO_PHOTOS.length)))
  return (
    <AbsoluteFill>
      {OUTRO_PHOTOS.map((ph, i) => {
        const start = i * per
        const op = interpolate(
          frame,
          [start - 12, start + 10, start + per - 10, start + per + 12],
          [0, 1, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        )
        const kb = interpolate(frame, [start, start + per + 24], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
        return (
          <AbsoluteFill key={ph.src} style={{ opacity: op * 0.3 }}>
            <Img
              src={staticFile(ph.src)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `scale(${1.05 + kb * 0.08})`,
              }}
            />
          </AbsoluteFill>
        )
      })}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at center, ${neutrals.ink}99, ${neutrals.ink}ee)`,
        }}
      />
    </AbsoluteFill>
  )
}

/** Local-frame "appear" (opacity + rise), eased. */
const useAppear = (start: number, distance = 28) => {
  const frame = useCurrentFrame()
  const t = interpolate(frame, [start, start + 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  })
  return { opacity: t, translate: `0 ${(1 - t) * distance}px` }
}

const Eyebrow: FC<{ children: string; color?: string; style?: CSSProperties }> = ({
  children,
  color = brandColors.orange,
  style,
}) => (
  <div
    style={{
      fontFamily,
      fontWeight: fontWeight.bold,
      fontSize: 32,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color,
      ...style,
    }}
  >
    {children}
  </div>
)

/** Hero visual on top, eyebrow + headline caption below. */
const Captioned: FC<{
  children: ReactNode
  eyebrow?: string
  headline: string
  gap?: number
}> = ({ children, eyebrow, headline, gap = spacing.lg }) => {
  const eb = useAppear(8, 16)
  const head = useAppear(14)
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap }}>
      {children}
      <div
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: spacing.sm }}
      >
        {eyebrow ? <Eyebrow style={eb}>{eyebrow}</Eyebrow> : null}
        <BrandTitle fontSize={76} style={head}>
          {headline}
        </BrandTitle>
      </div>
    </div>
  )
}

/** Logo entrance: fade + scale-up, eased. */
const useLogoReveal = (start: number) => {
  const frame = useCurrentFrame()
  const t = interpolate(frame, [start, start + 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  })
  return { opacity: t, scale: String(0.82 + t * 0.18), translate: `0 ${(1 - t) * 24}px` }
}

const IntroVisual: FC = () => (
  <div style={useLogoReveal(4)}>
    <Play14Logo onDark width={1150} />
  </div>
)

const OutroVisual: FC<{ cta: string; durationInFrames: number }> = ({ cta, durationInFrames }) => {
  const sub = useAppear(18)
  const link = useAppear(28)
  return (
    <>
      <MontageBackdrop durationInFrames={durationInFrames} />
      <div
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: spacing.lg }}
      >
        <div style={useLogoReveal(2)}>
          <Play14Logo onDark width={900} />
        </div>
        <BrandSubtitle style={sub}>{tagline}</BrandSubtitle>
        <ColorAccentBar delay={24} width={640} height={16} />
        <BrandSubtitle
          fontSize={40}
          color={brandColors.blue}
          style={{ ...link, fontWeight: fontWeight.bold }}
        >
          {cta}
        </BrandSubtitle>
      </div>
    </>
  )
}

const TextVisual: FC<{ eyebrow?: string; headline: string; icon?: IconName }> = ({
  eyebrow,
  headline,
  icon,
}) => {
  const eb = useAppear(6, 18)
  const head = useAppear(12)
  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: spacing.md }}
    >
      {icon ? <ConceptIcon name={icon} size={180} /> : null}
      {eyebrow ? <Eyebrow style={eb}>{eyebrow}</Eyebrow> : null}
      <BrandTitle fontSize={104} style={head}>
        {headline}
      </BrandTitle>
    </div>
  )
}

/** Expanding ring that pops behind an icon on entrance. */
const BurstRing: FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame()
  const t = interpolate(frame, [2, 28], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  })
  return (
    <div
      style={{
        position: "absolute",
        width: 230,
        height: 230,
        borderRadius: 999,
        border: `3px solid ${color}`,
        scale: String(0.4 + t * 0.9),
        opacity: (1 - t) * 0.6,
      }}
    />
  )
}

/** Per-principle hero: a crowd, space options, or a burst-ring icon. */
const PrincipleHero: FC<{ icon: IconName; color: string }> = ({ icon, color }) => {
  if (icon === "people") return <Crowd count={5} size={120} />
  if (icon === "pin") return <SpaceOptions />
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <BurstRing color={color} />
      <ConceptIcon name={icon} size={170} />
    </div>
  )
}

const PrincipleVisual: FC<
  Extract<SceneVisual, { kind: "principle" }> & { durationInFrames: number }
> = ({ index, total, headline, example, colorKey, icon, durationInFrames }) => {
  const color = brandColors[colorKey]
  const eb = useAppear(6, 18)
  const head = useAppear(12)
  const ex = useAppear(22, 18)
  // Each principle is anchored by a real photo of people living it out.
  const photo = (punchins as Record<string, BrandMediaItem>)[`p${index}`]
  const motion = index === 1 ? "pan-left" : index % 2 === 0 ? "zoom-out" : "zoom-in"
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: spacing.md,
        maxWidth: 1500,
      }}
    >
      {photo ? (
        <BrandMedia
          item={photo}
          kind="photo"
          width={1040}
          height={448}
          accent={color}
          motion={motion}
          durationInFrames={durationInFrames}
          radius={26}
        />
      ) : (
        <div style={{ height: 200, display: "flex", alignItems: "center" }}>
          <PrincipleHero icon={icon} color={color} />
        </div>
      )}
      <Eyebrow color={color} style={eb}>{`principle ${index} of ${total}`}</Eyebrow>
      <BrandTitle fontSize={86} style={head}>
        {headline}
      </BrandTitle>
      <ColorAccentBar colors={[color]} delay={16} width={180} height={12} />
      <BrandSubtitle fontSize={40} style={{ ...ex, maxWidth: 1200 }}>
        {example}
      </BrandSubtitle>
    </div>
  )
}

const MottoVisual: FC<{ headline: string }> = ({ headline }) => {
  const frame = useCurrentFrame()
  const pop = interpolate(frame, [4, 24], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
  })
  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: spacing.lg }}
    >
      <ConceptIcon name="sparkle" size={170} />
      <BrandTitle fontSize={132} style={{ scale: String(0.7 + pop * 0.3), opacity: pop }}>
        {headline}
      </BrandTitle>
      <ColorAccentBar delay={20} width={560} height={16} />
    </div>
  )
}

const AnimalColumn: FC<{
  creature: ReactNode
  name: string
  description: string
  color: string
  appear: ReturnType<typeof useAppear>
}> = ({ creature, name, description, color, appear }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: spacing.md,
      width: 560,
      ...appear,
    }}
  >
    <div style={{ height: 230, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {creature}
    </div>
    <BrandTitle fontSize={84} color={color}>
      {name}
    </BrandTitle>
    <BrandSubtitle fontSize={38}>{description}</BrandSubtitle>
  </div>
)

const AnimalsVisual: FC = () => {
  const left = useAppear(6, 40)
  const right = useAppear(16, 40)
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: spacing.xl }}>
      <AnimalColumn
        creature={<Bee size={210} />}
        name="Bumblebee"
        description="Buzzes between groups, cross-pollinating ideas."
        color={brandColors.yellow}
        appear={left}
      />
      <AnimalColumn
        creature={<Butterfly size={210} />}
        name="Butterfly"
        description="Pauses, and lets great conversations gather around them."
        color={brandColors.blue}
        appear={right}
      />
    </div>
  )
}

/** A real photo/clip framed in brand style, captioned like the SVG scenes. */
const CaptionedMedia: FC<{
  eyebrow?: string
  headline: string
  mediaKey: string
  accent: string
  width: number
  height: number
  motion: "zoom-in" | "zoom-out" | "pan-left" | "pan-right"
  durationInFrames: number
}> = ({ eyebrow, headline, mediaKey, accent, width, height, motion, durationInFrames }) => {
  const m = resolveMedia(mediaKey)
  if (!m) return null
  return (
    <Captioned eyebrow={eyebrow} headline={headline} gap={spacing.md}>
      <BrandMedia
        item={m.item}
        kind={m.kind}
        width={width}
        height={height}
        accent={accent}
        motion={motion}
        durationInFrames={durationInFrames}
        radius={26}
      />
    </Captioned>
  )
}

/** Renders the on-screen content for a scene. */
export const SceneContent: FC<{ visual: SceneVisual; durationInFrames: number }> = ({
  visual,
  durationInFrames,
}) => {
  switch (visual.kind) {
    case "intro":
      return <IntroVisual />
    case "outro":
      return <OutroVisual cta={visual.cta} durationInFrames={durationInFrames} />
    case "text":
      return <TextVisual eyebrow={visual.eyebrow} headline={visual.headline} icon={visual.icon} />
    case "principle":
      return <PrincipleVisual {...visual} durationInFrames={durationInFrames} />
    case "motto":
      return <MottoVisual headline={visual.headline} />
    case "crowd":
      return visual.media ? (
        <CaptionedMedia
          eyebrow={visual.eyebrow}
          headline={visual.headline}
          mediaKey={visual.media}
          accent={brandColors.green}
          width={1080}
          height={512}
          motion="zoom-out"
          durationInFrames={durationInFrames}
        />
      ) : (
        <Captioned eyebrow={visual.eyebrow} headline={visual.headline}>
          <Crowd count={6} size={150} />
        </Captioned>
      )
    case "agenda":
      return (
        <Captioned eyebrow={visual.eyebrow} headline={visual.headline}>
          <EmptyAgenda />
        </Captioned>
      )
    case "contributors":
      return (
        <Captioned eyebrow={visual.eyebrow} headline={visual.headline}>
          <ContributorCrowd />
        </Captioned>
      )
    case "pitch":
      return visual.media ? (
        <CaptionedMedia
          eyebrow={visual.eyebrow}
          headline={visual.headline}
          mediaKey={visual.media}
          accent={brandColors.blue}
          width={1040}
          height={520}
          motion="zoom-in"
          durationInFrames={durationInFrames}
        />
      ) : (
        <Captioned eyebrow={visual.eyebrow} headline={visual.headline}>
          <PitchScene />
        </Captioned>
      )
    case "twofeet":
      return (
        <Captioned eyebrow={visual.eyebrow} headline={visual.headline}>
          <WalkBetweenGroups />
        </Captioned>
      )
    case "writeSticky":
      return visual.media ? (
        <CaptionedMedia
          eyebrow={visual.eyebrow}
          headline={visual.headline}
          mediaKey={visual.media}
          accent={brandColors.yellow}
          width={920}
          height={530}
          motion="zoom-in"
          durationInFrames={durationInFrames}
        />
      ) : (
        <Captioned eyebrow={visual.eyebrow} headline={visual.headline} gap={spacing.md}>
          <WriteStickyScene />
        </Captioned>
      )
    case "board":
      return visual.media ? (
        <CaptionedMedia
          eyebrow={visual.eyebrow}
          headline={visual.headline}
          mediaKey={visual.media}
          accent={brandColors.orange}
          width={1120}
          height={512}
          motion="zoom-in"
          durationInFrames={durationInFrames}
        />
      ) : (
        <Captioned eyebrow={visual.eyebrow} headline={visual.headline} gap={spacing.md}>
          <MarketplaceBoard mode={visual.mode} />
        </Captioned>
      )
    case "animals":
      return <AnimalsVisual />
  }
}
