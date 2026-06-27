/**
 * #play14 video design tokens.
 *
 * Single source of truth for the brand look in Remotion compositions.
 * Values mirror the design system in `packages/design` (see `colors/Colors.txt`
 * and the web tokens in `packages/web/src/styles/scss/_themes.scss`).
 */

/**
 * The six #play14 brand colors. Each one spells out a part of the wordmark:
 * `#` red · `p` orange · `l` yellow · `a` green · `y` blue · `14` gray.
 */
export const brandColors = {
  red: "#d80000",
  orange: "#ff5200",
  yellow: "#ffc900",
  green: "#92c900",
  blue: "#0098dd",
  gray: "#393939",
} as const

export const neutrals = {
  white: "#ffffff",
  black: "#000000",
  /** Slightly lifted black used for video backgrounds (avoids crushed blacks). */
  ink: "#0d0d0d",
} as const

export type BrandColor = keyof typeof brandColors

/**
 * The vivid five-color spectrum (`#play`) used for accent bars and dividers.
 * Gray is intentionally excluded — it reads as text/`14`, not as an accent.
 */
export const brandSpectrum: readonly string[] = [
  brandColors.red,
  brandColors.orange,
  brandColors.yellow,
  brandColors.green,
  brandColors.blue,
]

/**
 * The `#play14` wordmark broken into colored segments, in reading order.
 * Drive both the text wordmark and any per-letter animation from this.
 * The `14` is neutral and adapts to the background (white on dark, gray on light).
 */
export const wordmarkSegments = [
  { text: "#", color: brandColors.red },
  { text: "p", color: brandColors.orange },
  { text: "l", color: brandColors.yellow },
  { text: "a", color: brandColors.green },
  { text: "y", color: brandColors.blue },
  { text: "14", color: null },
] as const

/** Brand tagline. */
export const tagline = "play is the way!"

/**
 * Brand typeface. DIN Alternate ships in `packages/design/font` and is loaded
 * from `public/fonts` in `fonts.ts`. The family name must match `loadFont`.
 */
export const fontFamily =
  '"DIN Alternate", "Segoe UI", system-ui, -apple-system, Roboto, sans-serif'

export const fontWeight = {
  regular: 400,
  medium: 500,
  bold: 700,
} as const

/**
 * Video-first type scale, tuned for a 1920×1080 frame.
 * Following the layout guidance: when unsure, make text larger, not smaller.
 */
export const fontSize = {
  /** Hero wordmark / single-word title. */
  display: 300,
  /** Main headline. */
  title: 120,
  /** Section heading. */
  heading: 84,
  /** Supporting copy, taglines. */
  subtitle: 56,
  /** Body / secondary text. */
  body: 44,
  /** Short callouts and labels. */
  label: 34,
} as const

/** Spacing scale (px). */
export const spacing = {
  xs: 8,
  sm: 16,
  md: 32,
  lg: 64,
  xl: 96,
} as const

/** Keep key content within this margin from the frame edges (px, for 1920×1080). */
export const safeArea = {
  x: 120,
  y: 100,
} as const

/** Default composition geometry for landscape brand videos. */
export const videoFormat = {
  width: 1920,
  height: 1080,
  fps: 30,
} as const

export const theme = {
  brandColors,
  neutrals,
  brandSpectrum,
  wordmarkSegments,
  tagline,
  fontFamily,
  fontWeight,
  fontSize,
  spacing,
  safeArea,
  videoFormat,
} as const

export type Play14Theme = typeof theme
