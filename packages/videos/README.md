# Remotion video

<p align="center">
  <a href="https://github.com/remotion-dev/logo">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-dark.apng">
      <img alt="Animated Remotion Logo" src="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-light.gif">
    </picture>
  </a>
</p>

Branded #play14 videos built with Remotion.

## #play14 brand style system

All compositions share one design system, mirroring `packages/design`:

- **`src/theme.ts`** — design tokens: the six brand colors (`#` red · `p` orange · `l` yellow · `a` green · `y` blue · `14` gray), the vivid spectrum, the video-first type scale, spacing, safe area, and the default 1920×1080 / 30fps format.
- **`src/fonts.ts`** — loads the **DIN Alternate** brand font (from `public/fonts`). Imported once in `Root.tsx`; the renderer waits for it via `delayRender`.
- **`src/components/`** — reusable building blocks:
  - `BrandBackground` — full-frame dark/light background with brand glows.
  - `Play14Wordmark` — the colored `#play14` wordmark in the brand font, crisp at any size and optionally animated per letter.
  - `Play14Logo` — the official logo as a raster image (`public/logo`); use when you need pixel-faithful fidelity.
  - `ColorAccentBar` — the signature multi-color stripe, with an optional left-to-right wipe.
  - `BrandTitle` / `BrandSubtitle` — headline and supporting text in the brand font.
- **`src/BrandIntro.tsx`** — the reference composition; copy it as the starting point for new videos.

```tsx
import { BrandBackground, Play14Wordmark, ColorAccentBar } from "./components";

export const MyScene = () => (
  <BrandBackground variant="dark">
    <Play14Wordmark animate fontSize={300} />
    <ColorAccentBar delay={20} />
  </BrandBackground>
);
```

Register new compositions in `src/Root.tsx`. Brand assets live in `public/` (`fonts/`, `logo/`) and are referenced with `staticFile()`.

## Explainer video series

Short, voiced explainers about #play14, built from a shared scene runner. The scene scripts (spoken lines + on-screen visuals) live in `src/episodes.ts`; the runner and its `calculateMetadata` live in `src/Explainer.tsx`.

| Composition ID     | Topic                  | Cut   | ~Length |
| ------------------ | ---------------------- | ----- | ------- |
| `FormatLong`       | The #play14 format     | long  | ~80s    |
| `FormatShort`      | The #play14 format     | short | ~60s    |
| `MarketplaceLong`  | The marketplace        | long  | ~73s    |
| `MarketplaceShort` | The marketplace        | short | ~51s    |
| `BrandIntro`       | Brand sting (reference)| —     | 4s      |

Each scene plays one ElevenLabs voiceover clip from `public/voiceover/<topic>/`, and the composition length is derived from those clips — so **generate the voiceover before rendering or previewing** the explainers.

## Commands

Run these from `packages/videos/`, or from the monorepo root by prefixing with `bun --filter play14-videos` (e.g. `bun --filter play14-videos dev`).

**Install dependencies** (from the monorepo root)

```console
bun install
```

**Generate the voiceover** — calls ElevenLabs for every scene and writes MP3s to `public/voiceover/`. Requires `ELEVENLABS_API_KEY` in `packages/videos/.env`.

```console
bun run voiceover           # generate only missing clips
bun run voiceover --force   # regenerate everything
```

Override the voice with `ELEVENLABS_VOICE_ID` (default: "Sarah" — `EXAVITQu4vr4xnSDxMaL`) or the model with `ELEVENLABS_MODEL_ID` in `.env`, then re-run with `--force`.

**Preview in Remotion Studio**

```console
bun run dev
```

**Render one video** — pass a composition ID from the table above; output goes to `out/` (git-ignored).

```console
bunx remotion render FormatLong out/format-long.mp4
```

**Render all explainer videos**

```console
for id in FormatLong FormatShort MarketplaceLong MarketplaceShort; do
  bunx remotion render "$id" "out/$id.mp4"
done
```

**Render a still** — a single frame, handy for checking a scene's layout.

```console
bunx remotion still FormatLong out/frame.png --frame=300
```

**Upgrade Remotion**

```console
bunx remotion upgrade
```

## Docs

Get started with Remotion by reading the [fundamentals page](https://www.remotion.dev/docs/the-fundamentals).

## Help

We provide help on our [Discord server](https://discord.gg/6VzzNDwUwV).

## Issues

Found an issue with Remotion? [File an issue here](https://github.com/remotion-dev/remotion/issues/new).

## License

Note that for some entities a company license is needed. [Read the terms here](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).
