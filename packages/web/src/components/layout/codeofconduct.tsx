import { getTranslations } from "next-intl/server"

interface CodeOfConductProps {
  showCard?: boolean
}

const CodeOfConduct = async ({ showCard = true }: CodeOfConductProps) => {
  const t = await getTranslations("home")
  const wrapperClass = showCard ? "single-funfacts-box values-card" : "values-content"

  const richOptions = {
    strong: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
  }

  return (
    <div className={wrapperClass}>
      {showCard ? (
        <div className="icon">
          <i className="bx bx-shield-quarter blue" aria-hidden="true" />
        </div>
      ) : (
        <div className="values-header">
          <i className="bx bx-shield-quarter blue" aria-hidden="true" />
          <h3>{t("codeOfConduct.title")}</h3>
        </div>
      )}
      {showCard && <h3>{t("codeOfConduct.title")}</h3>}
      <ul>
        <li>
          <i className="bx bx-brain orange" aria-hidden="true" />
          <span>{t.rich("codeOfConduct.openMinded", richOptions)}</span>
        </li>
        <li>
          <i className="bx bx-bulb green" aria-hidden="true" />
          <span>{t.rich("codeOfConduct.propose", richOptions)}</span>
        </li>
        <li>
          <i className="bx bx-block blue" aria-hidden="true" />
          <span>{t.rich("codeOfConduct.noHighjack", richOptions)}</span>
        </li>
        <li>
          <i className="bx bx-time orange" aria-hidden="true" />
          <span>{t.rich("codeOfConduct.timebox", richOptions)}</span>
        </li>
        <li>
          <i className="bx bx-user-check green" aria-hidden="true" />
          <span>{t.rich("codeOfConduct.behave", richOptions)}</span>
        </li>
        <li>
          <i className="bx bx-leaf blue" aria-hidden="true" />
          <span>{t.rich("codeOfConduct.clean", richOptions)}</span>
        </li>
        <li>
          <i className="bx bx-happy-heart-eyes orange" aria-hidden="true" />
          <span>{t.rich("codeOfConduct.fun", richOptions)}</span>
        </li>
      </ul>
      <p className={showCard ? "pt-3" : "values-summary"}>{t("codeOfConduct.summary")}</p>
    </div>
  )
}

export default CodeOfConduct
