# 28. Definition of Done

## Meaning of done

“Done” means the scoped behavior is implemented, evidenced, reviewable, deployable, and reversible at its risk level. Code completion, a passing happy path, an architecture document, or a visual screenshot alone is insufficient. An item with an unresolved mandatory requirement is not done.

## Work-item definition of done

Every backlog item must satisfy all applicable checks:

- Scope matches one backlog ID and named traceability IDs; unrelated cleanup is excluded.
- Current behavior and target invariant are captured in tests before or with the change.
- Request/response/schema/UI changes match the approved ADR and compatibility strategy.
- Security review covers authentication, authorization, ownership, entitlement, CSRF, secrets, PII, logs, uploads, and provider calls as applicable.
- A database change has expand/backfill/default/constraint/index/verification/rollback evidence and has been tested from empty and representative upgrade state.
- Loading, error, empty, unauthorized, conflict, pending, and success states exist for touched asynchronous UI.
- Keyboard, focus, accessible name/error association, reduced motion, contrast, and responsive implications are checked for touched UI.
- Unit/integration/component/E2E tests proportional to risk pass; no live provider or real personal data is used.
- Format, lint, typecheck, required tests, builds, schema/migration validation, scans, and contract diff pass.
- Observability includes bounded safe signals and excludes tokens, passwords, secrets, webhook bodies, and sensitive form content.
- Rollback/reversal is tested or explicitly demonstrated; irreversible financial/data work uses forward repair and compatibility rather than destructive rollback.
- Documentation, OpenAPI, traceability status, and operational runbook are updated where behavior changed.
- Human checkpoints named by the roadmap are approved; no product decision is silently made by implementation.
- The final diff contains no unused code, placeholders, debug output, generated-looking filler, unrelated files, or forbidden commit trailers.

## Phase-level definition of done

Every phase must meet the work-item definition above and these common exit conditions:

1. Every included backlog item meets its acceptance criteria and links evidence.
2. Every requirement claimed by the phase has a verification artifact in document 25.
3. Required CI gates are green; any quarantine/exception has an owner, reason, expiry, and product/security acceptance where applicable.
4. Schema and API compatibility with the preceding deployable release is proven.
5. Security, privacy, accessibility, performance, and operations impacts are reviewed at the phase's stated depth.
6. Rollback triggers, owner, steps, data implications, and validation are recorded.
7. No explicit exclusion was implemented accidentally; newly discovered scope returns to architecture/backlog review.
8. A reviewer other than the implementer confirms the evidence.

| Phase | Additional exit evidence |
|---:|---|
| 0 | The exact six containment criteria in doc 26 pass; reset tokens are absent from logs/responses; billing and schema remain untouched. |
| 1 | Required CI pipeline runs from a clean checkout; lint configuration works; deterministic test/provider/DB isolation is proven. |
| 2 | All 42 current endpoints are accounted for in OpenAPI/contracts; standard envelopes, validation, request IDs, capabilities, and ownership tests are active. |
| 3 | Real delivery, hash-only reset, rotation reuse, session management, CSRF/origin, redirect, logout/cache, and protected UX matrices pass. |
| 4 | One paid invoice equals one transaction; event/client idempotency, ordering, cancel/entitlement, refund, reconciliation, and return-path invariants pass. |
| 5 | Each of 18 schema changes is accepted/rejected/applied with evidence; backfills are resumable; review/view/retention/integrity queries are clean. |
| 6 | Approved tokens/themes/primitives render without hydration/a11y regression; required shared state/component inventory is complete. |
| 7 | All required public routes/content are real; eight home sections use manageable data; contact/content persistence and privacy work. |
| 8 | Browse/detail filters, queries, states, responsiveness, media content, view dedup, and premium-stream boundary pass. |
| 9 | User dashboard, profile image, password, sessions, watch/review/subscription states work with ownership and cache isolation. |
| 10 | Seven meaningful admin areas, required tables, workflows, audited actions, defined metrics, and bar/line/donut charts work with real data. |
| 11 | Keyboard, screen-reader sample, axe, reduced-motion, target viewport, 200% zoom, touch, contrast, and overflow evidence is recorded without an unsupported WCAG claim. |
| 12 | Query/bundle/image/Core Web Vital budgets and accurate per-route metadata/structured data pass without private cache exposure. |
| 13 | Structured redaction, readiness, health, Render proxy behavior, shutdown, singleton jobs, metrics, alerts, and runbooks are exercised. |
| 14 | Migrations, backup/restore evidence, deployment order, exact production URLs/origins/cookies/providers, rollback drill, and smoke checks pass. |
| 15 | Independent traceability and production audit returns no unresolved P0/P1 and every exception is explicitly accepted. |

