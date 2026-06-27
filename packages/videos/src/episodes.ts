/**
 * Scene configs for the "#play14 explained" video series.
 *
 * Source of truth for both the voiceover generation script and the
 * compositions. Each scene has the spoken line (`tts`), whether it belongs to
 * the short social cut (`inShort`), and a `visual` describing what's on screen.
 *
 * Scripts mirror the official copy at
 * `packages/web/src/app/[locale]/(main)/about/format/page.tsx` and the hosting
 * guide at `packages/web/content/hosting/en.mdx`.
 *
 * Note: the TTS feeds "play fourteen" (not "#play14") so the voice doesn't read
 * "hashtag play one four"; the screen still shows `#play14`.
 */
import type { BrandColor } from "./theme"

export type TopicKey = "format" | "marketplace"
export type Cut = "long" | "short"

export type IconName =
  | "people"
  | "flag"
  | "pin"
  | "sparkle"
  | "sun"
  | "feet"
  | "calendar-x"
  | "question"
  | "gift"
  | "sticky"

export type BoardMode = "overview" | "spaces" | "timeslots" | "place" | "reorganize"

export type SceneVisual =
  | { kind: "intro" }
  | { kind: "outro"; cta: string }
  | { kind: "text"; eyebrow?: string; headline: string; icon?: IconName }
  | { kind: "crowd"; eyebrow?: string; headline: string }
  | { kind: "agenda"; eyebrow?: string; headline: string }
  | { kind: "contributors"; eyebrow?: string; headline: string }
  | { kind: "pitch"; eyebrow?: string; headline: string }
  | { kind: "motto"; headline: string }
  | { kind: "twofeet"; eyebrow?: string; headline: string }
  | { kind: "animals" }
  | { kind: "writeSticky"; eyebrow?: string; headline: string }
  | { kind: "board"; mode: BoardMode; eyebrow?: string; headline: string }
  | {
      kind: "principle"
      index: number
      total: number
      headline: string
      example: string
      colorKey: BrandColor
      icon: IconName
    }

export type Scene = {
  id: string
  /** Text spoken by the voiceover (fed to TTS). */
  tts: string
  /** Optional snappier VO used only in the short cut (e.g. principle one-liners). */
  ttsShort?: string
  /** Whether this scene is kept in the short social cut. */
  inShort: boolean
  visual: SceneVisual
}

export type Topic = {
  key: TopicKey
  title: string
  scenes: Scene[]
}

const CTA = "play14.org/about/format"

