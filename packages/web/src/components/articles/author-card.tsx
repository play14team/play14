import Link from "next/link"
import type { Author } from "@/models/strapi"
import Avatar from "../ui/avatar"

interface AuthorCardProps {
  author: Author
  variant?: "default" | "compact"
}

/**
 * A modern author card component with Radix Avatar.
 * Displays author information with a clean, accessible design.
 */
export default function AuthorCard({ author, variant = "default" }: AuthorCardProps) {
  if (variant === "compact") {
    return (
      <Link
        href={`/players/${author.slug}`}
        className="article-author-compact"
        aria-label={`View ${author.name}'s profile`}
      >
        <Avatar src={author.avatar?.url} alt={author.name} fallback={author.name} size="sm" />
        <span className="article-author-compact-name">{author.name}</span>
      </Link>
    )
  }

  return (
    <article className="article-author-card" aria-label={`About the author: ${author.name}`}>
      <div className="article-author-card-header" aria-hidden="true" />
      <div className="article-author-card-content">
        <Link
          href={`/players/${author.slug}`}
          className="article-author-card-avatar-link"
          aria-label={`View ${author.name}'s profile`}
        >
          <Avatar
            src={author.avatar?.url}
            alt={author.name}
            fallback={author.name}
            size="xl"
            className="article-author-card-avatar"
          />
        </Link>
        <div className="article-author-card-info">
          <Link href={`/players/${author.slug}`} className="article-author-card-name">
            <h4>{author.name}</h4>
          </Link>
          {author.position && (
            <span className="article-author-card-position">{author.position}</span>
          )}
          {author.tagline && <p className="article-author-card-tagline">{author.tagline}</p>}
        </div>
      </div>
    </article>
  )
}
