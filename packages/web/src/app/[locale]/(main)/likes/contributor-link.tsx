"use client"

import Image from "next/image"
import { Link } from "@/i18n/navigation"

interface ContributorLinkProps {
  href: string
  name: string
  avatarUrl: string | null
}

export default function ContributorLink({ href, name, avatarUrl }: ContributorLinkProps) {
  return (
    <Link
      href={href}
      className="contributor-link"
      title={name}
      onClick={(e) => e.stopPropagation()}
    >
      {avatarUrl ? (
        <Image src={avatarUrl} alt={name} width={32} height={32} />
      ) : (
        <span className="contributor-initial">{name.charAt(0)}</span>
      )}
    </Link>
  )
}