## Final project definition of done

### Requirements and content

- [ ] Requirements traceability is complete: every row has current/target mapping, phase, acceptance criteria, and actual verification evidence.
- [ ] No P0 or P1 issue remains unresolved; P2/P3 deferrals have recorded rationale and owner.
- [ ] No placeholder streaming URL, hardcoded credential, fake testimonial/partner/statistic, placeholder link, debug content, or unfinished production copy remains.
- [ ] Required public, authentication, user-dashboard, and admin routes have an owner, usable content, metadata, and complete states.
- [ ] About, Contact, Blog/list/detail, Help, Privacy, Terms, Pricing, and User Dashboard experiences are present.

### Design, themes, forms, and responsive accessibility

- [ ] Light, dark, and system themes work across public, auth, user, and admin layouts without hydration mismatch or unreadable imagery/charts/modals/dropdowns.
- [ ] Mobile, tablet, desktop, and 200% zoom are verified; there is no page-level horizontal overflow at supported widths.
- [ ] Shared buttons/inputs/selects/dialogs/tables/pagination/tabs/tooltips/avatar/skeleton/spinner/toast/empty/error/form/image components use one coherent token system.
- [ ] All forms have labels, required indication, autocomplete, client and server validation, field/form errors, `aria-invalid`, `aria-describedby`, first-error focus, pending state, duplicate-submit protection, and accessible success feedback.
- [ ] Dialog focus trap/initial focus/Escape/focus return, visible focus, semantic landmarks/headings, keyboard operation, reduced motion, image alt, table semantics, chart alternatives, touch targets, and measured contrast are verified.
- [ ] Loading, fetch-error, empty, access-denied, conflict, pending, not-found, and success states are meaningful; skeleton loaders match core page shapes.

### Identity and security

- [ ] Backend policies protect every non-public operation; role, ownership, moderation visibility, and premium entitlement are independently tested.
- [ ] `isAuthenticated` requires both user and the in-memory access token; no private cache survives logout or a different user login.
- [ ] Refresh rotation is atomic; reuse revokes the family; current, individual, and all-session logout work; session metadata/limit are privacy-safe.
- [ ] Cookie mutations use exact-origin and CSRF protection; redirect/return paths cannot leave the application.
- [ ] Password reset has real delivery, generic responses, hashed/single-use/expiring tokens, old-token invalidation, session revocation, and no raw token in responses or logs.
- [ ] Password update and owned profile image replace/remove work securely.
- [ ] Access/refresh/reset tokens, passwords, cookies, CSRF values, provider secrets/signatures/payloads, contact bodies, and raw viewer fingerprints are absent from production logs.

### Billing, subscription, reviews, and data integrity

- [ ] Checkout creation prevents active/live duplicates, uses client and Stripe idempotency, and returns the user to the initiating profile/media page.
- [ ] Redirect/query parameters never confirm payment or grant access; owned server state does.
- [ ] Webhook signature, event ledger, duplicate delivery, concurrent claim, retry, stale lease, and out-of-order behavior are proven.
- [ ] One successful Stripe invoice produces exactly one canonical transaction; renewals appear once; checkout events cannot double-count revenue.
- [ ] Refund adjustments are immutable and gross/refund/net revenue is correct per currency.
- [ ] Billing status, tier, cancellation intent, current period, and derived entitlement are separated; cancel-at-period-end retains access until the paid period ends.
- [ ] Incomplete, trialing if retained, active monthly/yearly, canceling, past due/grace, suspended, expired, provider-deleted, resubscribed, partial refund, and full refund behaviors match approved rules.
- [ ] Reconciliation is bounded and dry-run by default; manual repair is authorized, idempotent, compare-and-set, and audited.
- [ ] Only approved reviews affect ratings; moderation/edit/delete/recalculation commits atomically; actions are audited; duplicate reports are prevented.
- [ ] View analytics has documented approximate semantics, multi-instance duplicate suppression, abuse controls, and privacy retention.
- [ ] Financial history survives user deletion according to approved anonymization/retention rules.

