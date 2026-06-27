/** Prints each scene's start/mid frame for a topic+cut. Dev helper. */
import { join } from "node:path"
import { ALL_FORMATS, FilePathSource, Input } from "mediabunny"
import { type Cut, getScenes, sceneAudio, type TopicKey } from "../src/episodes"

const FPS = 30
const HEAD = 8
const TAIL = 36
const MIN = 52

const duration = async (path: string): Promise<number> => {
  const input = new Input({ formats: ALL_FORMATS, source: new FilePathSource(path) })
  return input.computeDuration()
}

const topic = (process.argv[2] ?? "format") as TopicKey
const cut = (process.argv[3] ?? "long") as Cut

let offset = 0
for (const scene of getScenes(topic, cut)) {
  const d = await duration(join(import.meta.dir, "..", "public", sceneAudio(topic, scene, cut)))
  const frames = Math.max(Math.ceil(d * FPS) + HEAD + TAIL, MIN)
  console.log(
    `${scene.id.padEnd(16)} start=${offset}  mid=${offset + Math.floor(frames / 2)}  dur=${frames}`
  )
  offset += frames
}
console.log(`total=${offset}`)
