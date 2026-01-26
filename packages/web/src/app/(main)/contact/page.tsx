import Page from "@/components/layout/page"
import NewsletterSignup from "@/components/newsletter/newsletter-signup"
import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Contact",
}

export default function Contact() {
  return (
    <Page name="Contact">
      {/* Stay in touch section */}
      <section className="pt-70 pb-70">
        <div className="container">
          <div className="section-title">
            <h2>Stay in touch</h2>
            <p>Join our community and never miss an update</p>
          </div>

          <div className="row pt-4">
            {/* Slack */}
            <div className="col-lg-4 col-md-6 mb-4">
              <div className="contact-card">
                <div className="contact-card-icon contact-card-icon-slack">
                  <i className="bx bxl-slack" />
                </div>
                <h3>Slack community</h3>
                <p>
                  Connect with fellow players, share ideas, and stay updated on community
                  discussions.
                </p>
                <div className="contact-card-illustration">
                  <i className="bx bxl-slack" />
                </div>
                <div className="contact-card-action">
                  <Link
                    href="http://bit.ly/play14slack"
                    target="_blank"
                    rel="noreferrer"
                    className="default-btn contact-btn-slack"
                  >
                    <i className="bx bxl-slack" />
                    Join Slack
                  </Link>
                </div>
              </div>
            </div>

            {/* WhatsApp */}
            <div className="col-lg-4 col-md-6 mb-4">
              <div className="contact-card">
                <div className="contact-card-icon contact-card-icon-whatsapp">
                  <i className="bx bxl-whatsapp" />
                </div>
                <h3>WhatsApp community</h3>
                <p>
                  Join our WhatsApp group for real-time updates and quick conversations with the
                  community.
                </p>
                <div className="contact-card-illustration">
                  <i className="bx bxl-whatsapp" />
                </div>
                <div className="contact-card-action">
                  <Link
                    href="https://chat.whatsapp.com/DZmv5EfHRCf5VnGWf7MH1W"
                    target="_blank"
                    rel="noreferrer"
                    className="default-btn contact-btn-whatsapp"
                  >
                    <i className="bx bxl-whatsapp" />
                    Join WhatsApp
                  </Link>
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="col-lg-4 col-md-6 mb-4">
              <div className="contact-card">
                <div className="contact-card-icon contact-card-icon-email">
                  <i className="bx bx-message-dots" />
                </div>
                <h3>Send us a message</h3>
                <p>
                  Have a question, suggestion, or want to host an event? We&apos;d love to hear from
                  you.
                </p>
                <div className="contact-card-illustration">
                  <i className="bx bx-envelope" />
                </div>
                <div className="contact-card-action">
                  <Link href="mailto:team@play14.org" className="default-btn contact-btn-email">
                    <i className="bx bx-envelope" />
                    Email us
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Newsletter - centered below */}
          <div className="newsletter-section-centered">
            <h3>Subscribe to our newsletter</h3>
            <p>Get updates about upcoming events and community news delivered to your inbox.</p>
            <NewsletterSignup source="contact" />
          </div>
        </div>
      </section>

      {/* Social media section */}
      <section className="bg-fafafb pt-70 pb-70">
        <div className="container">
          <div className="section-title">
            <h2>Follow us</h2>
            <p>Stay connected on social media</p>
          </div>

          <div className="social-links-grid pt-4">
            <Link
              href="https://www.linkedin.com/groups/7478250"
              target="_blank"
              rel="noreferrer"
              className="social-link-card"
              aria-label="LinkedIn group"
            >
              <i className="bx bxl-linkedin" />
              <span>LinkedIn</span>
            </Link>
            <Link
              href="https://twitter.com/play14team"
              target="_blank"
              rel="noreferrer"
              className="social-link-card"
              aria-label="Twitter"
            >
              <i className="bx bxl-twitter" />
              <span>Twitter</span>
            </Link>
            <Link
              href="https://www.youtube.com/channel/UCk_bP4BFqSSA4dqUz9cRK8A"
              target="_blank"
              rel="noreferrer"
              className="social-link-card"
              aria-label="YouTube channel"
            >
              <i className="bx bxl-youtube" />
              <span>YouTube</span>
            </Link>
            <Link
              href="https://www.facebook.com/Play14-making-the-world-more-fun-than-fun-315955075134911/"
              target="_blank"
              rel="noreferrer"
              className="social-link-card"
              aria-label="Facebook page"
            >
              <i className="bx bxl-facebook" />
              <span>Facebook</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Organization info */}
      <section className="pt-70 pb-100">
        <div className="container">
          <div className="section-title">
            <h2>About the organization</h2>
            <p>A non-profit with a mission to spread the power of play</p>
          </div>

          <div className="row pt-4 align-items-center">
            <div className="col-lg-6">
              <div className="org-info">
                <h3>
                  <i className="bx bx-building-house" /> #play14 a.s.b.l.
                </h3>
                <p>
                  #play14 is a non-profit organization with headquarters in Luxembourg, registered
                  with the{" "}
                  <Link href="https://www.lbr.lu" target="_blank" rel="noreferrer">
                    Luxembourg Business Registers
                  </Link>{" "}
                  under number <strong>LUF11335</strong>.
                </p>
                <p>
                  Our{" "}
                  <Link href="https://gd.lu/resa/9NNCL4" target="_blank" rel="noreferrer">
                    statutes
                  </Link>{" "}
                  were published on May 22nd, 2018, in accordance with the{" "}
                  <Link
                    href="http://www.mj.public.lu/legislation/asbl_fondations/2009_Loi_21_avril_1928.pdf"
                    target="_blank"
                    rel="noreferrer"
                  >
                    law of April 21st, 1928
                  </Link>{" "}
                  on Associations and Foundations without lucrative purpose.
                </p>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="org-address">
                <h4>
                  <i className="bx bx-map" /> Address
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
