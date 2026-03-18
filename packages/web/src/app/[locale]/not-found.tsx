import type { Metadata } from "next"
import Image from "next/image"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"

export const metadata: Metadata = {
  title: "Not found",
}

export default async function NotFoundPage() {
  const t = await getTranslations("common")

  return (
    <div className="pt-70" style={{ textAlign: "center" }}>
      <h1>404: {t("notFound")}</h1>
      <p style={{ marginBottom: "2rem" }}>{t("notFoundDescription")}</p>
      <Image
        src="/play14_broken.png"
        alt="#play14 404"
        width={1000}
        height={385}
        style={{ marginTop: "2rem", marginBottom: "2rem" }}
        unoptimized
      />
      <p style={{ marginTop: "2rem" }}>
        <b>
          <Link href="/" className="orange">
            {t("backToHome")}
          </Link>
        </b>
      </p>
    </div>
  )
}
