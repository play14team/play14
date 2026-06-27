import { Audio } from "@remotion/media"
import type { FC } from "react"
import { AbsoluteFill, type CalculateMetadataFunction, Sequence, staticFile } from "remotion"
import { BrandBackground } from "./components/BrandBackground"
import { FloatingParticles } from "./components/icons"
import { SceneContent } from "./components/SceneContent"
import { SceneShell } from "./components/SceneShell"
import { type Cut, getScenes, type Scene, sceneAudio, type TopicKey } from "./episodes"
import { getAudioDuration } from "./lib/audio-duration"
import { videoFormat } from "./theme"

/** Silence before a scene's voiceover starts (lets the visual settle). */
const HEAD_PAD = 8
/** Silence after the voiceover ends (breathing room before the next scene). */
const TAIL_PAD = 36
/** Floor so very short lines still get a watchable beat. */
const MIN_SCENE = 52

export type ExplainerProps = {
  topic: TopicKey
  cut: Cut
  /** Per-scene durations in frames — computed by `calculateExplainerMetadata`. */
  sceneDurations: number[]
}

/**
 * Measures each scene's voiceover clip and sizes the composition to match,
 * padding every scene with lead-in / lead-out silence.
 */
export const calculateExplainerMetadata: CalculateMetadataFunction<ExplainerProps> = async ({
  props,
}) => {
  const scenes = getScenes(props.topic, props.cut)
  const seconds = await Promise.all(
    scenes.map((s) => getAudioDuration(staticFile(sceneAudio(props.topic, s, props.cut))))
  )
  const sceneDurations = seconds.map((d) =>
    Math.max(Math.ceil(d * videoFormat.fps) + HEAD_PAD + TAIL_PAD, MIN_SCENE)
  )

  return {
    durationInFrames: sceneDurations.reduce((a, b) => a + b, 0),
    props: { ...props, sceneDurations },
  }
}

type Placed = { scene: Scene; from: number; duration: number }

export const Explainer: FC<ExplainerProps> = ({ topic, cut, sceneDurations }) => {
  const scenes = getScenes(topic, cut)

  const placed: Placed[] = []
  let cursor = 0
  for (let i = 0; i < scenes.length; i++) {
    const duration = sceneDurations[i] ?? MIN_SCENE
    placed.push({ scene: scenes[i], from: cursor, duration })
    cursor += duration
  }

  return (
    <AbsoluteFill>
      <BrandBackground variant="dark" />
      <FloatingParticles />
      {placed.map(({ scene, from, duration }) => (
        <Sequence key={scene.id} from={from} durationInFrames={duration}>
          <SceneShell durationInFrames={duration}>
            <SceneContent visual={scene.visual} />
          </SceneShell>
          <Sequence from={HEAD_PAD}>
            <Audio src={staticFile(sceneAudio(topic, scene, cut))} />
          </Sequence>
        </Sequence>
      ))}
    </AbsoluteFill>
  )
}