const formatTopic: Topic = {
  key: "format",
  title: "The #play14 format",
  scenes: [
    {
      id: "intro",
      tts: "Welcome to play fourteen.",
      inShort: true,
      visual: { kind: "intro" },
    },
    {
      id: "hook",
      tts: "Imagine a conference with no agenda, no keynote speakers, no fixed schedule. Sounds like chaos? It's not. It's an unconference.",
      inShort: true,
      visual: { kind: "agenda", eyebrow: "the format", headline: "A conference with no agenda?" },
    },
    {
      id: "unconference",
      tts: "Here, everyone who attends is also a contributor. Nothing is planned in advance — together, we build the program every single morning.",
      inShort: true,
      visual: {
        kind: "contributors",
        eyebrow: "unconference",
        headline: "Everyone here is a contributor",
      },
    },
    {
      id: "organizers",
      tts: "The organizers provide the space, the food, and the drinks. After that, it's up to you to make it a great event.",
      inShort: false,
      visual: {
        kind: "text",
        eyebrow: "your event",
        headline: "It's up to you to make it great",
        icon: "gift",
      },
    },
    {
      id: "principles-intro",
      tts: "Open Space runs on five simple principles.",
      inShort: true,
      visual: {
        kind: "text",
        eyebrow: "open space",
        headline: "Five simple principles",
        icon: "sparkle",
      },
    },
    {
      id: "p1",
      tts: "Whoever comes is the right people. As a facilitator, welcome everyone who joins your session, even if they're not who you expected. If too many show up, explain kindly and adapt; if nobody does, pitch your idea more clearly next time. And as a participant, come ready to collaborate with anyone.",
      ttsShort: "Whoever comes is the right people — play with whoever shows up.",
      inShort: true,
      visual: {
        kind: "principle",
        index: 1,
        total: 5,
        headline: "Whoever comes is the right people",
        example: "Packed or empty — roll with it. Play with anyone.",
        colorKey: "red",
        icon: "people",
      },
    },
    {
      id: "p2",
      tts: "Whenever it starts is the right time. As a facilitator, if you need a few minutes to set up, take them — but tell the room, since people may drift to another session, so it helps to prepare in advance. As a participant, it's fine to join a session already in progress; just slip in quietly and respect the people who started without you.",
      ttsShort: "Whenever it starts is the right time — need a sec? take it.",
      inShort: true,
      visual: {
        kind: "principle",
        index: 2,
        total: 5,
        headline: "Whenever it starts is the right time",
        example: "Need a sec? Take it. Rolling in late? Sneak in.",
        colorKey: "orange",
        icon: "flag",
      },
    },
    {
      id: "p3",
      tts: "Wherever it is, is the right place. You'll be offered several spaces, so choose the one that actually fits your session — an open floor to move around, tables and chairs to work at, or a room with a projector. Pick what your game needs.",
      ttsShort: "Wherever it is is the right place — grab the space that fits.",
      inShort: true,
      visual: {
        kind: "principle",
        index: 3,
        total: 5,
        headline: "Wherever it is is the right place",
        example: "Open floor, tables, projector — grab what fits.",
        colorKey: "yellow",
        icon: "pin",
      },
    },
    {
      id: "p4",
      tts: "Whatever happens is the only thing that could have. However your session turns out is exactly how it was meant to go, so accept it and learn from it. Don't be annoyed if you get feedback, and don't be discouraged if it doesn't work — just adjust, and try again.",
      ttsShort: "Whatever happens is the only thing that could have — accept it, learn, try again.",
      inShort: true,
      visual: {
        kind: "principle",
        index: 4,
        total: 5,
        headline: "Whatever happens is the only thing that could have",
        example: "However it goes — accept it, learn, try again.",
        colorKey: "green",
        icon: "sparkle",
      },
    },
    {
      id: "p5",
      tts: "When it's over, it's over. As a facilitator, keep an eye on your own timebox — the organizers won't do it for you. Your participants may want to move to another session, and the room may be booked next, so wrap up on time. If there's still energy, continue somewhere else with whoever's interested.",
      ttsShort: "When it's over, it's over — keep an eye on your timebox.",
      inShort: true,
      visual: {
        kind: "principle",
        index: 5,
        total: 5,
        headline: "When it's over, it's over",
        example: "Watch your timebox — then free the room.",
        colorKey: "blue",
        icon: "sun",
      },
    },
    {
      id: "motto",
      tts: "And above all, the open space motto: be ready to be surprised.",
      inShort: true,
      visual: { kind: "motto", headline: "Be ready to be surprised" },
    },
    {
      id: "twofeet",
      tts: "There's also one law: the law of two feet. If you're neither learning nor contributing, use your two feet — or four wheels — and move somewhere you can. No one takes offense.",
      inShort: true,
      visual: { kind: "twofeet", eyebrow: "the one law", headline: "The law of two feet" },
    },
    {
      id: "animals",
      tts: "You'll meet two kinds of people: bumblebees, who buzz between groups to cross-pollinate ideas, and butterflies, who pause and let great conversations gather around them.",
      inShort: false,
      visual: { kind: "animals" },
    },
    {
      id: "outro",
      tts: 'That\'s the play fourteen format. <break time="0.8s" /> Come play. <break time="0.8s" /> Play is the way.',
      inShort: true,
      visual: { kind: "outro", cta: CTA },
    },
  ],
}