### Pages, dashboards, content, and uploads

- [ ] The home page has at least eight meaningful sections backed by real/managed data and independently correct loading/error/empty/accessibility behavior.
- [ ] Browse has validated search, type, genre, pricing, rating, year, sorting, result count, stable pagination, URL state, skeleton/error/empty, indexes, and mobile filters.
- [ ] Media details include available poster/backdrop, metadata, synopsis, genres, creator/cast only when modeled, rating, watchlist, access/stream action, reviews/comments, related media, all states, SEO, and structured data.
- [ ] User dashboard shows watchlist/review/approved/pending counts, accurate subscription status, and privacy-approved recent activity.
- [ ] Admin has meaningful Overview, Catalog, Community/Reviews, Users, Billing/Subscriptions, Contacts, and Content navigation with required responsive tables and operations.
- [ ] Admin metrics include total/active users, live media, approved/pending reviews, active premium states, recognized/net revenue, media views, and moderation activity with documented queries/ranges/currency/performance.
- [ ] Real-data bar, line, and pie/donut charts have definitions, units, ranges, empty states, authorization, accessible alternatives, and no double-counted financial source.
- [ ] Contact validation, anti-spam/rate limit, database persistence, status/assignment, admin management, optional email behavior, and retention are approved and working.
- [ ] Blog/content draft/published, slug, title, excerpt, body, cover, author, date, SEO, admin CRUD, public list/detail work without a complex CMS or XSS path.
- [ ] Uploads enforce actual format, byte/dimension/concurrency limits, folder/ownership/public-ID policy, replacement/orphan cleanup/idempotent deletion for profile and media assets.

### Tests, builds, deployment, and recovery

- [ ] Backend unit/integration, frontend component, critical E2E, API contract, migration, accessibility, responsive, and production smoke suites cover the matrix in doc 23 and block merging where specified.
- [ ] Immutable install, format, lint, typecheck, Prisma validation/migration validation, unit/integration, frontend/backend builds, dependency review, secret scan, OpenAPI diff, and critical E2E gates pass.
- [ ] Successful production frontend and backend builds are tied to the deployed release SHA.
- [ ] Every schema change has empty/upgrade/repeat/compatibility evidence; production migrations use one pre-deploy `prisma migrate deploy` actor.
- [ ] Vercel hosts the frontend and Render hosts the backend; the production frontend uses an explicit HTTPS Render `/api` URL with no localhost fallback/reference.
- [ ] Production and preview exact-origin CORS, secure cookies, CSRF, `trust proxy`, health, database readiness, graceful shutdown, and provider configuration are runtime-verified.
- [ ] Structured logs, request/release IDs, error monitoring, payment/upload/reconciliation metrics, actionable alerts, and redacted runbooks are operating.
- [ ] Database backup/PITR posture and isolated restore drill meet approved RPO/RTO; code/data rollback steps and triggers are proven.
- [ ] Post-deployment public, member, admin, provider, health/readiness, migration, and payment-safe smoke checks pass.
- [ ] The final production reconciliation and review-rating invariant reports have no unexplained mismatch.
- [ ] Architecture deviations are captured in ADRs, documentation is current, and an independent review pass approves the result.

## Evidence format

Each completed item links a CI run/release SHA, relevant test names, migration version and invariant report where applicable, screenshots or manual-check record for visual/accessibility claims, deployed probe/smoke evidence for production claims, and the approving reviewer. Evidence must not contain secrets or real sensitive data.

