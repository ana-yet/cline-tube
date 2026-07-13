# Architectural characteristics and severity register

## Priorities

| Rank | Characteristic | CineTube-specific reason | Target evidence |
|---:|---|---|---|
| 1 | Security | Auth tokens, admin operations, stream URLs, uploads, and account recovery are exposed to the internet | Negative policy tests, hashed tokens, CSRF controls, redaction |
| 2 | Financial/data consistency | Stripe is asynchronous and current revenue is double-counted | Event ledger, invoice identity, invariants, reconciliation |
| 3 | Reliability/recoverability | Provider and database writes can partially fail | Retryable handlers, repair workflow, backups, rollback drill |
| 4 | Testability | There are zero tests around stateful critical paths | Test pyramid and merge gates |
| 5 | Deployability | Migrations are manual and health is static | Pre-deploy migrations, readiness, smoke and rollback |
| 6 | Accessibility/usability | Missing themes, dialogs, states, pages, and dashboard workflows are assignment requirements | Runtime keyboard, contrast, responsive and form verification |
| 7 | Maintainability/modifiability | Domain growth is making technical-layer ownership implicit | Module APIs, DTOs, dependency tests |
| 8 | Observability | Payment and deployment faults cannot be correlated | Structured logs, request IDs, alerts |
| 9 | Performance | Images and all-client rendering matter, but traffic does not justify infrastructure caching | Server/public rendering, indexes, pagination, bundle budgets |
| 10 | Scalability | One Render service is adequate; multi-instance correctness matters only for shared state | Database dedup; no Redis until measured need |

Availability is achieved through recoverable deploys rather than a high-availability redesign. Eventual consistency is acceptable only between Stripe and CineTube; within PostgreSQL, security and financial invariants are transactional.

## Corrected severity rules

P0 means a present release blocker with practical secret exposure, financial corruption, irreversible loss, broken startup/deployment, auth bypass, or a critical workflow failure. P1 means required before final production submission. P2 is hardening and measurable improvement. P3 is optional.

### P0 — 5

| ID | Finding | Planned treatment | Phase |
|---|---|---|---:|
| P0-01 | Plaintext/logged reset token | ADR-006, invalidate and hash tokens, email adapter, redaction | 3 |
| P0-02 | No reset delivery | Provider adapter and monitored delivery | 3 |
| P0-03 | Double-counted payment/revenue | ADR-009, invoice identity and backfill | 4–5 |
| P0-04 | No event ledger/order-safe processing | ADR-008/010, ledger, ordering, retry, reconcile | 4 |
| P0-05 | Cancellation removes paid entitlement | ADR-007 calculator and lifecycle migration | 4 |

### P1 — 18

| ID | Finding | Planned treatment | Phase |
|---|---|---|---:|
| P1-01 | Login return path is untrusted | Shared same-origin sanitizer | 3 |
| P1-02 | Refresh/logout CSRF controls incomplete | Exact origin plus double-submit token | 3 |
| P1-03 | No reuse detection, session metadata, limit, or UI | Session families, five-session cap, security page | 3/9 |
| P1-04 | Logout does not clear query data | Central auth teardown | 3 |
| P1-05 | Zero tests | Critical unit/integration/E2E foundation | 1 onward |
| P1-06 | No CI and backend lint is broken | Minimal merge-gate pipeline | 1 |
| P1-07 | Production migrations and rollback are manual | Pre-deploy migrate, rehearsal and runbook | 1/14 |
| P1-08 | Static health, incomplete shutdown, missing proxy policy | Liveness/readiness/drain/trusted-hop config | 13 |
| P1-09 | Light/system themes missing | Theme provider and semantic tokens | 6 |
| P1-10 | Required public/contact/blog/legal/help pages missing | Owned routes and content/contact modules | 7 |
| P1-11 | User dashboard, profile image, and password update missing | Dashboard/profile/security features | 9 |
| P1-12 | Admin navigation and management surfaces incomplete | Seven meaningful destinations covering required operational areas; no filler Settings route | 10 |
| P1-13 | Charts and reliable admin metrics missing | Canonical analytics DTO and three charts | 10 |
| P1-14 | Modal, form association, and motion accessibility gaps | Shared accessible primitives and runtime audit | 6/11 |
| P1-15 | Skeleton/fetch-error/empty states incomplete | Required feature state contract | 6–10 |
| P1-16 | Upload signature, dimensions, ownership, and public-ID safety incomplete | ADR-013 | 9/10 |
| P1-17 | Path/body validation and API documentation incomplete | Common validation and generated OpenAPI | 2 |
| P1-18 | Refund, reconciliation, and production environment/CORS controls incomplete | Payment adjustments, dry-run repair, fail-fast env | 4/13–14 |

### P2/P3 examples

P2 includes database-backed approximate view dedup, generic structured logs/error monitoring, query-key consolidation, Server Component conversion, image optimization, metadata, conditional composite indexes, expired-token cleanup, and preview-environment ergonomics. P3 includes OAuth `Account` removal after product confirmation, newsletters/notifications, advanced search infrastructure, direct browser uploads, Redis, and microservices.

## Measurable quality attributes

| Attribute | Initial target |
|---|---|
| Auth | All protected API operations deny guest; family reuse revokes the session family |
| Payments | One successful Transaction per Stripe invoice; duplicate events produce no new side effect |
| Recovery | Daily reconciliation reports zero unexplained mismatches before launch |
| API | Every changed/new endpoint has request/response/error schema and request ID |
| Accessibility | Keyboard path, visible focus, error association, reduced motion, and contrast verified at runtime |
| Performance | Public LCP images optimized; listing limits <= 50; no obvious N+1; charts lazy-loaded |
| Deployment | Fresh and upgrade migration rehearsals pass; previous compatible app can be restored |
