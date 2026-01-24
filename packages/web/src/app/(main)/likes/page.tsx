import type { Metadata } from "next"
import Image from "next/image"
import ContributorLink from "./contributor-link"
import { type LikedItemPublic, getPublicLikedItems } from "./get.action"
import "./likes.scss"

export const metadata: Metadata = {
  title: "Things we like",
  description:
    "A curated collection of tools, resources, and products that the #play14 community recommends.",
}

export const revalidate = 3600 // Revalidate every hour

function getImageUrl(item: LikedItemPublic): string | null {
  if (!item.image) return null
  const baseUrl = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337"
  const url = item.image.formats?.medium?.url || item.image.formats?.small?.url || item.image.url
  return url.startsWith("http") ? url : `${baseUrl}${url}`
}

function getAvatarUrl(contributor: LikedItemPublic["contributors"][0]): string | null {
  if (!contributor.avatar) return null
  const baseUrl = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337"
  const url =
    contributor.avatar.formats?.thumbnail?.url ||
    contributor.avatar.formats?.small?.url ||
    contributor.avatar.url
  return url.startsWith("http") ? url : `${baseUrl}${url}`
}

export default async function LikesPage() {
  const items = await getPublicLikedItems()

  return (
    <div className="likes-page">
      <header className="likes-header">
        <div className="centered">
          <h1>Things we like</h1>
          <p>
            A curated collection of tools, resources, and products that the #play14 community
            recommends.
          </p>
        </div>
      </header>

      <section className="likes-content">
        <div className="centered">
          {items.length === 0 ? (
            <div className="likes-empty">
              <i className="bx bx-heart" />
              <h2>Coming Soon</h2>
              <p>We&apos;re building a collection of things we love. Check back soon!</p>
            </div>
          ) : (
            <div className="likes-grid">
              {items.map((item) => {
                const imageUrl = getImageUrl(item)
                return (
                  <a
                    key={item.documentId}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="liked-item-card"
                  >
                    <div className="liked-item-image">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={item.name}
                          width={200}
                          height={200}
                          style={{ objectFit: "contain" }}
                        />
                      ) : (
                        <div className="liked-item-placeholder">
                          <i className="bx bx-link-external" />
                        </div>
                      )}
                    </div>
                    <div className="liked-item-info">
                      <h3>{item.name}</h3>
                      {item.description && (
                        <p className="liked-item-description">{item.description}</p>
                      )}
                      {item.contributors.length > 0 && (
                        <div className="liked-item-contributors">
                          <span className="contributors-label">Recommended by:</span>
                          <div className="contributors-avatars">
                            {item.contributors.map((contributor) => {
                              const avatarUrl = getAvatarUrl(contributor)
                              return (
                                <ContributorLink
                                  key={contributor.documentId}
                                  href={`/players/${contributor.slug}`}
                                  name={contributor.name}
                                  avatarUrl={avatarUrl}
                                />
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="liked-item-external">
                      <i className="bx bx-link-external" />
                    </div>
                  </a>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
