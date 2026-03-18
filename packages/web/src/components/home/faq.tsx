"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"

const faqIds = [
  "eventDuration",
  "unconference",
  "proposeGame",
  "lawOfTwoFeet",
  "whoCanAttend",
  "commercial",
  "activities",
  "experience",
] as const

export default function Faq() {
  const t = useTranslations("home")
  const [openId, setOpenId] = useState<string | null>(null)

  const toggleItem = (id: string) => {
    setOpenId(openId === id ? null : id)
  }

  return (
    <div className="faq-accordion">
      <ul className="accordion">
        {faqIds.map((id) => {
          const isOpen = openId === id
          return (
            <li className="accordion__item" key={id}>
              <h3 className="accordion__heading">
                <button
                  className={`accordion__button${isOpen ? " active" : ""}`}
                  onClick={() => toggleItem(id)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${id}`}
                  id={`faq-button-${id}`}
                  type="button"
                >
                  <i className="bx bx-chevron-down" aria-hidden="true" />
                  <span>{t(`faq.${id}.question`)}</span>
                </button>
              </h3>
              <div
                id={`faq-panel-${id}`}
                role="region"
                aria-labelledby={`faq-button-${id}`}
                className={`accordion__panel${isOpen ? " show" : ""}`}
                hidden={!isOpen}
              >
                <p>
                  {t.rich(`faq.${id}.answer`, {
                    strong: (chunks) => <strong>{chunks}</strong>,
                  })}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