const marketplaceTopic: Topic = {
  key: "marketplace",
  title: "The marketplace",
  scenes: [
    {
      id: "intro",
      tts: "Welcome back to play fourteen.",
      inShort: true,
      visual: { kind: "intro" },
    },
    {
      id: "hook",
      tts: "No agenda… so how does anything actually happen? Every morning, after a few warm-up games, we build the day together — at the marketplace.",
      inShort: true,
      visual: {
        kind: "crowd",
        eyebrow: "the marketplace",
        headline: "So how does anything happen?",
      },
    },
    {
      id: "board-overview",
      tts: "The marketplace is one big board. It fills up with everyone's games and activities.",
      inShort: true,
      visual: {
        kind: "board",
        mode: "overview",
        eyebrow: "the marketplace",
        headline: "One big board",
      },
    },
    {
      id: "spaces",
      tts: "Down one side: the spaces — your rooms and play areas. Name them however you like; be playful.",
      inShort: true,
      visual: {
        kind: "board",
        mode: "spaces",
        eyebrow: "spaces",
        headline: "Spaces are your rooms",
      },
    },
    {
      id: "timeslots",
      tts: "Across the top: the time slots — when each session runs.",
      inShort: true,
      visual: {
        kind: "board",
        mode: "timeslots",
        eyebrow: "time slots",
        headline: "Time slots are when",
      },
    },
    {
      id: "write-sticky",
      tts: "Got a game to share? Grab a big sticky note. Write its name — draw something if you like. Add how many players you need, how long it runs, and your name.",
      inShort: true,
      visual: { kind: "writeSticky", eyebrow: "propose a game", headline: "Fill in a sticky" },
    },
    {
      id: "pitch",
      tts: "Then step up and pitch it to everyone. Keep it short, keep it fun.",
      inShort: true,
      visual: { kind: "pitch", eyebrow: "pitch it", headline: "Pitch it to the room" },
    },
    {
      id: "place",
      tts: "Pick a space and a time slot, and stick it on the board.",
      inShort: true,
      visual: { kind: "board", mode: "place", eyebrow: "place it", headline: "Find your spot" },
    },
    {
      id: "reorganize",
      tts: "And here's the secret: nothing is fixed. At the end, everyone gets a chance to reorganize — resolve clashes, fill the gaps, and shape the day together.",
      inShort: true,
      visual: {
        kind: "board",
        mode: "reorganize",
        eyebrow: "stay flexible",
        headline: "Then we reorganize",
      },
    },
    {
      id: "tips",
      tts: "Your game doesn't have to be new — the play fourteen classics are always welcome. And no game to propose? That's perfectly fine. Just play.",
      inShort: false,
      visual: { kind: "crowd", eyebrow: "good to know", headline: "No game? Just play." },
    },
    {
      id: "debrief",
      tts: "One golden rule for facilitators: always debrief. The magic isn't only in the game — it's in the questions you ask afterwards.",
      inShort: false,
      visual: {
        kind: "text",
        eyebrow: "facilitators",
        headline: "Always debrief",
        icon: "question",
      },
    },
    {
      id: "outro",
      tts: 'That\'s the marketplace. <break time="0.8s" /> Your move. <break time="0.8s" /> Play is the way.',
      inShort: true,
      visual: { kind: "outro", cta: CTA },
    },
  ],
}

export const topics: Record<TopicKey, Topic> = {
  format: formatTopic,
  marketplace: marketplaceTopic,
}

/** Ordered scenes for a given topic + cut (short = scenes flagged `inShort`). */
export const getScenes = (topic: TopicKey, cut: Cut): Scene[] => {
  const all = topics[topic].scenes
  return cut === "long" ? all : all.filter((s) => s.inShort)
}

/** Path (relative to `public/`) of a scene's full voiceover clip. */
export const audioFile = (topic: TopicKey, sceneId: string): string =>
  `voiceover/${topic}/${sceneId}.mp3`

/** Path of a scene's short-cut voiceover clip (only generated when `ttsShort` is set). */
export const audioFileShort = (topic: TopicKey, sceneId: string): string =>
  `voiceover/${topic}/${sceneId}.short.mp3`

/** Resolves the voiceover clip for a scene in a given cut (short variant if it exists). */
export const sceneAudio = (topic: TopicKey, scene: Scene, cut: Cut): string =>
  cut === "short" && scene.ttsShort ? audioFileShort(topic, scene.id) : audioFile(topic, scene.id)
