import "./index.css"
import "./fonts"
import type { FC } from "react"
import { Composition, Folder } from "remotion"
import { BrandIntro } from "./BrandIntro"
import { calculateExplainerMetadata, Explainer } from "./Explainer"
import type { Cut, TopicKey } from "./episodes"
import { calculateMontageMetadata, Montage } from "./Montage"
import { tagline, videoFormat } from "./theme"

const { width, height, fps } = videoFormat

const EPISODES: { id: string; topic: TopicKey; cut: Cut }[] = [
  { id: "FormatLong", topic: "format", cut: "long" },
  { id: "FormatShort", topic: "format", cut: "short" },
  { id: "MarketplaceLong", topic: "marketplace", cut: "long" },
  { id: "MarketplaceShort", topic: "marketplace", cut: "short" },
]

export const RemotionRoot: FC = () => {
  return (
    <>
      <Folder name="Explainers">
        {EPISODES.map(({ id, topic, cut }) => (
          <Composition
            key={id}
            id={id}
            component={Explainer}
            durationInFrames={150}
            fps={fps}
            width={width}
            height={height}
            defaultProps={{ topic, cut, sceneDurations: [] as number[] }}
            calculateMetadata={calculateExplainerMetadata}
          />
        ))}
      </Folder>
      <Folder name="Community">
        <Composition
          id="CommunityMontage"
          component={Montage}
          durationInFrames={1500}
          fps={fps}
          width={width}
          height={height}
          defaultProps={{}}
          calculateMetadata={calculateMontageMetadata}
        />
      </Folder>
      <Folder name="Brand">
        <Composition
          id="BrandIntro"
          component={BrandIntro}
          durationInFrames={120}
          fps={fps}
          width={width}
          height={height}
          defaultProps={{ tagline }}
        />
      </Folder>
    </>
  )
}
