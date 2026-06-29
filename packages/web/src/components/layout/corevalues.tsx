import { getTranslations } from "next-intl/server"

interface CoreValuesProps {
  // When true, render the longer per-value descriptions (used on /about/values).
  // When false (default), render the short one-liners (used on the home page).
  detailed?: boolean
}

const VALUES = [
  { key: "openness", icon: "bx-lock-open-alt", color: "orange" },
  { key: "inclusion", icon: "bx-group", color: "blue" },
  { key: "connection", icon: "bx-link", color: "green" },
  { key: "curiosity", icon: "bx-compass", color: "orange" },
  { key: "sharing", icon: "bx-gift", color: "blue" },
  { key: "courage", icon: "bx-rocket", color: "green" },
] as const

const CoreValues = async ({ detailed = false }: CoreValuesProps) => {
  const t = await getTranslations("home.coreValues")

  return (
    <div className={`core-values${detailed ? " core-values-detailed" : ""}`}>
      {detailed && <h3 className="core-values-title">{t("title")}</h3>}
      <div className="row justify-content-center">
        {VALUES.map((value) => (
          <div className="col-lg-4 col-md-6" key={value.key}>
            <div className="core-value">
              <div className="core-value-icon">
                <i className={`bx ${value.icon} ${value.color}`} aria-hidden="true" />
              </div>
              <h3>{t(`${value.key}.name` as Parameters<typeof t>[0])}</h3>
              <p>{t(`${value.key}.${detailed ? "detail" : "short"}` as Parameters<typeof t>[0])}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CoreValues
