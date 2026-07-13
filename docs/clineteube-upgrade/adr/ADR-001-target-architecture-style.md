# ADR-001: Target architecture style

## Status

Proposed

## Context

CineTube is one product, one repository, one Express deployment, and one PostgreSQL database. Its current route-controller-service structure is understandable, but technical-layer folders make domain ownership and cross-domain dependencies increasingly implicit.

## Decision

Use a hybrid domain-oriented modular monolith: retain Next.js, Express, Prisma, PostgreSQL, Stripe, and Cloudinary; group new backend work into 16 business modules while keeping small shared infrastructure and policy kernels. Migrate only files touched by product work.

## Alternatives Considered

Keep only technical-layer folders; perform a full folder rewrite; split payments, auth, or content into microservices.

## Trade-offs

Module rules require discipline without runtime isolation. This is less independently scalable than services, but avoids distributed transactions and operational overhead that CineTube does not need.

## Positive Consequences

Business rules, contracts, tests, and persistence are co-located; the existing stack and deploy topology remain intact.

## Negative Consequences

Old and new structures coexist during migration, and boundaries are enforced by review and tests rather than the network.

## Migration Impact

Introduce modules incrementally behind existing routes. Do not perform a rename-only refactor.

## Security Impact

Authentication, authorization, entitlement, and provider adapters gain named owners and policy boundaries.

## Data Impact

One Prisma schema and one database remain the transactional boundary.

## Validation Method

Dependency tests, architecture review, builds, and feature-level integration tests.

## Rollback or Reversal Strategy

Because route mounts and database remain unchanged, migrated files can be moved back module by module.
