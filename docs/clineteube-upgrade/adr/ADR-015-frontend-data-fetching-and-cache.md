# ADR-015: Frontend data fetching and cache

## Status

Proposed

## Context

TanStack Query is used widely, but keys and invalidation are page-local and logout does not clear user data. Every page is currently a client component.

## Decision

Retain TanStack Query for authenticated and interactive server state. Each feature owns a typed query-key factory, query functions, mutation functions, invalidation map, and standard loading/error/empty state. Public initial reads use Next.js Server Components where SEO or first paint benefits; client islands hydrate only interactive portions. Logout, reuse detection, and user change clear all user-scoped caches.

## Alternatives Considered

Use only Next.js fetch; use global Redux; keep ad hoc keys; cache protected data on the server.

## Trade-offs

Two data-fetch paths require shared DTOs. Cache defaults must distinguish stable genres/content from volatile entitlement and moderation state.

## Positive Consequences

Smaller client bundles, reliable invalidation, no cross-user cache residue, and better public metadata.

## Negative Consequences

Some components need explicit server-to-client initial data handoff.

## Migration Impact

Introduce factories and cache clearing first; convert public pages one route at a time.

## Security Impact

Protected responses are never placed in shared server caches; logout clears memory and queries.

## Data Impact

None beyond API DTO stability.

## Validation Method

Query-key unit tests, mutation invalidation tests, logout/user-switch tests, and hydration checks.

## Rollback or Reversal Strategy

Client queries remain available if a Server Component conversion is reverted.
