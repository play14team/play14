import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import Page from "@/components/layout/page"
import NewsletterSignup from "@/components/newsletter/newsletter-signup"
import { Link } from "@/i18n/navigation"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contact")
  return {
    title: t("title"),
  }
}

export default async function Contact() {
  const t = await getTranslations("contact")

  return (
    <Page name={t("title")}>
      {/* Stay in touch section */}
      <section className="pt-70 pb-70">
        <div className="container">
          <div className="section-title">
            <h2>{t("stayInTouch")}</h2>
            <p>{t("stayInTouchSub")}</p>
          </div>

          <div className="row pt-4">
            {/* Slack */}
            <div className="col-lg-4 col-md-6 mb-4">
              <div className="contact-card">
                <div className="contact-card-icon contact-card-icon-slack">
                  <i className="bx bxl-slack" />
                </div>
                <h3>{t("slack.title")}</h3>
                <p>{t("slack.description")}</p>
                <div className="contact-card-illustration">
                  <i className="bx bxl-slack" />
                </div>
                <div className="contact-card-action">
                  <a
                    href="http://bit.ly/play14slack"
                    target="_blank"
                    rel="noreferrer"
                    className="default-btn contact-btn-slack"
                  >
                    <i className="bx bxl-slack" />
                    {t("slack.action")}
                  </a>
                </div>
              </div>
            </div>

            {/* WhatsApp */}
            <div className="col-lg-4 col-md-6 mb-4">
              <div className="contact-card">
                <div className="contact-card-icon contact-card-icon-whatsapp">
                  <i className="bx bxl-whatsapp" />
                </div>
                <h3>{t("whatsapp.title")}</h3>
                <p>{t("whatsapp.description")}</p>
                <div className="contact-card-illustration">
                  <i className="bx bxl-whatsapp" />
                </div>
                <div className="contact-card-action">
                  <a
                    href="https://chat.whatsapp.com/DZmv5EfHRCf5VnGWf7MH1W"
                    target="_blank"
                    rel="noreferrer"
                    className="default-btn contact-btn-whatsapp"
                  >
                    <i className="bx bxl-whatsapp" />
                    {t("whatsapp.action")}
                  </a>
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="col-lg-4 col-md-6 mb-4">
              <div className="contact-card">
                <div className="contact-card-icon contact-card-icon-email">
                  <i className="bx bx-message-dots" />
                </div>
                <h3>{t("email.title")}</h3>
                <p>{t("email.description")}</p>
                <div className="contact-card-illustration">
                  <i className="bx bx-envelope" />
                </div>
                <div className="contact-card-action">
                  <a href="mailto:team@play14.org" className="default-btn contact-btn-email">
                    <i className="bx bx-envelope" />
                    {t("email.action")}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Newsletter - centered below */}
          <div className="newsletter-section-centered">
            <h3>{t("newsletter.title")}</h3>
            <p>{t("newsletter.subtitle")}</p>
            <NewsletterSignup source="contact" />
          </div>
        </div>
      </section>

      {/* Social media section */}
      <section className="bg-fafafb pt-70 pb-70">
        <div className="container">
          <div className="section-title">
            <h2>{t("followUs")}</h2>
            <p>{t("followUsSub")}</p>
          </div>

          <div className="social-links-grid pt-4">
            <a
              href="https://www.linkedin.com/groups/7478250"
              target="_blank"
              rel="noreferrer"
              className="social-link-card"
              aria-label="LinkedIn group"
            >
              <i className="bx bxl-linkedin" />
              <span>LinkedIn</span>
            </a>
            <a
              href="https://twitter.com/play14team"
              target="_blank"
              rel="noreferrer"
              className="social-link-card"
              aria-label="Twitter"
            >
              <i className="bx bxl-twitter" />
              <span>Twitter</span>
            </a>
            <a
              href="https://www.youtube.com/channel/UCk_bP4BFqSSA4dqUz9cRK8A"
              target="_blank"
              rel="noreferrer"
              className="social-link-card"
              aria-label="YouTube channel"
            >
              <i className="bx bxl-youtube" />
              <span>YouTube</span>
            </a>
            <a
              href="https://www.facebook.com/Play14-making-the-world-more-fun-than-fun-315955075134911/"
              target="_blank"
              rel="noreferrer"
              className="social-link-card"
              aria-label="Facebook page"
            >
              <i className="bx bxl-facebook" />
              <span>Facebook</span>
            </a>
          </div>
        </div>
      </section>

      {/* Organization info */}
      <section className="pt-70 pb-100">
        <div className="container">
          <div className="section-title">
            <h2>{t("organization.title")}</h2>
            <p>{t("organization.subtitle")}</p>
          </div>

          <div className="row pt-4 align-items-center">
            <div className="col-lg-6">
              <div className="org-info">
                <h3>
                  <i className="bx bx-building-house" /> {t("organization.name")}
                </h3>
                <p>
                  {t.rich("organization.description", {
                    lbr: (chunks) => (
                      <a href="https://www.lbr.lu" target="_blank" rel="noreferrer">
                        {chunks}
                      </a>
                    ),
                    strong: (chunks) => <strong>{chunks}</strong>,
                  })}
                </p>
                <p>
                  {t.rich("organization.statutes", {
                    statutes: (chunks) => (
                      <a href="https://gd.lu/resa/9NNCL4" target="_blank" rel="noreferrer">
                        {chunks}
                      </a>
                    ),
                    law: (chunks) => (
                      <a
                        href="http://www.mj.public.lu/legislation/asbl_fondations/2009_Loi_21_avril_1928.pdf"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {chunks}
                      </a>
                    ),
                  })}
                </p>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="org-address">
                <h4>
                  <i className="bx bx-map" /> {t("organization.address")}
                </h4>
                <address>
                  #play14 a.s.b.l.
                  <br />
                  46 boulevard Jules Salentiny
                  <br />
                  L-2511 Luxembourg
                  <br />
                  Luxembourg
                </address>
                <p>
                  <i className="bx bx-envelope" />{" "}
                  <Link href="mailto:team@play14.org">team@play14.org</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Page>
  )
}
