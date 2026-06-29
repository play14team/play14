import { getTranslations } from "next-intl/server"
import EventsWorldMap from "@/components/events/EventsWorldMap"
import Expectations from "@/components/home/expectations"
import Faq from "@/components/home/faq"
import HomeGallery from "@/components/home/gallery"
import Statistics from "@/components/home/statistics"
import HomeTestimonials from "@/components/home/testimonials"
import UpcomingEvents from "@/components/home/upcoming"
import CodeOfConduct from "@/components/layout/codeofconduct"
import CoreValues from "@/components/layout/corevalues"
import Manifesto from "@/components/layout/manifesto"
import Title from "@/components/layout/title"
import { Link } from "@/i18n/navigation"
import { Enum_Expectation_Type } from "@/models/strapi"

export const revalidate = 3600

export default async function Home() {
  const t = await getTranslations("home")

  return (
    <>
      <section id="title">
        <Title />
        <div className="container">
          <div className="section-title">
            <h2>{t("hero.headline")}</h2>
            <p>{t("hero.subhead")}</p>
          </div>
          <div className="d-flex justify-content-center">
            <Link href="/events" className="default-btn">
              <i className="flaticon-calendar" />
              {t("hero.cta")}
            </Link>
          </div>
        </div>
      </section>

      <section id="power-of-play" className="funfacts-area pt-100">
        <div className="container">
          <div className="section-title">
            <h2>
              {t.rich("powerOfPlay.title", {
                span: (chunks) => <span>{chunks}</span>,
              })}
            </h2>
            <p>{t("powerOfPlay.subtitle")}</p>
          </div>
          <p>
            {t.rich("powerOfPlay.intro", {
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
          <p>
            {t.rich("powerOfPlay.body", {
              unconference: (chunks) => <Link href="/about/format">{chunks}</Link>,
            })}
          </p>
          <div className="d-flex justify-content-center">
            <blockquote>
              {t("powerOfPlay.quote")}
              <br />
              <strong>
                <em className="d-flex justify-content-end pt-4">{t("powerOfPlay.quoteAuthor")}</em>
              </strong>
            </blockquote>
          </div>
          <p>{t("powerOfPlay.conclusion")}</p>
        </div>
      </section>

      <section id="join-the-movement" className="funfacts-area pt-100">
        <div className="container">
          <div className="section-title">
            <h2>
              {t.rich("joinMovement.title", {
                span: (chunks) => <span>{chunks}</span>,
              })}
            </h2>
            <p>{t("joinMovement.subtitle")}</p>
          </div>
          <p>{t("joinMovement.intro")}</p>
          <ul>
            <li>
              {t.rich("joinMovement.sandbox", {
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </li>
            <li>
              {t.rich("joinMovement.kindred", {
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </li>
            <li>
              {t.rich("joinMovement.connection", {
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </li>
          </ul>
        </div>
      </section>

      <section id="upcoming-events">
        <UpcomingEvents />
      </section>

      <section id="statistics">
        <Statistics />
      </section>

      <section id="world-map">
        <h2 className="sr-only">{t("worldMap.srTitle")}</h2>
        <EventsWorldMap interactive={true} />
      </section>

      <section id="activities" className="funfacts-area pt-100">
        <div className="container">
          <div className="section-title">
            <h2>
              {t.rich("experience.title", {
                span: (chunks) => <span>{chunks}</span>,
              })}
            </h2>
            <p>
              {t.rich("experience.subtitle", {
                players: (chunks) => <Link href="/players">{chunks}</Link>,
                games: (chunks) => <Link href="/games">{chunks}</Link>,
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </p>
          </div>
          <div className="d-flex justify-content-center">
            <blockquote>
              {t("experience.quote")}
              <br />
              <strong>
                <em className="d-flex justify-content-end pt-4">{t("experience.quoteAuthor")}</em>
              </strong>
            </blockquote>
          </div>
          <p className="pt-5">{t("experience.activitiesIntro")}</p>
          <ul>
            <li>
              {t.rich("experience.seriousGame", {
                link: (chunks) => (
                  <Link href="/games/ball-point-game" target="_blank">
                    {chunks}
                  </Link>
                ),
              })}
            </li>
            <li>
              {t.rich("experience.iceBreaker", {
                link: (chunks) => (
                  <Link href="/games/eggolution" target="_blank">
                    {chunks}
                  </Link>
                ),
              })}
            </li>
            <li>
              {t.rich("experience.warmUp", {
                warmup: (chunks) => (
                  <Link href="/games/brain-shock" target="_blank">
                    {chunks}
                  </Link>
                ),
                energizer: (chunks) => (
                  <Link href="/games/happy-salmon" target="_blank">
                    {chunks}
                  </Link>
                ),
              })}
            </li>
            <li>{t("experience.facilitation")}</li>
            <li>
              {t.rich("experience.teamBuilding", {
                link: (chunks) => (
                  <Link href="/games/cupcake-design-factory" target="_blank">
                    {chunks}
                  </Link>
                ),
              })}
            </li>
            <li>
              {t.rich("experience.gameDesign", {
                link: (chunks) => (
                  <Link href="/games/ball-runner" target="_blank">
                    {chunks}
                  </Link>
                ),
              })}
            </li>
            <li>{t("experience.soulSearching")}</li>
            <li>{t("experience.coaching")}</li>
            <li>{t("experience.brainstorming")}</li>
            <li>
              {t.rich("experience.creative", {
                link: (chunks) => (
                  <Link href="/games/doodling-together" target="_blank">
                    {chunks}
                  </Link>
                ),
              })}
            </li>
            <li>
              {t.rich("experience.funTime", {
                dancing: (chunks) => (
                  <Link href="https://youtu.be/N2quY1ZPF50" target="_blank" rel="noopener">
                    {chunks}
                  </Link>
                ),
                singing: (chunks) => (
                  <Link href="https://youtu.be/jpLCTQgHhqs" target="_blank" rel="noopener">
                    {chunks}
                  </Link>
                ),
              })}
            </li>
            <li>
              {t.rich("experience.improv", {
                link: (chunks) => (
                  <Link href="https://youtu.be/T7HPg2-xowc" target="_blank" rel="noopener">
                    {chunks}
                  </Link>
                ),
              })}
            </li>
            <li>{t("experience.esoteric")}</li>
          </ul>

          <p>
            {t.rich("experience.callToAction", {
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
        </div>
      </section>

      <section id="takeaways" className="funfacts-area pt-100">
        <div className="container">
          <div className="section-title">
            <h2>
              {t.rich("takeaways.title", {
                span: (chunks) => <span>{chunks}</span>,
              })}
            </h2>
            <p>{t("takeaways.subtitle")}</p>
          </div>
          <p>{t("takeaways.body1")}</p>
          <p>
            {t.rich("takeaways.body2", {
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
        </div>
      </section>

      <section id="cta" className="funfacts-area pt-100">
        <div className="container">
          <div className="section-title">
            <h2>
              {t.rich("cta.title", {
                span: (chunks) => <span>{chunks}</span>,
              })}
            </h2>
            <p>{t("cta.body")}</p>
          </div>
          <div className="d-flex justify-content-center">
            <Link href="/events" className="default-btn">
              <i className="flaticon-loupe" />
              {t("cta.primary")}
            </Link>
          </div>
          <p className="centered pt-4">
            {t.rich("cta.secondary", {
              link: (chunks) => <Link href="/events/hosting">{chunks}</Link>,
            })}
          </p>
        </div>
      </section>

      <section id="manifesto-and-code-of-conduct" className="funfacts-area pt-100">
        <div className="container">
          <div className="section-title">
            <h2>
              {t.rich("manifesto.title", {
                span: (chunks) => <span>{chunks}</span>,
              })}
            </h2>
            <p>
              {t.rich("manifesto.subtitle", {
                link: (chunks) => <Link href="/about/values">{chunks}</Link>,
              })}
            </p>
          </div>
          <div className="pt-4 pb-5">
            <CoreValues />
          </div>
          <div className="row justify-content-center">
            <div className="col-lg-10 col-md-12 pt-4">
              <Manifesto />
            </div>
            <div className="col-lg-10 col-md-12 pt-4">
              <CodeOfConduct />
            </div>
          </div>
        </div>
      </section>

      <section id="testimonials" className="funfacts-area pt-100">
        <div className="container">
          <div className="section-title">
            <h2>
              {t.rich("testimonials.title", {
                span: (chunks) => <span>{chunks}</span>,
              })}
            </h2>
            <p>{t("testimonials.subtitle")}</p>
          </div>
        </div>
        <HomeTestimonials />
      </section>

      <section id="gallery" className="funfacts-area pt-100">
        <div className="container">
          <div className="section-title">
            <h2>
              {t.rich("gallery.title", {
                span: (chunks) => <span>{chunks}</span>,
              })}
            </h2>
            <p>{t("gallery.subtitle")}</p>
          </div>
        </div>
        <HomeGallery />
      </section>

      <section id="benefits" className="funfacts-area pt-100">
        <div className="container">
          <div className="section-title">
            <h2>
              {t.rich("benefits.title", {
                span: (chunks) => <span>{chunks}</span>,
              })}
            </h2>
            <p>{t("benefits.subtitle")}</p>
          </div>
        </div>
        <Expectations type={Enum_Expectation_Type.Main} />
      </section>

      <section id="faq" className="funfacts-area pt-100 pb-70">
        <div className="container">
          <div className="section-title">
            <h2>
              {t.rich("faq.title", {
                span: (chunks) => <span>{chunks}</span>,
              })}
            </h2>
            <p>{t("faq.subtitle")}</p>
          </div>
          <div className="row justify-content-center">
            <div className="col-lg-10 col-md-12">
              <Faq />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
