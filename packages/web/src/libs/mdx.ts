import fs from "node:fs/promises"
import path from "node:path"
import type { MDXRemoteProps } from "next-mdx-remote/rsc"
import { compileMDX } from "next-mdx-remote/rsc"

const FALLBACK_LOCALE_FILENAME = "en.mdx"

async function readWithFallback(contentPath: string) {
  const filePath = path.join(process.cwd(), "content", contentPath)
  try {
    return await fs.readFile(filePath, "utf-8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
    const basename = path.basename(contentPath)
    if (basename === FALLBACK_LOCALE_FILENAME) throw error
    const fallback = path.join(path.dirname(contentPath), FALLBACK_LOCALE_FILENAME)
    return fs.readFile(path.join(process.cwd(), "content", fallback), "utf-8")
  }
}

export async function loadMDX(contentPath: string, components: MDXRemoteProps["components"]) {
  const source = await readWithFallback(contentPath)

  const { content } = await compileMDX({
    source,
    components,
  })

  return { content }
}
