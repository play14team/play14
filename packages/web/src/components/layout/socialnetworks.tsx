import type { Maybe, SocialNetwork } from "@/models/strapi"
import Link from "next/link"

function mapIcon(type: string) {
  if (type === "Email") return "bx bx-envelope"

  return `bx bxl-${type.toLowerCase()}`
}

const SocialNetworks = (props: {
  socialNetworks: Array<Maybe<SocialNetwork>>
}) => {
  const { socialNetworks } = props
  return (
    <ul className="social">
      {socialNetworks.map(
        (socialNetwork) =>
          socialNetwork && (
            <li key={socialNetwork.id}>
              {socialNetwork?.url && (
                <Link href={socialNetwork.url} className="d-block" target="_blank" rel="noreferrer">
                  <i className={mapIcon(socialNetwork.type as string)} />
                </Link>
              )}
            </li>
          )
      )}
    </ul>
  )
}

export default SocialNetworks
