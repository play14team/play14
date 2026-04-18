# Infrastructure as Code

Top-level IaC for #play14. The platform is hosted on Clever Cloud; scripts
provision both `play14-api` and `play14-web`, plus the PostgreSQL, Cellar
(S3-compatible object storage), and Redis add-ons they depend on.

| Directory | Provider |
|---|---|
| [`clever-cloud/`](./clever-cloud/) | Clever Cloud (Node.js + PostgreSQL + Cellar + Redis) |

See [`clever-cloud/README.md`](./clever-cloud/README.md) for the day-to-day
provisioning workflow.
