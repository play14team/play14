/**
 * Generate ElevenLabs voiceover clips for every scene of every topic.
 *
 *   bun scripts/generate-voiceover.ts            # only missing clips
 *   bun scripts/generate-voiceover.ts --force    # regenerate everything
 *
 * Reads ELEVENLABS_API_KEY from packages/videos/.env (loaded automatically by
 * Bun). Override the voice/model with ELEVENLABS_VOICE_ID / ELEVENLABS_MODEL_ID.
 * Writes MP3s to public/voiceover/<topic>/<scene>.mp3 for staticFile().
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { audioFile, audioFileShort, type TopicKey, topics } from "../src/episodes"

const API_KEY = process.env.ELEVENLABS_API_KEY
if (!API_KEY) {
  console.error("✗ Missing ELEVENLABS_API_KEY — add it to packages/videos/.env")
  process.exit(1)
}

// "Brian" — calm, warm narrator; usable on free-tier API keys (many
// shared-library voices return 402 on free plans). Override with
// ELEVENLABS_VOICE_ID to use any other voice in your account.
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? "nPczCjzI2devNBz1zQrb" // "Brian"
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID ?? "eleven_multilingual_v2"
const force = process.argv.indexOf("--force") !== -1
const publicDir = join(import.meta.dir, "..", "public")

const synthesize = async (text: string): Promise<Buffer> => {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: "POST",
    headers: {
      "xi-api-key": API_KEY,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      voice_settings: {
        stability: 0.4,
        similarity_boost: 0.75,
        style: 0.25,
        use_speaker_boost: true,
      },
    }),
  })
  if (!res.ok) {
    throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

let generated = 0
let skipped = 0

type Clip = { path: string; text: string; label: string }
const clips: Clip[] = []
for (const topic of Object.keys(topics) as TopicKey[]) {
  for (const scene of topics[topic].scenes) {
    clips.push({ path: audioFile(topic, scene.id), text: scene.tts, label: `${topic}/${scene.id}` })
    if (scene.ttsShort) {
      clips.push({
        path: audioFileShort(topic, scene.id),
        text: scene.ttsShort,
        label: `${topic}/${scene.id} (short)`,
      })
    }
  }
}

for (const clip of clips) {
  const out = join(publicDir, clip.path)
  if (!force && existsSync(out)) {
    skipped++
    continue
  }
  mkdirSync(dirname(out), { recursive: true })
  process.stdout.write(`· ${clip.label} … `)
  const audio = await synthesize(clip.text)
  writeFileSync(out, audio)
  generated++
  console.log(`${(audio.length / 1024).toFixed(0)} KB`)
}

console.log(
  `\n✓ ${generated} generated, ${skipped} skipped (use --force to regenerate). Voice: ${VOICE_ID}`
)
