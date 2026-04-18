import type { Metadata } from "next"
import Image from "next/image"
import { getTranslations } from "next-intl/server"
import Expectations from "@/components/home/expectations"
import Page from "@/components/layout/page"
import { Enum_Expectation_Type } from "@/models/strapi"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("about.format")
  return {
    title: `About | ${t("title")}`,
  }
}

export default async function FormatPage() {
  const t = await getTranslations("about.format")

  return (
    <Page name={t("title")}>
      <section id="open space" className="container pt-70">
        <h2>{t("whatIsUnconference")}</h2>
        <p>
          {t.rich("unconferenceIntro", {
            link: (chunks) => (
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="http://en.wikipedia.org/wiki/Open_Space_Technology#Guiding_principles_and_one_law"
              >
                {chunks}
              </a>
            ),
          })}
        </p>
        <p>
          {t.rich("unconferenceContributors", {
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </p>
        <p>
          {t.rich("unconferenceParticipant", {
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </p>
        <p>
          {t.rich("funnyDrawings", {
            drawings: (chunks) => (
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://cdn.play14.org/strapi-uploads/assets/Open_Space_Principles_90f3d4c6a3.pdf"
              >
                {chunks}
              </a>
            ),
            author: (chunks) => (
              <a target="_blank" rel="noopener noreferrer" href="https://twitter.com/agilesensei">
                {chunks}
              </a>
            ),
          })}
        </p>
        <h3 className="pt-5">{t("principles")}</h3>
        <p>{t("principlesIntro")}</p>
        <ul>
          <li>
            <strong>{t("whoeverComes")}</strong>
            <p>{t("whoeverComesText")}</p>
          </li>
        </ul>
        <ul>
          <li>
            <strong>{t("wheneverStarts")}</strong>
            <p>{t("wheneverStartsText")}</p>
          </li>
        </ul>
        <ul>
          <li>
            <strong>{t("whereverItIs")}</strong>
            <p>{t("whereverItIsText")}</p>
          </li>
        </ul>
        <ul>
          <li>
            <strong>{t("whateverHappens")}</strong>
            <p>{t("whateverHappensText")}</p>
          </li>
        </ul>
        <ul>
          <li>
            <strong>{t("whenItsOver")}</strong>
            <p>{t("whenItsOverText")}</p>
          </li>
        </ul>
        <div className="centered pt-70">
          <Image
            src="/openspace/open-space-gray.jpg"
            alt="law of two feet"
            className="shadow"
            width={925}
            height={577}
            style={{
              borderRadius: "10px",
              height: "auto",
              maxWidth: "100%",
            }}
            unoptimized
          />
        </div>
        <div className="pt-70">
          <h3>{t("lawOfTwoFeet")}</h3>
          <div className="row">
            <div className="col-lg-6 col-md-12 pt-5">
              <p>{t("lawOfTwoFeetText")}</p>
            </div>
            <div className="col-lg-6 col-md-12 pt-5">
              <Image
                src="/openspace/two-feet-gray.jpg"
                alt="law of two feet"
                className="shadow"
                width={925}
                height={577}
                style={{
                  borderRadius: "10px",
                  height: "auto",
                  maxWidth: "100%",
                }}
                unoptimized
              />
            </div>
          </div>
        </div>

        <div className="container pt-70">
          <h3>{t("bumblebeeButterfly")}</h3>
          <div className="row">
            <div className="col-lg-4 col-md-12 pt-5">
              <Image
                src="/openspace/bumblebee-gray.jpg"
                alt="Bumblebee"
                className="shadow"
                width={603}
                height={614}
                style={{
                  borderRadius: "10px",
                  height: "auto",
                  maxWidth: "100%",
                }}
                unoptimized
              />
              <p className="pt-3">{t("butterflyText")}</p>
            </div>
            <div className="col-lg-2" />
            <div className="col-lg-4 col-md-12 pt-5">
              <p>{t("bumblebeeText")}</p>
              <Image
                src="/openspace/butterfly-gray.jpg"
                alt="Butterfly"
                className="shadow"
                width={1083}
                height={1033}
                style={{
                  borderRadius: "10px",
                  height: "auto",
                  maxWidth: "100%",
                }}
                unoptimized
              />
            </div>
          </div>
        </div>
      </section>

      <section id="marketplace">
        <div className="container pt-100">
          <h2>{t("howSchedule")}</h2>
          <p>{t("scheduleIntro")}</p>
          <p className="centered">
            <Image
              src="/openspace/marketplace.jpg"
              alt="Marketplace"
              className="shadow"
              width={1083}
              height={1033}
              style={{
                borderRadius: "10px",
                height: "auto",
                maxWidth: "100%",
              }}
              unoptimized
            />
          </p>
          <p>{t("marketplaceExplain")}</p>
          <h3 className="pt-5">{t("howPropose")}</h3>
          <p>{t("proposeIntro")}</p>
          <p>{t("proposeSteps")}</p>
          <ol>
            <li>{t("proposeStep1")}</li>
            <li>{t("proposeStep2")}</li>
            <li>{t("proposeStep3")}</li>
            <li>{t("proposeStep4")}</li>
            <li>{t("proposeStep5")}</li>
            <li>{t("proposeStep6")}</li>
          </ol>
          <div className="centered">
            <Image
              src="/openspace/propose_game.jpg"
              alt="How to propose a game"
              className="mt-5 shadow"
              width={1083}
              height={1033}
              style={{
                borderRadius: "10px",
                height: "auto",
                maxWidth: "100%",
              }}
              unoptimized
            />
          </div>

          <p className="pt-5">{t("proposeDetails")}</p>
          <p>{t("proposeKeepShort")}</p>
          <h3 className="pt-5">{t("notNewGame")}</h3>
          <p>{t("notNewGameText1")}</p>
          <p>{t("notNewGameText2")}</p>
          <h3 className="pt-5">{t("shouldDebrief")}</h3>
          <p>{t("shouldDebriefText1")}</p>
          <p>{t("shouldDebriefText2")}</p>
          <p>
            {t.rich("shouldDebriefText3", {
              link: (chunks) => (
                <a target="_blank" rel="noopener noreferrer" href="http://thedebriefingcube.com/">
                  {chunks}
                </a>
              ),
            })}
          </p>
          <h3 className="pt-5">{t("noGame")}</h3>
          <ul>
            <li>{t("noGameItem1")}</li>
            <li>{t("noGameItem2")}</li>
            <li>{t("noGameItem3")}</li>
            <li>{t("noGameItem4")}</li>
          </ul>
          <h3 className="pt-5">{t("whatMaterial")}</h3>
          <p>{t("materialIntro")}</p>
          <ul>
            <li>Sticky notes</li>
            <li>Markers</li>
            <li>Whiteboard</li>
            <li>Flipchart</li>
            <li>Masking tape</li>
            <li>Paper</li>
            <li>Scissors</li>
            <li>Playing cards</li>
            <li>Dice</li>
            <li>LEGO bricks</li>
            <li>...</li>
          </ul>
          <p>{t("materialSpecific")}</p>
          <h3 className="pt-70">{t("whatElse")}</h3>
          <p>{t("whatElseIntro")}</p>
          <Expectations type={Enum_Expectation_Type.Secondary} />
        </div>
      </section>
    </Page>
  )
}
