# ADR-011: Database migration strategy

## Status

Proposed

## Context

CineTube has one migration and no automated production migration step. The upgrade adds security and financial constraints that cannot safely arrive in one destructive change.

## Decision

Use expand, backfill, dual-read/write where needed, validate, constrain, and contract. Every migration has a backup checkpoint, forward-only remediation, test-database rehearsal, row-count/invariant checks, and compatibility with the currently running release. Production applies committed migrations with `prisma migrate deploy` in Render's pre-deploy step.

## Alternatives Considered

Use `db push`; run migrations at server startup; edit the initial migration; deploy schema and breaking code simultaneously.

## Trade-offs

Temporary columns and compatibility code add work, but allow application rollback without database rollback.

## Positive Consequences

Deploys are reviewable, repeatable, and recoverable without destructive reverse SQL.

## Negative Consequences

Contract cleanup is delayed at least one stable release.

## Migration Impact

All 18 proposed changes follow the sequence in document 18; applied migrations are never edited.

## Security Impact

Backfill tools redact secrets and use least-privilege production credentials.

## Data Impact

Constraints are added only after backfill and invariant validation.

## Validation Method

Fresh-database apply, production-shaped snapshot rehearsal, migration status, invariant queries, and rollback drill.

## Rollback or Reversal Strategy

Roll application back while expanded schema remains; repair forward for failed migrations using documented Prisma procedures.
