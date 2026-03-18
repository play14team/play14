"use client"

import { useLocale, useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  getRevenueAnalytics,
  type RevenueAnalytics,
} from "@/app/[locale]/(admin)/admin/events/[slug]/revenue-analytics.action"
import styles from "./revenue-dashboard.module.scss"

interface Props {
  eventId: string
  onAnalyticsLoaded?: (netRevenue: number) => void
}

const STATUS_COLORS: Record<string, string> = {
  paid: "#4caf50",
  pending: "#ff9800",
  cancelled: "#9e9e9e",
  refunded: "#f44336",
  expired: "#607d8b",
}

export default function RevenueDashboard({ eventId, onAnalyticsLoaded }: Props) {
  const t = useTranslations("adminEvents.financeTab")
  const locale = useLocale()
  const [analytics, setAnalytics] = useState<RevenueAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true)
      setError(null)

      const data = await getRevenueAnalytics(eventId)

      if (!data) {
        setError(t("failedToLoad"))
        setLoading(false)
        return
      }

      setAnalytics(data)
      setLoading(false)

      // Notify parent of net revenue
      if (onAnalyticsLoaded) {
        onAnalyticsLoaded(data.summary.netRevenue)
      }
    }

    fetchAnalytics()
  }, [eventId, onAnalyticsLoaded])

  const formatCurrency = (amount: number, currency = "EUR") => {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(locale, { month: "short", day: "numeric" })
  }

  if (loading) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.loading}>
          <i className="bx bx-loader-alt bx-spin" />
          {t("loading")}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.dashboard}>
        <div className="admin-alert admin-alert-error">
          <i className="bx bx-error-circle" />
          {error}
        </div>
      </div>
    )
  }

  if (!analytics) {
    return null
  }

  const { summary, byStatus, byTicketType, timeline, discountUsage } = analytics

  // Check if there's any data
  const hasOrders = summary.totalOrders > 0
  const hasTimeline = timeline.length > 0

  // Prepare pie chart data
  const statusData = Object.entries(byStatus)
    .filter(([, data]) => data.count > 0)
    .map(([status, data]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: data.count,
      amount: data.amount,
      color: STATUS_COLORS[status] || "#9e9e9e",
    }))

  return (
    <div className={styles.dashboard}>
      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>
            <i className="bx bx-dollar-circle" />
          </div>
          <div className={styles.summaryContent}>
            <span className={styles.summaryLabel}>{t("totalRevenue")}</span>
            <span className={styles.summaryValue}>
              {formatCurrency(summary.totalRevenue, summary.currency)}
            </span>
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={`${styles.summaryIcon} ${styles.netRevenue}`}>
            <i className="bx bx-trending-up" />
          </div>
          <div className={styles.summaryContent}>
            <span className={styles.summaryLabel}>{t("netRevenue")}</span>
            <span className={styles.summaryValue}>
              {formatCurrency(summary.netRevenue, summary.currency)}
            </span>
            {summary.totalRefunded > 0 && (
              <span className={styles.summarySubtext}>
                {t("refunded", { amount: formatCurrency(summary.totalRefunded, summary.currency) })}
              </span>
            )}
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={`${styles.summaryIcon} ${styles.orders}`}>
            <i className="bx bx-receipt" />
          </div>
          <div className={styles.summaryContent}>
            <span className={styles.summaryLabel}>{t("paidOrders")}</span>
            <span className={styles.summaryValue}>{summary.totalOrders}</span>
            {summary.averageOrderValue > 0 && (
              <span className={styles.summarySubtext}>
                {t("avg", { amount: formatCurrency(summary.averageOrderValue, summary.currency) })}
              </span>
            )}
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={`${styles.summaryIcon} ${styles.tickets}`}>
            <i className="bx bxs-coupon" />
          </div>
          <div className={styles.summaryContent}>
            <span className={styles.summaryLabel}>{t("ticketsSold")}</span>
            <span className={styles.summaryValue}>{summary.totalTickets}</span>
          </div>
        </div>
      </div>

      {!hasOrders ? (
        <div className={styles.emptyState}>
          <i className="bx bx-chart" />
          <p>{t("noSalesYet")}</p>
        </div>
      ) : (
        <>
          {/* Revenue Timeline */}
          {hasTimeline && (
            <div className={styles.chartSection}>
              <h3 className={styles.chartTitle}>{t("revenueOverTime")}</h3>
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={timeline}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4caf50" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4caf50" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      stroke="var(--color-text-secondary)"
                      fontSize={12}
                    />
                    <YAxis
                      tickFormatter={(value) => formatCurrency(value, summary.currency)}
                      stroke="var(--color-text-secondary)"
                      fontSize={12}
                      width={80}
                    />
                    <Tooltip
                      formatter={(value) => [
                        formatCurrency(Number(value) || 0, summary.currency),
                        t("revenue"),
                      ]}
                      labelFormatter={(label) => formatDate(String(label))}
                      contentStyle={{
                        backgroundColor: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "6px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#4caf50"
                      fill="url(#revenueGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Charts Row */}
          <div className={styles.chartsRow}>
            {/* Revenue by Ticket Type */}
            {byTicketType.length > 0 && (
              <div className={styles.chartSection}>
                <h3 className={styles.chartTitle}>{t("revenueByTicketType")}</h3>
                <div className={styles.ticketTypeList}>
                  {byTicketType.map((ticket) => {
                    const maxRevenue = Math.max(...byTicketType.map((tt) => tt.revenue))
                    const percentage = maxRevenue > 0 ? (ticket.revenue / maxRevenue) * 100 : 0
                    return (
                      <div key={ticket.ticketTypeId} className={styles.ticketTypeItem}>
                        <div className={styles.ticketTypeInfo}>
                          <span className={styles.ticketTypeName}>{ticket.ticketTypeName}</span>
                          <span className={styles.ticketTypeMeta}>
                            {t("sold", { count: ticket.quantity })} &middot;{" "}
                            {formatCurrency(ticket.revenue, summary.currency)}
                          </span>
                        </div>
                        <div className={styles.ticketTypeBar}>
                          <div
                            className={styles.ticketTypeBarFill}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Order Status Breakdown */}
            {statusData.length > 0 && (
              <div className={styles.chartSection}>
                <h3 className={styles.chartTitle}>{t("orderStatus")}</h3>
                <div className={styles.statusChartWrapper}>
                  <div className={styles.chartContainer}>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name, entry) => [
                            `${t("ordersCount", { count: Number(value) })} (${formatCurrency(
                              (entry.payload as { amount: number }).amount,
                              summary.currency
                            )})`,
                            String(name),
                          ]}
                          contentStyle={{
                            backgroundColor: "var(--color-surface)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "6px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className={styles.statusLegend}>
                    {statusData.map((status) => (
                      <div key={status.name} className={styles.statusLegendItem}>
                        <span
                          className={styles.statusDot}
                          style={{ backgroundColor: status.color }}
                        />
                        <span className={styles.statusLegendName}>{status.name}</span>
                        <span className={styles.statusLegendValue}>{status.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Discount Usage */}
          {discountUsage.codesUsed > 0 && (
            <div className={styles.discountSection}>
              <h3 className={styles.chartTitle}>{t("discountUsage")}</h3>
              <div className={styles.discountStats}>
                <div className={styles.discountStat}>
                  <span className={styles.discountValue}>{discountUsage.codesUsed}</span>
                  <span className={styles.discountLabel}>{t("codesUsed")}</span>
                </div>
                <div className={styles.discountStat}>
                  <span className={styles.discountValue}>
                    {formatCurrency(discountUsage.totalDiscounted, summary.currency)}
                  </span>
                  <span className={styles.discountLabel}>{t("totalDiscounted")}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
