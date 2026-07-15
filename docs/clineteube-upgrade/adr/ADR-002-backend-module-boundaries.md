# ADR-002: Backend module boundaries

## Status

Proposed

## Context

Auth, media, reviews, payments, and admin reporting already have distinct services, but `admin` and provider code can reach several models without explicit ownership.

## Decision

Adopt 16 modules: auth, users, profiles, media, genres, reviews, comments, watchlists, subscriptions, payments, uploads, contacts, content, analytics, admin, and health. A module exposes application services and DTOs; only its repository accesses its owned models. Admin is an orchestration facade and owns no business tables.

## Alternatives Considered

One module per Prisma model; keep global controller/service folders; merge subscriptions and payments into a single large module.

## Trade-offs

Some flows require explicit calls between modules. Avoiding one-file interfaces means boundaries are documented and tested rather than represented by excessive indirection.

## Positive Consequences

Ownership is clear, cross-module coupling is visible, and tests can target business capabilities.

## Negative Consequences

Analytics and admin must compose read models across owners and cannot become alternate write paths.

## Migration Impact

Move a route, controller, validation, service, and tests together only when that capability changes.

## Security Impact

Policies remain in owning modules; admin cannot bypass ownership through direct Prisma access.

## Data Impact

Prisma stays shared infrastructure, but raw Prisma records do not cross a public module API.

## Validation Method

Import-boundary lint rules, module contract tests, and code review.

## Rollback or Reversal Strategy

Keep compatibility exports until all imports move, then remove them in a separate change.
