# Grafana alerting

Slack alerting for the play14 production apps, configured in Clever Cloud's
managed Grafana.

## Why this is UI-only

Clever Cloud's managed Grafana hardcodes all users to the **Editor** role, so
service account tokens and the Grafana provisioning HTTP API
(`/api/v1/provisioning/...`) are unreachable. Editor can still create contact
points, notification policies, and alert rules through the UI — that's the
path documented here. This README is the canonical source of truth for what
should exist in Grafana.

If we ever need IaC-driven provisioning, the options are: ask Clever Cloud
support for Grafana Org Admin elevation, or run a self-hosted Grafana app
pointing at the same Warp 10 / Prometheus endpoint.

## Prerequisites

- Two Slack incoming webhooks (created at <https://api.slack.com/apps>) for
  channels `#alerts-critical` and `#alerts-warning`.
- Editor access (default) to the managed Grafana — Console → Metrics → "Open
  Grafana".

## 1. Contact points

Grafana → Alerting → Contact points → **+ Add contact point**.

| Name | Integration | URL | Notes |
|---|---|---|---|
| `slack-critical` | Slack | (webhook for `#alerts-critical`) | Title: leave default. Text: leave default. |
| `slack-warning`  | Slack | (webhook for `#alerts-warning`)  | Title: leave default. Text: leave default. |

Click **Test** on each — confirm a message lands in the right channel — then
**Save**.

## 2. Notification policy

Grafana → Alerting → Notification policies → **Edit** the default (root)
policy.

- **Default contact point**: `slack-warning` (catch-all)
- **Group by**: `alertname`, `app_id`
- **Group wait**: `30s`
- **Group interval**: `5m`
- **Repeat interval**: `4h`

Add two **nested policies** under the root:

| Match label | Operator | Value | Contact point | Group wait | Repeat |
|---|---|---|---|---|---|
| `severity` | `=` | `critical` | `slack-critical` | `10s` | `1h` |
| `severity` | `=` | `warning`  | `slack-warning`  | `30s` | `4h` |

Leave **Continue matching** unchecked (default).

## 3. Alert rules

All rules use the **Prometheus** datasource (UID `promql`). Folder:
`play14-alerts` (create on first rule).

For each rule below: Grafana → Alerting → Alert rules → **+ New alert rule** →
"Grafana managed alert rule". Set the PromQL in query A, add an Expression B
of type **Threshold** with the listed condition, then fill labels and
annotations.

App IDs (paste into the queries):

- `play14-api` (prod): `app_f1350d9e-712a-4674-ab59-fe26a1e975ac`
- `play14-web` (prod): `app_64997ce6-6a47-44df-96a1-ca428d8a2578`

### 3.1 critical — `play14-api` down

```promql
absent_over_time(nodejs_version_info{app_id="app_f1350d9e-712a-4674-ab59-fe26a1e975ac"}[5m])
```

- **Condition**: `IS ABOVE 0` (B = `WHEN last() OF A IS ABOVE 0`)
- **Pending period (`for`)**: `2m`
- **Labels**: `severity=critical`, `app=play14-api`
- **Summary**: `play14-api is not being scraped`
- **Description**: `No metrics scraped from play14-api for 5 minutes — instance is likely down or the metrics endpoint stopped responding.`

### 3.2 critical — `play14-web` down

Same as 3.1 with the web app id:

```promql
absent_over_time(nodejs_version_info{app_id="app_64997ce6-6a47-44df-96a1-ca428d8a2578"}[5m])
```

- **Labels**: `severity=critical`, `app=play14-web`

### 3.3 critical — API 5xx rate > 5%

The strapi-prometheus plugin labels HTTP status as `status` (not
`status_code`). Use a Math expression for the ratio:

- Query **A**:

  ```promql
  sum(rate(http_request_duration_seconds_count{app_id="app_f1350d9e-712a-4674-ab59-fe26a1e975ac",status=~"5.."}[5m]))
  ```

- Query **B**:

  ```promql
  sum(rate(http_request_duration_seconds_count{app_id="app_f1350d9e-712a-4674-ab59-fe26a1e975ac"}[5m]))
  ```

- Math expression **C**: `$A / $B`
- Threshold **D**: `WHEN last() OF C IS ABOVE 0.05`
- **`for`**: `5m`
- **Labels**: `severity=critical`, `app=play14-api`
- **Summary**: `play14-api 5xx rate above 5%`

### 3.4 critical — Web 5xx rate > 5%

The Next.js metrics use `status_code` (not `status`).

- **A**: `sum(rate(nextjs_requests_total{app_id="app_64997ce6-6a47-44df-96a1-ca428d8a2578",status_code=~"5.."}[5m]))`
- **B**: `sum(rate(nextjs_requests_total{app_id="app_64997ce6-6a47-44df-96a1-ca428d8a2578"}[5m]))`
- **C**: `$A / $B`
- **D**: `IS ABOVE 0.05`, `for=5m`
- **Labels**: `severity=critical`, `app=play14-web`

### 3.5 critical — Stripe / ticket-order failures

```promql
sum(increase(play14_ticket_order_operations_total{app_id="app_f1350d9e-712a-4674-ab59-fe26a1e975ac",status="error"}[10m]))
```

- **Condition**: `IS ABOVE 0`
- **`for`**: `0m` (fire on first scrape that meets the condition)
- **Labels**: `severity=critical`, `app=play14-api`, `area=ticketing`
- **Summary**: `Ticket-order pipeline reporting errors`
- **Description**: `One or more ticket-order operations failed in the last 10 minutes — check Sentry/Strapi logs for stripe webhook failures or refund problems.`

### 3.6 warning — API p95 latency > 2s

```promql
histogram_quantile(
  0.95,
  sum by (le) (rate(http_request_duration_seconds_bucket{app_id="app_f1350d9e-712a-4674-ab59-fe26a1e975ac"}[5m]))
)
```

- **Condition**: `IS ABOVE 2`
- **`for`**: `10m`
- **Labels**: `severity=warning`, `app=play14-api`

### 3.7 warning — Web p95 latency > 2s

```promql
histogram_quantile(
  0.95,
  sum by (le) (rate(nextjs_request_duration_seconds_bucket{app_id="app_64997ce6-6a47-44df-96a1-ca428d8a2578"}[5m]))
)
```

- **Condition**: `IS ABOVE 2`, `for=10m`
- **Labels**: `severity=warning`, `app=play14-web`

### 3.8 warning — Event loop lag p99 > 200 ms

Apply twice (once per app id):

```promql
nodejs_eventloop_lag_p99_seconds{app_id="app_f1350d9e-712a-4674-ab59-fe26a1e975ac"}
```

- **Condition**: `IS ABOVE 0.2`, `for=5m`
- **Labels**: `severity=warning`, `app=play14-api` (or `play14-web` for the
  second copy)

### 3.9 warning — Process RSS approaching scaler limit

Adjust the threshold to ~90 % of the configured scaler RAM. The XS scaler is
1 GiB; 90 % ≈ 0.95 GiB ≈ `1_020_000_000` bytes. Bump the threshold whenever
you scale up.

```promql
process_resident_memory_bytes{app_id="app_f1350d9e-712a-4674-ab59-fe26a1e975ac"}
```

- **Condition**: `IS ABOVE 1020000000`
- **`for`**: `10m`
- **Labels**: `severity=warning`, `app=play14-api`

Apply a second copy for `play14-web` with the right app id and threshold.

## Verifying the pipeline

1. After each rule is saved, click its row → **Test** to confirm the query
   returns data.
2. Force a fire by temporarily lowering a threshold (e.g. set p95 latency to
   `IS ABOVE 0.001`). Confirm the message lands in `#alerts-warning`. Restore
   the threshold.
3. Repeat for `severity=critical` against `#alerts-critical`.

## Out of scope (deferred)

- DB connection-pool exhaustion, disk usage, CPU saturation — these come from
  Clever Cloud's platform Warp 10 metrics, not the app's Prometheus
  endpoint, and need separate panels + queries.
- Staging alerts — production-only for now. Alerting staging at the same
  thresholds generates false positives that train the team to ignore Slack.
- IaC provisioning — blocked by Editor-only role on managed Grafana. Revisit
  if Clever Cloud grants Admin or we move to self-hosted Grafana.
