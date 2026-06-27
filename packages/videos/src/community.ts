/**
 * "#play14 — the community" montage episode: copy + tokens.
 *
 * One continuous voiceover (not per-scene) plays over a fast, brand-framed
 * montage of real event photos and clips, grouped by the six #play14 values.
 *
 * As with the explainers, the TTS says "play fourteen" (never "#play14") so the
 * voice doesn't read "hashtag play one four"; the screen still shows `#play14`.
 */
import { brandColors } from "./theme"

/** Path (relative to `public/`) of the montage voiceover clip. */
export const communityAudio = "voiceover/community/montage.mp3"

/** The narration. `<break>` tags add the pauses that pace the montage. */
export const communityVO =
  "play fourteen is a global community of people who learn by playing — together. " +
  '<break time="0.5s" /> ' +
  "Every year, in cities all over the world, we gather to share games, ideas, and a little bit of mischief. " +
  '<break time="0.5s" /> ' +
  "From Luxembourg to Manila, Berlin to Bangalore, strangers walk in — and leave as friends. " +
  '<break time="0.6s" /> ' +
  "We come open. We make room for everyone. We connect. " +
  '<break time="0.4s" /> ' +
  "We stay curious. We share what we know. And we find the courage to try something new. " +
  '<break time="0.6s" /> ' +
  "Hundreds of games. Dozens of countries. Thousands of people. One simple idea. " +
  '<break time="0.7s" /> ' +
  "Be ready to be surprised. " +
  '<break time="0.5s" /> ' +
  "Play is the way."

/** Per-value accent color for the montage labels + frames. */
export const valueColor: Record<string, string> = {
  openness: brandColors.red,
  inclusion: brandColors.orange,
  connection: brandColors.yellow,
  curiosity: brandColors.green,
  sharing: brandColors.blue,
  courage: brandColors.orange,
}
