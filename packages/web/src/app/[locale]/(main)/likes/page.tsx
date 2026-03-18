import type { Metadata } from "next"
import Image from "next/image"
import { getTranslations } from "next-intl/server"
import ContributorLink from "./contributor-link"
import { getPublicLikedItems, type LikedItemPublic } from "./get.action"
import "./likes.scss"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("likes")
  return {
    title: t("title"),
    description: t("description"),
  }
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
  const [items, t] = await Promise.all([getPublicLikedItems(), getTranslations("likes")])

  return (
    <div className="likes-page">
      <header className="likes-header">
        <div className="centered">
          <h1>{t("title")}</h1>
          <p>{t("description")}</p>
        </div>
      </header>

      <section className="likes-content">
        <div className="centered">
          {items.length === 0 ? (
            <div className="likes-empty">
              <i className="bx bx-heart" />
              <h2>{t("comingSoon")}</h2>
              <p>{t("comingSoonText")}</p>
            </div>
          ) : (
            <div className="likes-grid">
              {items.map((item) => {
                const imageUrl = getImageUrl(item)
                return (
                  <div key={item.documentId} className="liked-item-card">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="liked-item-link"
                      aria-label={`Visit ${item.name}`}
                    />
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
                          <span className="contributors-label">{t("recommendedBy")}</span>
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
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
