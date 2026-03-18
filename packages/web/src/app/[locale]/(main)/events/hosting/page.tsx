import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import Page from "@/components/layout/page"
import type { Locale } from "@/i18n/routing"
import { loadMDX } from "@/libs/mdx"
import styles from "./hosting.module.scss"
import { getMDXComponents } from "./mdx-components"

interface HostingPageProps {
  params: Promise<{ locale: Locale }>
}

export async function generateMetadata({ params }: HostingPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "hosting" })
  return {
    title: t("metadata.title"),
    description: t("metadata.description"),
  }
}

async function TableOfContents({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "hosting.toc" })

  return (
    <nav className={styles.toc}>
      <h3>{t("title")}</h3>

      <h4>{t("part1")}</h4>
      <ol>
        <li>
          <a href="#becoming-host">{t("section1")}</a>
        </li>
        <li>
          <a href="#responsibilities">{t("section2")}</a>
        </li>
        <li>
          <a href="#venue">{t("section3")}</a>
        </li>
        <li>
          <a href="#materials">{t("section4")}</a>
        </li>
        <li>
          <a href="#food-drinks">{t("section5")}</a>
        </li>
        <li>
          <a href="#support">{t("section6")}</a>
        </li>
        <li>
          <a href="#website">{t("section7")}</a>
        </li>
        <li>
          <a href="#marketing">{t("section8")}</a>
        </li>
        <li>
          <a href="#merchandising">{t("section9")}</a>
        </li>
        <li>
          <a href="#budget">{t("section10")}</a>
        </li>
        <li>
          <a href="#sustainability">{t("section11")}</a>
        </li>
      </ol>

      <h4>{t("part2")}</h4>
      <ol start={12}>
        <li>
          <a href="#before-the-day">{t("section12")}</a>
        </li>
        <li>
          <a href="#preparing-venue">{t("section13")}</a>
        </li>
        <li>
          <a href="#arriving">{t("section14")}</a>
        </li>
        <li>
          <a href="#pre-kickoff">{t("section15")}</a>
        </li>
        <li>
          <a href="#starting">{t("section16")}</a>
        </li>
        <li>
          <a href="#group-activities">{t("section17")}</a>
        </li>
        <li>
          <a href="#open-free-activities">{t("section18")}</a>
        </li>
      </ol>

      <h4>{t("part3")}</h4>
      <ol start={19}>
        <li>
          <a href="#starting-day">{t("section19")}</a>
        </li>
        <li>
          <a href="#game-sessions">{t("section20")}</a>
        </li>
        <li>
          <a href="#meals">{t("section21")}</a>
        </li>
      </ol>

      <h4>{t("part4")}</h4>
      <ol start={22}>
        <li>
          <a href="#retrospective">{t("section22")}</a>
        </li>
        <li>
          <a href="#cleanup">{t("section23")}</a>
        </li>
        <li>
          <a href="#goodbye">{t("section24")}</a>
        </li>
      </ol>

      <h4>{t("part5")}</h4>
      <ol start={25}>
        <li>
          <a href="#thank-you">{t("section25")}</a>
        </li>
        <li>
          <a href="#team-retro">{t("section26")}</a>
        </li>
        <li>
          <a href="#financial">{t("section27")}</a>
        </li>
        <li>
          <a href="#publishing">{t("section28")}</a>
        </li>
        <li>
          <a href="#announce-next">{t("section29")}</a>
        </li>
      </ol>

      <h4>{t("appendix")}</h4>
      <ol start={30}>
        <li>
          <a href="#code-of-conduct">{t("section30")}</a>
        </li>
        <li>
          <a href="#open-space-principles">{t("section31")}</a>
        </li>
        <li>
          <a href="#manifesto">{t("section32")}</a>
        </li>
      </ol>
    </nav>
  )
}

export default async function HostingPage({ params }: HostingPageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "hosting" })
  const components = getMDXComponents()
  const { content } = await loadMDX(`hosting/${locale}.mdx`, components)

  return (
    <>
      <Page name={t("pageTitle")} />
      <aside className={styles.tocSidebar}>
        <TableOfContents locale={locale} />
      </aside>

      <div className={`container ${styles.hosting}`}>
        <div className={styles.tocInline}>
          <TableOfContents locale={locale} />
        </div>

        {content}
      </div>
    </>
  )
}
