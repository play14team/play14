import type { Metadata } from "next"
import Image from "next/image"
import { getTranslations } from "next-intl/server"
import CodeOfConduct from "@/components/layout/codeofconduct"
import CoreValues from "@/components/layout/corevalues"
import Manifesto from "@/components/layout/manifesto"
import Page from "@/components/layout/page"
import { Link } from "@/i18n/navigation"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("about.values")
  return {
    title: `About | ${t("title")}`,
  }
}

export default async function Values() {
  const t = await getTranslations("about.values")

  return (
    <Page name={t("title")}>
      <div className="container">
        <p className="pt-70">{t("intro")}</p>
        <p>
          {t.rich("thanksNina", {
            link: (chunks) => <Link href="/players/nina-neef">{chunks}</Link>,
          })}
        </p>

        <section className="pt-100">
          <p className="values-lead">{t("valuesIntro")}</p>
          <CoreValues detailed />
        </section>

        <section className="pt-100">
          <p className="values-lead">{t("manifestoIntro")}</p>
          <Manifesto />
          <div className="centered pt-5">
            <Image
              src="/values/manifesto-gray.jpg"
              alt="manifesto"
              className="shadow"
              width={600}
              height={800}
              style={{
                borderRadius: "10px",
                height: "auto",
                maxWidth: "100%",
              }}
              unoptimized
            />
          </div>
        </section>

        <section className="pt-100">
          <p className="values-lead">{t("cocIntro")}</p>
          <CodeOfConduct />
          <div className="centered pt-5">
            <Image
              src="/values/CoC-gray.jpg"
              alt="code of conduct"
              className="shadow"
              width={600}
              height={800}
              style={{
                borderRadius: "10px",
              }}
              unoptimized
            />
          </div>
        </section>

        <section className="pt-100 pb-100">
          <p className="values-lead">{t("scoutIntro")}</p>
          <h3 className="centered pb-3">{t("scoutRule")}</h3>
          <blockquote>{t("scoutSaying")}</blockquote>
          <p>{t("scoutText1")}</p>
          <p>{t("scoutText2")}</p>
        </section>
      </div>
    </Page>
  )
}
