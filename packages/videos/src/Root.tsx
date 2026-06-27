import "./index.css"
import "./fonts"
import type { FC } from "react"
import { Composition } from "remotion"
import { BrandIntro } from "./BrandIntro"
import { tagline, videoFormat } from "./theme"

export const RemotionRoot: FC = () => {
  return (
    <>
      <Composition
        id="BrandIntro"
        component={BrandIntro}
        durationInFrames={120}
        fps={videoFormat.fps}
        width={videoFormat.width}
        height={videoFormat.height}
        defaultProps={{ tagline }}
      />
    </>
  )
}
