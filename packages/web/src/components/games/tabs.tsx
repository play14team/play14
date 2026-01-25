"use client"

import type { Game } from "@/models/strapi"
import Gallery from "../layout/gallery"
import HtmlContent from "../layout/html-content"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"

interface GameTabsProps {
  game: Game
}

export default function GameTabs({ game }: GameTabsProps) {
  const hasImages = game.images && game.images.length > 1
  const hasMaterials = game.materials && game.materials.length > 0
  const hasPreparation = game.preparationSteps && game.preparationSteps.length > 0
  const hasSafety = game.safety && game.safety.length > 0
  const hasDescription = Boolean(game.description)

  // Calculate image count for badge
  const imageCount = game.images?.filter(Boolean).length || 0

  return (
    <Tabs defaultValue="overview" className="mt-4">
      <TabsList role="tablist" aria-label="Game information tabs">
        <TabsTrigger value="overview">
          <i className="bx bx-info-circle" aria-hidden="true" />
          Overview
        </TabsTrigger>

        {(hasMaterials || hasPreparation) && (
          <TabsTrigger value="howto">
            <i className="bx bx-list-check" aria-hidden="true" />
            How to play
          </TabsTrigger>
        )}

        {hasSafety && (
          <TabsTrigger value="safety">
            <i className="bx bx-shield" aria-hidden="true" />
            Safety
          </TabsTrigger>
        )}

        {hasImages && (
          <TabsTrigger value="photos">
            <i className="bx bx-images" aria-hidden="true" />
            Photos
            <span className="ui-tabs-badge">{imageCount}</span>
          </TabsTrigger>
        )}
      </TabsList>

      {/* Overview tab */}
      <TabsContent value="overview">
        {hasDescription ? (
          <div className="game-details-description">
            <HtmlContent>{game.description}</HtmlContent>
          </div>
        ) : (
          <div className="game-details-empty">
            <i className="bx bx-file-blank" aria-hidden="true" />
            <p>No detailed description available for this game yet.</p>
          </div>
        )}
      </TabsContent>

      {/* How to play tab */}
      {(hasMaterials || hasPreparation) && (
        <TabsContent value="howto">
          <div className="row">
            {hasMaterials && (
              <div className="col-lg-6 col-md-12 mb-4">
                <div className="game-details-info-card">
                  <h3 className="game-details-section-title">
                    <i className="bx bx-box" aria-hidden="true" />
                    Materials needed
                  </h3>
                  <ul>
                    {game.materials?.map((m) => (
                      <li key={m?.id}>{m?.value}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {hasPreparation && (
              <div className="col-lg-6 col-md-12 mb-4">
                <div className="game-details-info-card">
                  <h3 className="game-details-section-title">
                    <i className="bx bx-task" aria-hidden="true" />
                    Preparation steps
                  </h3>
                  <ul>
                    {game.preparationSteps?.map((p) => (
                      <li key={p?.id}>{p?.value}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      )}

      {/* Safety tab */}
      {hasSafety && (
        <TabsContent value="safety">
          <div className="game-details-info-card game-details-safety-card">
            <h3 className="game-details-section-title">
              <i className="bx bx-error" aria-hidden="true" />
              Safety considerations
            </h3>
            <ul>
              {game.safety?.map((s) => (
                <li key={s?.id}>
                  <strong>{s?.key}:</strong> {s?.value}
                </li>
              ))}
            </ul>
          </div>
        </TabsContent>
      )}

      {/* Photos tab */}
      {hasImages && (
        <TabsContent value="photos">
          <Gallery
            images={
              game.images?.filter(Boolean) as Array<{
                url: string
                name?: string | null
              }>
            }
          />
        </TabsContent>
      )}
    </Tabs>
  )
}
