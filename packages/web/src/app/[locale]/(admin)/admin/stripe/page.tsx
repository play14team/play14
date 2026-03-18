import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import StripeConnect from "@/components/admin/stripe-connect"
import { getAuthCookie } from "@/libs/auth"
import { getStripeAccountStatus } from "./stripe-connect.action"

export async function generateMetadata() {
  const t = await getTranslations("adminMisc.stripe")
  return {
    title: t("title"),
    description: t("subtitle"),
  }
}

export default async function StripeAdminPage() {
  const t = await getTranslations("adminMisc.stripe")
  const jwt = await getAuthCookie()

  if (!jwt) {
    redirect("/auth/login?redirect=/admin/stripe")
  }

  const account = await getStripeAccountStatus()

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div className="admin-page-header-content">
          <h1>{t("title")}</h1>
          <p>{t("subtitle")}</p>
        </div>
      </div>

      <div className="admin-form">
        <div className="admin-form-section">
          <h2>{t("paymentAccount")}</h2>
          <StripeConnect account={account} returnPath="/admin/stripe" />
        </div>

        <div className="admin-form-section admin-info-section">
          <h2>{t("howItWorks")}</h2>
          <div className="stripe-info-content">
            <div className="stripe-info-item">
              <i className="bx bx-link" />
              <div>
                <h4>{t("connectAccount")}</h4>
                <p>{t("connectAccountDescription")}</p>
              </div>
            </div>
            <div className="stripe-info-item">
              <i className="bx bx-calendar-event" />
              <div>
                <h4>{t("linkToEvents")}</h4>
                <p>{t("linkToEventsDescription")}</p>
              </div>
            </div>
            <div className="stripe-info-item">
              <i className="bx bx-credit-card" />
              <div>
                <h4>{t("getPaid")}</h4>
                <p>{t("getPaidDescription")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
