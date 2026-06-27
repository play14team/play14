import type { CSSProperties, FC } from "react"
import { Img, staticFile } from "remotion"

/** Intrinsic aspect ratio of the official transparent logo PNGs (2015×717). */
const LOGO_ASPECT = 2015 / 717

export type Play14LogoProps = {
  /** Pick the variant whose neutral `14` contrasts with the background. */
  onDark?: boolean
  /** Rendered width in px; height is derived from the logo aspect ratio. */
  width?: number
  style?: CSSProperties
}

/**
 * The official #play14 logo as a raster image (`public/logo`). Prefer
 * {@link Play14Wordmark} when you want crisp scaling or per-letter animation;
 * use this when you need the exact, pixel-faithful brand asset.
 */
export const Play14Logo: FC<Play14LogoProps> = ({ onDark = true, width = 900, style }) => (
  <Img
    src={staticFile(onDark ? "logo/play14-on-dark.png" : "logo/play14-on-light.png")}
    style={{ width, height: width / LOGO_ASPECT, ...style }}
  />
)
