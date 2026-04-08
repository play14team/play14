import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
import { getStory } from "@/components/about/get.action"
import HistoryItem from "@/components/about/historyitem"
import HtmlContent from "@/components/layout/html-content"
import Page from "@/components/layout/page"
import PlayerGrid from "@/components/players/grid"
import type { Enum_Componentdefaulthistoryitem_Dateformat, History, Player } from "@/models/strapi"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("about.story")
  return {
    title: `About | ${t("title")}`,
  }
}

export default async function Story() {
  const t = await getTranslations("about.story")
  const locale = await getLocale()
  const response = await getStory(locale)
  const founders = (response?.founders || []) as Player[]
  const history = response.history as History | undefined

  return (
    <Page name={t("title")}>
      <section className="history-area pt-70 pb-100">
        <div className="container  bg-fafafb pt-5 pb-70">
          <div className="section-title">
            {history && <h3>{history.founders || t("founders")}</h3>}
          </div>
          {history?.intro && (
            <div className="px-5">
              <HtmlContent>{history.intro}</HtmlContent>
            </div>
          )}
          <div className="pt-5">{founders && <PlayerGrid players={founders} />}</div>

          <div className="section-title pt-70">
            {history && <h3>{history.keyMoments || t("keyMoments")}</h3>}
          </div>

          <ol className="timeline history-timeline">
            {history?.items?.map((item) => (
              <HistoryItem
                key={item?.id}
                date={item?.date}
                dateFormat={item?.dateFormat as Enum_Componentdefaulthistoryitem_Dateformat}
                additionalText={item?.additionalText || ""}
                title={item?.title || ""}
                image={item?.image?.url || ""}
                imageAlt={item?.image?.name || ""}
              >
                <HtmlContent>{item?.description || ""}</HtmlContent>
              </HistoryItem>
            ))}
          </ol>
        </div>
      </section>
    </Page>
  )
}
