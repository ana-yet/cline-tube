# ADR-018: Deployment and migration execution

## Status

Proposed

## Context

Vercel and Render are the required platforms. Builds exist, but production migrations are manual, readiness is static, and shutdown drops in-flight requests.

## Decision

Retain Vercel frontend and Render backend. CI must pass before auto-deploy. Render build installs, generates Prisma, and compiles; a pre-deploy command runs `prisma migrate deploy`; readiness checks the database and deployment version; startup validates production URLs and secrets; shutdown stops accepting requests, drains within Render's deadline, then disconnects Prisma. Use expand/contract migrations, database backups, and application rollback to the prior compatible release.

## Alternatives Considered

Migrate during build or server startup; deploy backend on Vercel; containerize; manually run production migrations.

## Trade-offs

Render pre-deploy availability depends on plan, so an approved CI migration job is the fallback—not application startup.

## Positive Consequences

Schema changes precede compatible code, failed deploys do not replace the healthy release, and operations are repeatable.

## Negative Consequences

Preview CORS and preview databases require explicit environment policy.

## Migration Impact

Add checks and runbooks before the first schema-changing feature phase.

## Security Impact

Exact-origin CORS, proxy trust, secure cookies, and environment fail-fast are deployment gates.

## Data Impact

Backups and invariant checks are required before high-risk migrations.

## Validation Method

Staging deploy, migration rehearsal, health/readiness, SIGTERM, rollback, and production smoke tests.

## Rollback or Reversal Strategy

Roll back the application while expanded schema remains; restore a database only for proven irreversible corruption.
