import Image from "next/image"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import NewsletterSignup from "@/components/newsletter/newsletter-signup"
import { Link as I18nLink } from "@/i18n/navigation"
import { buildIssueReportUrl } from "@/libs/issue-report"
import footerMap from "@/styles/images/footer-map.png"
import Logo from "./logo"

const socialLinks = [
  {
    url: "https://www.linkedin.com/groups/7478250",
    icon: "linkedin",
    label: "LinkedIn",
  },
  {
    url: "https://twitter.com/play14team",
    icon: "twitter",
    label: "Twitter",
  },
  {
    url: "https://www.youtube.com/channel/UCk_bP4BFqSSA4dqUz9cRK8A",
    icon: "youtube",
    label: "YouTube",
  },
  {
    url: "https://www.facebook.com/Play14-making-the-world-more-fun-than-fun-315955075134911/",
    icon: "facebook",
    label: "Facebook",
  },
]

const Footer = async () => {
  const t = await getTranslations("footer")
  const currentYear = new Date().getFullYear()

  return (
    <footer className="footer-area bg-color">
      <div className="container">
        <div className="row">
          <div className="col-lg-3 col-sm-6">
            <div className="single-footer-widget text-center">
              <I18nLink href="/" className="logo d-inline-block">
                <Logo width={250} height={83} />
              </I18nLink>
              <p className="mt-3">{t("tagline")}</p>

              <ul className="social-link justify-content-center">
                {socialLinks.map((action, index) => {
                  return (
                    <li key={index}>
                      <Link
                        href={action.url}
                        className="d-block"
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`${action.label} (opens in new tab)`}
                      >
                        <i className={`bx bxl-${action.icon}`} aria-hidden="true" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>

          <div className="col-lg-4 col-sm-6">
            <div className="single-footer-widget">
              <h3>{t("stayUpdated")}</h3>
              <NewsletterSignup source="footer" />
            </div>
          </div>

          <div className="col-lg-2 col-sm-6 ps-lg-5">
            <div className="single-footer-widget">
              <h3>{t("explore")}</h3>

              <ul className="footer-links-list">
                <li>
                  <I18nLink href="/">{t("home")}</I18nLink>
                </li>
                <li>
                  <I18nLink href="/about/story">{t("about")}</I18nLink>
                </li>
                <li>
                  <I18nLink href="/contact">{t("contact")}</I18nLink>
                </li>
              </ul>
            </div>
          </div>

          <div className="col-lg-3 col-sm-6">
            <div className="single-footer-widget">
              <h3>{t("resources")}</h3>

              <ul className="footer-links-list">
                <li>
                  <I18nLink href="/events">{t("ourEvents")}</I18nLink>
                </li>
                <li>
                  <I18nLink href="/players">{t("ourPlayers")}</I18nLink>
                </li>
                <li>
                  <I18nLink href="/games">{t("ourGames")}</I18nLink>
                </li>
                <li>
                  <I18nLink href="/articles">{t("ourArticles")}</I18nLink>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="footer-bottom-area">
          <div className="row align-items-center">
            <div className="col-lg-6 col-md-6">
              <p>
                {t.rich("copyright", {
                  year: currentYear,
                  strong: (chunks) => <strong>{chunks}</strong>,
                  author: (chunks) => (
                    <Link
                      href="https://www.linkedin.com/in/c%C3%A9dric-pontet/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
            </div>

            <div className="col-lg-6 col-md-6">
              <ul>
                <li>
                  <I18nLink href="/privacy">{t("privacyPolicy")}</I18nLink>
                </li>
                <li>
                  <I18nLink href="/terms">{t("termsOfService")}</I18nLink>
                </li>
                <li>
                  <Link href={buildIssueReportUrl()} target="_blank" rel="noreferrer">
                    {t("reportAnIssue")}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-map">
        <Image
          src={footerMap}
          alt=""
          style={{
            maxWidth: "100%",
            height: "auto",
          }}
          unoptimized
        />
      </div>
    </footer>
  )
}

export default Footer
