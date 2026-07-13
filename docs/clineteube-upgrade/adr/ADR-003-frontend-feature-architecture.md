# ADR-003: Frontend feature architecture

## Status

Proposed

## Context

All current pages are client components and several large pages duplicate cards, query definitions, and state handling.

## Decision

Use 17 boundaries: auth, home, browse, media-details, reviews, comments, watchlist, profile, subscription, user-dashboard, admin-dashboard, admin-media, admin-reviews, content, contact, legal, and shared-ui. Routes compose feature components; features own queries, mutations, schemas, types, and state views. Public read-heavy shells are Server Components; protected or interactive behavior remains client-side.

## Alternatives Considered

Keep all logic in route files; convert every page to server rendering; create a component for every small fragment.

## Trade-offs

Server and client boundaries require deliberate DTOs. Protected pages cannot be truthfully server-authenticated while refresh cookies remain on the cross-origin API domain.

## Positive Consequences

Public metadata and initial rendering improve while the existing in-memory access-token model is preserved.

## Negative Consequences

Some public data has two consumers: server fetches and TanStack Query client refreshes.

## Migration Impact

Extract only cohesive sections, forms, cards, and query modules from pages being changed.

## Security Impact

Frontend gates are UX only; Express policies remain the security boundary.

## Data Impact

Frontend types derive from API DTO schemas, not Prisma models.

## Validation Method

Component tests, route E2E tests, bundle review, and metadata inspection.

## Rollback or Reversal Strategy

Feature components can be re-inlined without changing APIs or persistence.
