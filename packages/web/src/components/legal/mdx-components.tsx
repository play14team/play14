import type { MDXRemoteProps } from "next-mdx-remote/rsc"
import { Link } from "@/i18n/navigation"

export function getLegalMDXComponents(): MDXRemoteProps["components"] {
  return {
    a: ({ href, children, ...props }: React.ComponentProps<"a">) => {
      if (href?.startsWith("/") || href?.startsWith("#")) {
        return (
          <Link href={href} {...props}>
            {children}
          </Link>
        )
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
          {children}
        </a>
      )
    },
  }
}
