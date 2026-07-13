# CineTube production-upgrade architecture: executive summary

## Recommendation

CineTube should evolve into a **hybrid domain-oriented modular monolith**, not a microservice system. Retain the existing Next.js/React frontend, Express/TypeScript backend, Prisma/PostgreSQL database, Stripe Checkout, Cloudinary, Vercel, and Render. The codebase already has a sound layered foundation; the upgrade should add explicit domain ownership, stable DTOs, policy functions, provider adapters, tests, and production controls without a rewrite.

Target counts used throughout this architecture:

| Measure | Target |
|---|---:|
| Backend modules | 16 |
| Frontend feature/shared boundaries | 17 |
| ADRs | 20 |
| Proposed database changes | 18 |
| Endpoint-level additions or changes | 60: 36 additions, 22 changes, 2 deprecations |
| Migration phases | 16, Phase 0 through Phase 15 |
| Implementation backlog items | 51 |
| Corrected P0 issues | 5 |
| Corrected P1 issues | 18 |

## Source corrections made in this pass

Current source overrides discovery where they differ:

1. The backend has **42 mounted endpoints**, not 37: 41 route declarations plus inline `GET /api/health`. The detailed discovery inventory listed the extra routes but its total remained stale.
2. Media and review pagination already enforce `limit <= 50` in current Zod schemas. “No page-size limit” is removed from the issue register.
3. `isAuthenticated` currently requires both `user` and the in-memory access token. This is correct and must not regress.
4. The discovery classification of missing path UUID validation and `trust proxy` as P0 is rejected. They remain P1 production/security controls; neither is by itself a proven auth bypass, data-loss event, or startup failure.

## Release blockers

| ID | Corrected P0 | Why it blocks production |
|---|---|---|
| P0-01 | Reset tokens are plaintext and printed to logs | Practical credential exposure |
| P0-02 | Password reset has no real delivery | Critical account-recovery workflow is unusable |
| P0-03 | Initial Stripe payments are recorded twice | Financial and revenue corruption |
| P0-04 | Webhooks lack event idempotency, ordering control, and reliable recovery | Duplicate/stale events can corrupt financial or entitlement state |
| P0-05 | Cancel-at-period-end immediately removes paid access | Critical paid-user entitlement failure |

The 18 P1 items are maintained in [14-architectural-characteristics.md](./14-architectural-characteristics.md).

## Highest-risk migrations

1. Repairing legacy Transaction rows and enforcing invoice identity without deleting ambiguous financial history.
2. Separating the Stripe subscription projection from entitlement while delayed/out-of-order events and existing canceled/past-due rows exist.
3. Introducing refresh-token families and reuse detection without treating legitimate concurrent refresh as theft.
4. Replacing plaintext reset tokens while deliberately invalidating every old reset link and enabling real email delivery.
5. Changing user-deletion/Transaction foreign-key behavior while retaining immutable, privacy-approved financial snapshots.

## Decisions that must not be deferred

1. Invoice ID is the canonical subscription-payment identity; checkout completion never creates revenue.
2. Stripe event IDs are persisted and processing is duplicate-safe and order-aware.
3. Entitlement is derived separately from billing status; cancel-at-period-end retains access.
4. Reset tokens are hashed and delivered by an adapter; no secret-bearing logs are permitted.
5. Production schema changes use expand/backfill/contract and automated `migrate deploy` before new code.

## First implementation phase

Begin with **Phase 0 — Critical containment and project governance**, then Phase 1 tooling. Phase 0 is a future, narrowly scoped implementation change that removes reset-token output and fails closed when production delivery is unavailable; it deliberately does not attempt the complete recovery/session migration before test foundations exist.

Exact Phase 0 acceptance criteria:

- No reset token, password, access token, or refresh token is present in server output for the recovery path.
- No raw reset token appears in a recovery API response.
- Known and unknown email addresses receive the same public response shape and message.
- Production startup or recovery fails closed with a stable operational error when real email delivery is absent, without disclosing account existence.
- No payment/subscription behavior, schema, or provider configuration change is included.
- The change records the verified 42-endpoint baseline, five P0 invariants, owner, rollback, and evidence links.

## Reasoning allocation

Highest Codex reasoning is required for refresh reuse concurrency, transaction backfill, webhook ordering, entitlement mapping, migration compatibility, reconciliation/repair, and refund/recognized-revenue logic. Normal reasoning is appropriate for shared UI primitives, static informational pages, query-key extraction, metadata, skeleton/error/empty states, and documentation after contracts are fixed.

## Product and runtime checkpoints

Product confirmation is still required for the proposed 72-hour past-due grace, contact retention duration, legal/blog content ownership, refund-entitlement policy, and whether “monthly recognized revenue” should use service-period allocation or be relabeled net collected revenue. Runtime verification remains required for Stripe fixtures/API-version payloads, Render proxy hops and pre-deploy availability, production database migration state/backups, Vercel preview CORS, email deliverability, upload memory/dimensions, responsive overflow, contrast, keyboard/screen-reader behavior, and production smoke tests.

## Scope boundary

This package plans the work only. It intentionally changes no application code, dependencies, package manifests, Prisma schema, migration, environment, deployment, seed, or provider state.
