import fs from "node:fs/promises"
import path from "node:path"
import type { MDXRemoteProps } from "next-mdx-remote/rsc"
import { compileMDX } from "next-mdx-remote/rsc"

export async function loadMDX(contentPath: string, components: MDXRemoteProps["components"]) {
  const filePath = path.join(process.cwd(), "content", contentPath)
  const source = await fs.readFile(filePath, "utf-8")

  const { content } = await compileMDX({
    source,
    components,
  })

  return { content }
}
