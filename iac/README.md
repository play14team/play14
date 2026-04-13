# Infrastructure as Code

Top-level IaC for #play14. Provider directories sit side-by-side so a migration
can stage a new environment without touching the live one.

| Directory | Provider | Status |
|---|---|---|
| [`clever-cloud/`](./clever-cloud/) | Clever Cloud (Node.js + PostgreSQL + Cellar + Redis) | **Active** — target of the 2026-Q2 migration |
| `packages/api/iac/` (Bicep) | Azure Container Apps + Azure Database for PostgreSQL + Azure Blob Storage | Legacy — being retired post-cutover (7 days after DNS flip) |

The Bicep templates live next to the API package because they were API-only.
The Clever Cloud scripts manage both `play14-api` and `play14-web` (the whole
deployable surface), so they live at the repo root.

See [`clever-cloud/README.md`](./clever-cloud/README.md) for the day-to-day
provisioning workflow.
