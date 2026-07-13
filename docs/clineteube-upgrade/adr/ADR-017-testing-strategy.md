# ADR-017: Testing strategy

## Status

Proposed

## Context

The repository has no tests or test dependencies, while auth and billing contain stateful, concurrency-sensitive behavior.

## Decision

Use Vitest for backend and frontend unit/integration tests, Supertest for Express contracts, React Testing Library for components, and Playwright for E2E, responsive, and accessibility journeys. Use isolated PostgreSQL test databases and Stripe/Cloudinary/email adapters; never call live providers in CI. Financial, auth, migration, contract, lint, type, and build gates block merges.

## Alternatives Considered

Jest; Cypress; E2E-only testing; mocks without database integration.

## Trade-offs

Four layers require setup and fixture discipline. The chosen tools align with TypeScript and browser needs without duplicating E2E frameworks.

## Positive Consequences

Fast policy tests coexist with realistic transaction and journey tests.

## Negative Consequences

Integration database lifecycle and deterministic time/provider fixtures need maintenance.

## Migration Impact

Establish tooling and smoke tests before changing auth or payments.

## Security Impact

Explicit negative authorization and secret-redaction tests become mandatory.

## Data Impact

Tests use disposable databases and migration history, not developer or production data.

## Validation Method

Seeded failure tests, coverage of critical branches, flake tracking, and CI gate enforcement.

## Rollback or Reversal Strategy

Individual frameworks can be replaced behind stable test categories; never remove the gates without equivalent coverage.
