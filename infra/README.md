# Infrastructure

This directory holds **declarative infrastructure** for local and cloud environments.

| Asset | Purpose |
|-------|---------|
| `docker-compose.yml` | Canonical Postgres + Redis for local development |

Root `docker-compose.yml` includes this file so `docker compose` can be run from the repository root.

Future additions (Prompt 10+): Kubernetes manifests, Terraform/OpenTofu, Helm charts, service mesh notes — keep them here rather than mixing into application packages.
