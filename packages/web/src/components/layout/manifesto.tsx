import { getTranslations } from "next-intl/server"

interface ManifestoProps {
  showCard?: boolean
}

const Manifesto = async ({ showCard = true }: ManifestoProps) => {
  const t = await getTranslations("home")
  const wrapperClass = showCard ? "single-funfacts-box values-card" : "values-content"

  const richOptions = {
    strong: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
  }

  return (
    <div className={wrapperClass}>
      {showCard ? (
        <div className="icon">
          <i className="bx bx-book-heart orange" aria-hidden="true" />
        </div>
      ) : (
        <div className="values-header">
          <i className="bx bx-book-heart orange" aria-hidden="true" />
          <h3>{t("manifestoContent.title")}</h3>
        </div>
      )}
      {showCard && <h3>{t("manifestoContent.title")}</h3>}
      <p>{t.rich("manifestoContent.intro", richOptions)}</p>
      <ul>
        <li>
          <i className="bx bx-share-alt blue" aria-hidden="true" />
          <span>{t.rich("manifestoContent.shareKnowledge", richOptions)}</span>
        </li>
        <li>
          <i className="bx bx-door-open green" aria-hidden="true" />
          <span>{t.rich("manifestoContent.openToAll", richOptions)}</span>
        </li>
        <li>
          <i className="bx bx-world orange" aria-hidden="true" />
          <span>{t.rich("manifestoContent.physicalWorld", richOptions)}</span>
        </li>
        <li>
          <i className="bx bx-conversation blue" aria-hidden="true" />
          <span>{t.rich("manifestoContent.unconference", richOptions)}</span>
        </li>
        <li>
          <i className="bx bx-heart green" aria-hidden="true" />
          <span>{t.rich("manifestoContent.nonProfit", richOptions)}</span>
        </li>
      </ul>
    </div>
  )
}

export default Manifesto
