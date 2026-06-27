/**
 * Loads the DIN Alternate brand typeface for all compositions.
 *
 * Import this module for its side effect (e.g. from `Root.tsx`) so the font is
 * registered before any frame renders. `delayRender`/`continueRender` make the
 * Remotion renderer wait until every weight is ready, preventing fallback-font
 * flashes in stills and exports.
 */
import { loadFont } from "@remotion/fonts"
import { cancelRender, continueRender, delayRender, staticFile } from "remotion"

const FAMILY = "DIN Alternate"

const WEIGHTS = [
  { weight: "400", file: "DINAlternate-Regular.otf" },
  { weight: "500", file: "DINAlternate-Medium.otf" },
  { weight: "700", file: "DINAlternate-Bold.otf" },
] as const

const handle = delayRender("Loading #play14 brand font (DIN Alternate)")

Promise.all(
  WEIGHTS.map(({ weight, file }) =>
    loadFont({
      family: FAMILY,
      url: staticFile(`fonts/${file}`),
      weight,
      format: "opentype",
      display: "block",
    })
  )
)
  .then(() => continueRender(handle))
  .catch((err) => cancelRender(err))
