# CineTube Independent Architecture Review

## 1. Executive Assessment

**Verdict: APPROVED WITH REQUIRED CORRECTIONS.** The architectural direction is generally sound: preserve the stack, use one modular monolith, keep access tokens in memory, make Stripe invoices the recurring-payment identity, derive entitlement, use expand/backfill/verify/constraint migrations, and retain the Vercel/Render split. The package is not yet safe to execute as written.

The principal blockers are factual and state-machine defects, not a need for a rewrite:

- Document 19 has the correct total of 42 current endpoints but an incorrect endpoint inventory. It substitutes nonexistent routes, omits real routes, and changes methods and identifiers while describing them as current source.
- Refresh reuse detection has no precise multi-tab/concurrent-response model. The proposed immediate family revocation can classify a legitimate loser of a rotation race as theft.
- `event.created` compare-and-set is not a sufficient Stripe subscription ordering strategy. Event delivery is unordered, event timestamps can tie, and snapshots may be stale.
- The event-ledger claim/lease/transaction narrative is contradictory, and reconciliation/repair promises durable reports and immutable audits without proposing storage for them.
- User suspension and broad privileged-action audit are promised in APIs and policy but absent from the data model.
- Phase 5 incorrectly treats all 18 database concern rows as one exact migration sequence, mixing release-critical finance/auth changes with later contact, content, profile, analytics, and media-lifecycle scope.
- The current frontend writes an access token to `sessionStorage` for Checkout, contradicting the target security invariant, and trusts a query flag for payment-success copy.

Architecture documentation is therefore conditionally acceptable; payment and database migration work is blocked. A corrected, narrowly bounded Phase 0 may begin only after the Phase 0 gate in documents 33–34 is accepted.

## 2. Review Method

The review read discovery documents 00–12, architecture documents 13–30, all 20 ADRs, `AGENTS.md`, the manifests, Prisma schema and initial migration, deployment files, all route declarations, and targeted high-risk backend/frontend source. No build, lint, test, install, migration, seed, provider call, or deployment command was run.

Source-of-truth order was repository source, Prisma/migration SQL, current primary provider documentation, discovery correction log, other discovery, architecture, ADRs, then reported totals. Read-only scripts counted declarations and unique IDs. Provider checks used:

- [Stripe webhook ordering and duplicate guidance](https://docs.stripe.com/webhooks)
- [Stripe subscription invoice/payment lifecycle](https://docs.stripe.com/billing/subscriptions/overview)
- [Stripe Checkout Session contract](https://docs.stripe.com/api/checkout/sessions)
- [Stripe idempotent request behavior](https://docs.stripe.com/api/idempotent_requests)
- [Render deploy and pre-deploy behavior](https://render.com/docs/deploys)
- [Render health checks](https://render.com/docs/health-checks)
- [Render Blueprint fields](https://render.com/docs/blueprint-spec)
- [Prisma production migration behavior and advisory locking](https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production)

Material findings distinguish confirmed source evidence, architectural inference, product choice, provider assumption, and runtime verification. Proposed corrections are recorded in document 32; no original document was edited.

## 3. Count Verification

| Reported item | Rule independently applied | Verified | Duplicates/gaps | Meaningful conclusion |
|---|---|---:|---|---|
| Current backend endpoints | Count Express verb declarations in `backend/src/routes/*.routes.ts` plus inline `app.get` | **42** | 41 route declarations + 1 health route; no declaration duplicate | Count is correct; document 19's 42-row path inventory is not. |
| Target backend modules | Rows in document 16's named module catalog | **16** | Unique names | Administrative catalog count. Only eight should start as physical domain packages; admin/analytics/health/uploads are not all domains. |
| Frontend feature boundaries | Numbered rows in document 22 | **17** | Unique names | Includes 14 feature boundaries, one merge candidate, one route-only concern, and one shared concern. |
| ADRs | Files `ADR-001` through `ADR-020` | **20** | Sequential, no duplicate file IDs | All remain `Proposed`; presence is not approval. |
| Proposed database changes | Unique `DB-01` through `DB-18` rows | **18** | Unique concern IDs | Not 18 executable migrations: DB-14/15 are index programs; several rows must split or move to feature phases. |
| Endpoint additions | Numbered additions in document 19 | **36** | Unique row numbers | Paper count is exact; one duplicate capability, one premature endpoint, one unsafe endpoint, and four product-dependent endpoint rows exist across the 60-item set. |
| Endpoint changes | Current rows marked `Change` | **22** | Unique row numbers | Paper count only; multiple “current” paths/methods are false. |
| Endpoint deprecations | Current rows marked `Deprecate` | **2** | Unique rows | One is justified; the pending-review deprecation is optional until its consumer migration exists. |
| Total endpoint-level changes | 36 additions + 22 changes + 2 deprecations | **60** | Arithmetic is correct | Not 60 approved changes. Classification: 32 required, 15 strongly justified, 6 optional, 4 product-dependent, 1 duplicate, 1 premature, 1 unsafe. |
| Migration phases | Headings Phase 0 through Phase 15 | **16** | Unique headings | Count is correct; Phase 4 and Phase 5 must split internally. |
| Backlog items | Unique `BL-001` through `BL-051` | **51** | IDs repeat between scope and acceptance tables by design; 51 unique | Fourteen are XL and are not one focused Codex task despite the backlog contract. |
| Corrected P0 findings | Rows `P0-01` through `P0-05`, checked against source | **5** | Compound P0-04, but five independently release-blocking outcomes remain | Count retained. |
| Corrected P1 findings | Independent atomic current-release register in document 33 | **22** | Original 18 rows contain compounds and omit confirmed issues | Reported 18 is not an atomic severity count. |
| Traceability requirements | Unique IDs by prefix | **184** | ARC 18 + SEC 30 + PAY 28 + DAT 30 + UI 52 + OPS 26 | Syntactically exact. It is not 184 independent stakeholder requirements: 28 rows are compound, 7 optional items are presented as mandatory, and 2 are architecture guardrails. |

Endpoint count evidence: `backend/src/routes/*.routes.ts`, `backend/src/app.ts`. Other count evidence: documents 16, 18, 19, 22, 25–27 and `docs/clineteube-upgrade/adr/`.

## 4. Current-State Verification

| Stated correction | Result | Evidence and correction |
|---|---|---|
| 42 endpoints, not 37 | **Confirmed count; inventory rejected** | Route counts are auth 7, media 9, reviews/comments 13, watchlist 3, profile 2, payments 3, upload 2, admin 1, webhook 1, plus health 1. Document 19 is not a source-accurate list. |
| Media/review `limit` max 50 | **Confirmed** | `backend/src/validations/media.validation.ts` and `review.validation.ts`. |
| `isAuthenticated` requires user + memory token | **Confirmed with a serious exception** | `frontend/src/providers/auth-provider.tsx` uses `!!user && !!accessToken`; however `frontend/src/lib/auth-session.ts` persists that access token to `sessionStorage` around Checkout. |
| Missing UUID validation is P1, not P0 | **Confirmed** | Several parameter routes lack path schemas, but Prisma parameter failure is not itself a current bypass or irreversible loss. |
| Missing `trust proxy` is P1, not P0 | **Confirmed** | No `app.set("trust proxy", ...)` exists. Runtime proxy behavior affects IP/rate/security semantics but is not proven to be a current P0. |
| Admin sidebar has three primary items | **Confirmed** | `frontend/src/app/(dashboard)/admin/layout.tsx`: Overview, Manage Media, Moderate Reviews. |
| Dark-only is not theme support | **Confirmed** | Root HTML is permanently `dark`; `globals.css` describes permanent dark defaults and pages hardcode zinc/white colors. |
| Home has eight meaningful sections | **Partially false** | There are eight rendered section instances: hero, three media rows, editor picks, pricing, FAQ, CTA. Only the three media rows are DB-backed. Hero/editor/FAQ/pricing are hardcoded, include unsupported claims/plans, and do not prove eight meaningful real-data sections. |

Additional source corrections:

- Actual auth refresh is `POST /api/auth/refresh`, not `/refresh-token`.
- Public media identity is a slug, with a separate admin `GET /api/media/by-id/:id` route.
- There is no `GET /api/health/database`, no public `GET /api/reviews/:id`, and no comment-update endpoint.
- Review approve/reject are `POST`, not `PUT`; own reviews are `/reviews/mine`; watchlist add is `POST /watchlist` with a body; payment paths are plural `/api/payments/*`.
- `frontend/src/app/(public)/pricing/page.tsx` and the home page advertise plan/features/refund promises that are not server-authoritative. Home annual copy (`$95.88`) conflicts with the backend annual amount (`$99.99`) and advertises a nonexistent Gold plan.
- `backend/src/services/review.service.ts` resets an approved review to pending before recomputing the aggregate outside the same transaction.
- `backend/src/services/media.service.ts` grants ADMIN premium access unconditionally; target policy does not explicitly decide whether that continues.

## 5. Architecture-Style Review

The modular-monolith direction fits the repository and scale. “Hybrid” should be defined as: domain-oriented packages for cohesive business capabilities, small technical infrastructure packages, synchronous in-process calls through public module APIs, one Express process, one Prisma client/schema, and no broker or distributed transaction. The documents imply this but conflate all catalog rows with physical domain modules.

Incremental migration is credible when routes move only with behavior changes and compatibility exports are temporary. It becomes wasteful if Phase 2 attempts all 42 DTO conversions or Phase 5 creates every proposed table before its consumer. Internal communication should remain synchronous except durable background jobs and the Stripe event inbox. No domain-event bus is justified. Cross-module orchestration must not let admin/analytics become alternate write repositories.

Recommended initial physical packages are: auth; users/profile; media/genres; community (reviews/comments); watchlists; billing (payments/subscriptions); contacts; content; plus infrastructure for providers, uploads, jobs, health, logging, and analytics read models.

## 6. Backend Module Review

| Proposed module | Classification | Independent assessment |
|---|---|---|
| auth | Justified independent module | Owns credentials, refresh/reset/session invariants. |
| users | Better combined initially | Combine with profiles until admin-user lifecycle creates distinct cohesion. |
| profiles | Better combined initially | Thin one-to-one extension and image workflow; expose a subpackage of users. |
| media | Justified independent module | Core catalog, visibility, DTO and streaming policies. |
| genres | Better combined initially | Lookup/association is part of media; no independent lifecycle is demonstrated. |
| reviews | Justified independent module | Owns rating, likes, reports, moderation state. |
| comments | Better combined initially | Review-bound discussion with no independent route or policy domain. |
| watchlists | Justified independent module | Small but cohesive owned collection and user-dashboard consumer. |
| subscriptions | Better combined initially | Keep pure entitlement/state code separated inside one billing module. |
| payments | Better combined initially | Checkout, invoice ledger, projection and entitlement share one transactional/provider boundary. |
| uploads | Shared infrastructure rather than domain module | Asset validation/provider lifecycle used by media/profile; not a business domain. |
| contacts | Justified independent module | Persistent PII workflow with public and admin consumers. |
| content | Justified independent module | Keep it deliberately small: blog/editorial persistence warrants ownership; help/legal should remain route-owned unless editing is required. |
| analytics | Shared infrastructure rather than domain module | Read repositories/queries owned with analytics composition; no business writes. |
| admin | Unclear | It should be a route/navigation orchestration surface only, never an owner of business data or direct Prisma writes. |
| health | Shared infrastructure rather than domain module | Liveness/readiness/config diagnostics, not a domain module. |

No required domain module is missing. Jobs, email, Stripe, Cloudinary, logging, and health are infrastructure capabilities and should be named as such rather than added to the domain count.

## 7. Frontend Feature Review

| Boundary | Classification | Assessment |
|---|---|---|
| auth | Correct boundary | Owns forms, restore, redirect, teardown. |
| home | Correct boundary | Owns landing composition; a dedicated aggregate endpoint remains optional. |
| browse | Correct boundary | Owns URL query state and media-list query. |
| media-details | Correct boundary | Owns detail/stream/related/view composition. |
| reviews | Correct boundary | Owns review list/mutations/moderation-facing types. |
| comments | Merge candidate | Keep under reviews/community until independent complexity appears. |
| watchlist | Correct boundary | Cohesive private collection. |
| profile | Correct boundary | Owns profile UI; password mutation remains an auth API. |
| subscription | Correct boundary | Checkout/manage/confirmation ownership is clear. |
| user-dashboard | Correct boundary | Read-model composition is distinct from profile editing. |
| admin-dashboard | Correct boundary | Charts/metrics should remain route-local and dynamically loaded. |
| admin-media | Correct boundary | Substantial CRUD/asset workflow. |
| admin-reviews | Correct boundary | Queue/report/audit workflow. |
| content | Correct boundary | Public/admin consumers share domain types, not private components. |
| contact | Correct boundary | Form/inbox workflow is cohesive. |
| legal | Route-only concern | Static pages need routes and content ownership, not a full feature package. |
| shared-ui | Shared concern | Infrastructure/primitives, not a feature and no domain fetches. |

TanStack Query remains appropriate for protected/interactive state. Server Components are realistic for public pages only if the Render API is reachable during rendering and caching never varies on credentials. DTO schemas should generate or share types through one artifact; duplicating Zod 3 backend and Zod 4 frontend source schemas would create drift. Route groups remain coherent.

## 8. API Plan Review

The following tables classify all 60 rows. “Required” means needed for a confirmed security, financial, data, or mandatory-product outcome; “strong” is justified but not independently release-blocking; “optional” can be omitted without breaking the stated outcome.

### Existing endpoint changes/deprecations (24)

| Doc 19 row | Proposed capability | Class | Independent correction |
|---:|---|---|---|
| 3 | Logout semantics | Required | Keep actual `/auth/logout`; CSRF, idempotent family revoke, cache teardown. |
| 4 | Refresh/reuse | Required | Actual path is `/auth/refresh`; preserve compatibility. |
| 6 | Forgot password | Required | Generic response and real delivery; outage behavior needs decision. |
| 7 | Reset password | Required | Hash/single-use/session revoke. |
| 8 | Media list contract | Strongly justified | Extend current endpoint; retain existing consumers and max 50. |
| 9 | Media detail | Required | Actual public identifier is `:slug`; do not silently change to UUID. |
| 11 | Stream | Required | Actual identifier is `:slug`; entitlement DTO must not leak URL. |
| 12 | View record | Optional | P2 analytics; retain simple bounded behavior until DB dedup feature. |
| 13 | Media create | Strongly justified | Real admin consumer; owned upload/lifecycle decision required. |
| 14 | Media update | Strongly justified | Add path schema and optimistic conflict without breaking multipart client. |
| 15 | Media delete/lifecycle | Needs product decision | Archive/soft-delete is not yet approved. |
| 17 | Deprecate pending-review route | Optional | Do only after replacement UI ships and usage is observed. |
| 26 | Approve review | Required | Actual method is POST; keep compatibility or explicitly deprecate. |
| 27 | Reject review | Required | Actual method is POST; reason/audit required. |
| 30 | Watchlist add path change | Optional | Existing body-based POST can be extended; path churn is unnecessary. |
| 31 | Watchlist remove | Strongly justified | UUID validation and idempotent semantics are useful. |
| 34 | Admin dashboard | Strongly justified | Required consumer; metric definitions must be explicit. |
| 35 | Checkout create | Required | Actual path is `/payments/checkout`; do not rename to singular/action path. |
| 36 | Subscription read | Required | Actual path is `/payments/subscription`; return billing + derived access. |
| 37 | Cancellation | Required | Actual path is `/payments/cancel`; preserve paid-period access. |
| 38 | Upload hardening | Required | Current route is admin-only; resource ownership must precede broader auth. |
| 39 | Raw public-ID deletion deprecation | Required | Security correction; remove only after resource-specific replacement. |
| 40 | Stripe webhook | Required | Ledger/object uniqueness/order-safe processing. |
| 41 | Health semantics | Required | Liveness-only endpoint plus separate readiness. |

### Proposed additions (36)

| # | Addition | Class | Consumer, authorization, persistence, and scope assessment |
|---:|---|---|---|
| 1 | List sessions | Needs product decision | Security-page consumer; requires family metadata/retention and session UX decision. |
| 2 | Revoke session | Needs product decision | Same; ownership and current-cookie behavior must be exact. |
| 3 | Logout all | Strongly justified | Auth/security consumer; family storage; CSRF. |
| 4 | Change password | Required | Profile security consumer; current-password validation and session revocation. |
| 5 | Attach profile image | Strongly justified | Profile consumer; asset ownership persistence required. |
| 6 | Remove profile image | Strongly justified | Profile consumer; stored ID only, CSRF/idempotency. |
| 7 | Home aggregate | Optional | Existing bounded media calls can compose the page; add only for measured query/latency value. |
| 8 | Related media | Optional | Real detail consumer but not mandatory for safety. |
| 9 | Report review | Strongly justified | User consumer; DB-09 corrected uniqueness and self-report policy. |
| 10 | Admin report queue | Strongly justified | Admin community consumer; paginated/admin-only. |
| 11 | Resolve report | Strongly justified | Admin consumer; conflict/audit persistence. |
| 12 | Unified admin reviews | Duplicate | Extend existing pending route to typed status filters before adding a second queue capability. |
| 13 | User overview | Required | Mandatory dashboard consumer; private/no-store read model. |
| 14 | Admin users list | Required | Mandatory admin area; paginated/masked. |
| 15 | Admin user detail | Optional | Add only for approved operations; a list/drawer may suffice. |
| 16 | Suspend/reactivate user | Needs product decision | Unsafe until suspension field, transitions, final-admin rule, retention and audit exist. |
| 17 | Admin subscriptions list | Required | Billing admin consumer; derived state filters. |
| 18 | Subscription detail/timeline | Strongly justified | Useful consumer; timeline needs real event/audit source. |
| 19 | Contact create | Required | Mandatory public form; persistence/rate/spam/retention. |
| 20 | Admin contacts list | Required | Required operational consumer. |
| 21 | Contact detail | Strongly justified | Sensitive/no-store; may be a list drawer but capability is real. |
| 22 | Contact status | Required | Workflow consumer; transition/audit model required. |
| 23 | Published posts list | Required | Mandatory blog list. |
| 24 | Published post detail | Required | Mandatory blog detail and SEO. |
| 25 | Admin posts list | Required | Required editorial management. |
| 26 | Create draft | Required | Required admin CRUD; no general CMS. |
| 27 | Admin post detail | Strongly justified | Real editor consumer; may share create/edit DTO. |
| 28 | Edit post | Required | Required admin CRUD; optimistic conflict/sanitization. |
| 29 | Publish/archive post | Required | Required lifecycle; audit source must exist. |
| 30 | Admin analytics | Required | Required cards/charts; exact metric schemas. |
| 31 | Checkout outcome | Required | Prevents redirect flags from being treated as confirmation; owned attempt storage. |
| 32 | Trigger reconciliation | Premature | Keep as internal/scheduled dry-run until durable run/discrepancy model and operator need are proven. |
| 33 | Apply repair | Unsafe | Reject public route until approval artifact, immutable audit, CAS semantics and possibly two-person control are designed. |
| 34 | Readiness | Required | Render health consumer; bounded DB check. |
| 35 | Resume cancellation | Strongly justified | Subscription consumer; provider state/CSRF/idempotency. |
| 36 | Plans | Required | Removes frontend price/feature invention; cacheable public server truth. |

REST naming should remain plural `/payments`; resource routes should avoid action nouns when a resource/state mutation expresses the operation, but compatibility is more valuable than a cosmetic rewrite. The repair command belongs behind an operational command boundary first, not an internet-facing API. No `/v1` tree is needed.

## 9. Database Change Review

| ID | Existing problem / target invariant | Migration and operational assessment | Disposition |
|---|---|---|---|
| DB-01 | Refresh rows lack family/reuse/session state | Split core family lifecycle from optional device/session UI metadata; nullable expand, legacy-family backfill, dual read for max token lifetime, then constraints. Do not use IP as proof. | Mandatory core; optional metadata |
| DB-02 | Reset token is plaintext | Add hash/use timestamps, stop issuing plaintext first, invalidate legacy, dual code only long enough to reject old tokens. Unique hash/expiry index. | Mandatory before recovery release |
| DB-03 | No event inbox/ledger | New table; define RECEIVED→PROCESSING→PROCESSED/FAILED lease protocol. Unique event ID, bounded metadata, retention. | Mandatory before payment cutover |
| DB-04 | No durable checkout intent/return | New table with operation ID before Stripe call; client-key hash and normalized payload are missing from current row. | Mandatory before new checkout |
| DB-05 | Transaction identity double-counts | High-risk expand; use integer minor units beside Decimal, invoice link backfill, ambiguity table/report, unique only after clean reconciliation. Avoid table rewrite/default lock. | Mandatory, split across releases |
| DB-06 | Refunds/disputes unmodeled | Refund and dispute lifecycles differ. Use typed immutable adjustments or separate subtype rules; product policy first. | Deferred to billing-adjustment phase |
| DB-07 | Billing/access/cancel state conflated | Expand fields, reconcile provider snapshot, dual projection, then switch entitlement. Replace event-time-only guard. FREE-row cardinality migration is unspecified. | Mandatory, revised design |
| DB-08 | No moderation history | New append-only action table; historical boundary rather than fabricated actions. Actor/reason/action constraints and retention. | Feature-phase mandatory |
| DB-09 | Reports lack uniqueness/resolution | Current fields are `userId` and `PENDING/RESOLVED/DISMISSED`, not `reporterId`/`OPEN`. Deduplicate, add unique `(reviewId,userId)`, resolver/reason fields, enum migration only if justified. | Feature-phase mandatory; current plan incorrect |
| DB-10 | Contact has no persistence | New table in Contact phase, with PII retention and status taxonomy approved first. Avoid speculative normalized-email index. | Deferred to Phase 7 |
| DB-11 | Blog has no model | New small post table in Content phase. Code-owned help/legal avoids duplicated models. | Deferred to Phase 7 |
| DB-12 | User image lacks provider ownership ID | Nullable additive field, only new managed assets deletable. | Deferred to profile-image phase |
| DB-13 | User cascade deletes finance | Policy is not decided. Snapshot/anonymization/FK changes are irreversible after user deletion and must follow deletion/retention approval. | Blocked by product/retention decision |
| DB-14 | Cleanup queries need indexes | Not one migration concern; add the relevant index with each owning table and measure production locks. Prisma migrations may require hand-authored concurrent-index strategy. | Fold into owning changes |
| DB-15 | Read paths may need composite indexes | Evidence program, not a fixed schema change. Add one measured index per feature; `CONCURRENTLY` and transaction constraints require explicit SQL review. | Remove from fixed migration count |
| DB-16 | No media draft/archive lifecycle | Useful only if editorial lifecycle is approved. Add in media/admin phase, not auth/data-foundation phase. Every public query must dual-read before soft delete activates. | Deferred/product-dependent |
| DB-17 | No active-user timestamp | Metric definition and privacy/update cadence are unresolved; registered-user charts work without it. | Optional/defer |
| DB-18 | In-memory view suppression is instance-local | DB uniqueness is proportional, but anonymous HMAC input, proxy trust, secret rotation and retention require decisions. | P2/defer to analytics phase |

The 18 rows can be reduced as a fixed plan: fold DB-14/15 into owning migrations and omit DB-17 until an approved metric needs it. Conversely, DB-01, DB-05, DB-06, and DB-07 require multiple expand/backfill/constraint releases. The concern count is 18; the safe migration-file count is deliberately not fixed.

Production verification for every migration must include current table size, lock plan, old/new application compatibility, resumable backfill checkpoint, invariant query, constraint timing, rollback-to-old-code behavior, privacy/retention owner, and restore posture. `prisma migrate deploy` is appropriate but does not detect schema drift; it uses a short advisory-lock timeout and therefore is not the entire concurrency/recovery plan.

## 10. Stripe and Financial Review

### Decision assessment

1. **Paid Stripe invoice as canonical subscription transaction: approve with clarification.** Subscription billing produces invoices and payment execution references. Use invoice ID for one invoice-ledger row; retain Invoice Payment/PaymentIntent references for reconciliation. A zero-amount/discount/trial invoice must not be labeled revenue; decide whether to store a zero-value billing record or no financial transaction.
2. **Checkout completion never records revenue: approve.** Current source violates this and demonstrably creates a checkout transaction plus an invoice transaction.
3. **Durable event IDs: approve.** Stripe can redeliver the same Event.
4. **Separate domain-object uniqueness: approve.** Stripe also documents that separate Event objects can describe the same object/type.
5. **Event ordering guards: revise.** Do not use `event.created` alone. Retrieve the current subscription/invoice/refund where needed, apply object-specific allowed transitions and immutable object IDs, and treat event time as diagnostic/tie-break input rather than an authoritative version.
6. **Billing separate from entitlement: approve.** Entitlement is a derived policy result, not a mutable provider mirror.
7. **Scheduled cancellation retains paid-period access: approve.** Stripe emits an update when cancellation is scheduled and deletion when it takes effect.
8. **Reconciliation/manual repair: approve concept, revise exposure.** Daily and operator-triggered dry-run are justified; repair remains an internal command until discrepancy, approval, audit and CAS storage exist.

### Correct identities and scenarios

| Scenario/record | Required identity and behavior |
|---|---|
| Checkout attempt | Application operation ID + unique Checkout Session ID; stable Stripe idempotency key; no revenue/access. |
| Initial and renewal payment | Invoice ID is unique ledger identity; positive provider-confirmed amount contributes to collected revenue. PaymentIntent/Invoice Payment stays secondary correlation. |
| Failed/recovered invoice | Same invoice row evolves by allowed immutable lifecycle facts or is projected from current provider state; no new revenue until paid. |
| Scheduled cancellation/resume | Subscription ID + provider cancellation fields; entitlement through confirmed service period; resume only before terminal cancellation. |
| Immediate cancellation/deletion | Product/ops-authorized path; terminal provider fact prevents stale reactivation. |
| Re-subscription | New provider subscription ID/projection; old projection remains terminal/auditable. |
| Refund | Refund ID, immutable signed adjustment linked to invoice transaction; never rewrite original amount. |
| Dispute/chargeback | Dispute ID and distinct dispute lifecycle/type; do not disguise it as a refund. |
| Duplicate events | Event ID inbox plus invoice/refund/subscription object invariants. |
| Delayed/out-of-order events | Retrieve current object where necessary; object-specific transitions; reconciliation. |
| DB/provider failure | Durable operation/event receipt, safe same-key retry, no guessed state. |
| Ambiguous historical rows | Preserve; link only with provider evidence; mark unresolved exception; never delete/coerce to make totals balance. |

Recommended webhook protocol: verify signature; insert/acknowledge a unique minimal `RECEIVED` inbox row in a short transaction; return 2xx after durable receipt; claim a lease outside the provider call; retrieve authoritative provider state if required; atomically apply local object invariants and mark processed; retry/dead-letter from the inbox. This avoids holding a DB transaction over Stripe I/O and reconciles the contradictory claim/lease narratives. A database inbox plus bounded worker/recovery command is sufficient; a broker is not required at this scale.

“Monthly recognized revenue” is not decided. Safe default label is **net collected by payment date and currency**: paid invoice minor amounts plus successful adjustments, never cross-currency summed. Service-period revenue recognition is a separate finance policy and allocation algorithm.

## 11. Subscription and Entitlement Review

Billing fields should be stored; entitlement should be calculated at read time from a reconciled projection and policy configuration. A separately stored entitlement status would drift. All media detail/stream checks must call one policy. Current source has two similar raw checks and an ADMIN bypass.

| State | Safe behavior pending product approval |
|---|---|
| FREE/no row | Free media only; tolerate legacy FREE/ACTIVE rows during migration. |
| Checkout pending | No premium grant; show pending from owned attempt. |
| ACTIVE monthly/yearly | Grant only through current paid/trial-approved period. |
| TRIALING | Deny by default unless a real trial product and `trial_end` access policy are approved. |
| INCOMPLETE/expired incomplete | Deny premium. |
| PAST_DUE | Deny unless an approved bounded grace policy applies; never extend beyond service-period end. |
| Cancel at period end | Grant through period/cancel timestamp; show canceling, not canceled. |
| Expired/deleted | Deny; terminal state cannot be reopened by a stale snapshot. |
| Full refund | Safe default is reevaluate/deny for the refunded current period; product/finance approval required. |
| Partial refund | Record adjustment; retain access by default pending policy. |
| Disputed | Safe default suspend new premium delivery pending product/legal policy; do not label as refund. |
| Re-subscribed | New subscription projection; grant only from new authoritative state. |

Current period fields are sufficient only for the single-item plan actually offered. The pinned Stripe API version uses item-level periods; the architecture must state which item defines access and reject unexpected mixed-item subscriptions. Stale events cannot restore access when terminal state and current provider retrieval are used.

## 12. Authentication and Session Review

Keeping the in-memory access token and HttpOnly refresh cookie is the smallest appropriate design. Session metadata and a five-session UI are product scope, not prerequisites for secure rotation.

Required concurrency model:

1. A refresh row has an immutable hash, family, state (`ACTIVE`, `ROTATED`, `REVOKED`), rotation time, and successor reference.
2. One DB transaction conditionally changes one `ACTIVE` token to `ROTATED` and inserts exactly one successor. Only the winner returns the successor cookie.
3. A loser inside a short, configured race window receives a retryable `ROTATION_IN_PROGRESS` response, **does not receive the successor**, does not clear cookies, and does not revoke the family. The shared browser cookie jar can then apply the winner's Set-Cookie and retry.
4. Replay outside the bounded window, or replay after the successor has itself been used, revokes the family and clears the cookie.
5. Frontend single-flight remains per JavaScript context; use `BroadcastChannel` or tolerate server races across tabs. Never claim one module-level promise coordinates all tabs.
6. Cookie clearing distinguishes terminal invalid/reuse outcomes from benign concurrent rotation. A response from the loser must not erase a newer cookie.

User-agent/IP metadata is display/risk context only; IP must not authenticate a session. Family revocation is safe once the race rule is precise. Absolute/idle lifetimes and session caps require product approval. Current/all-session logout and reset revocation are strongly justified. CSRF must be a signed double-submit token or a server-session-bound random secret with explicit cookie/header names, path, `Secure`, rotation and failure behavior; “bound to session context” is not implementable detail.

## 13. Password-Reset Migration Review

Phase 0 should remove disclosure without pretending delivery works:

1. Stop logging/returning tokens immediately.
2. When production has no real mail adapter, do not create a reset token. Return the same stable operational-unavailable response for known and unknown addresses; the UI honestly says recovery is temporarily unavailable. Do not fail the entire CineTube process merely because email is absent unless the release owner explicitly chooses that availability trade-off.
3. Prevent legacy token redemption during the cutover or wait/document the one-hour maximum expiry after token issuance stops. Do not add startup `deleteMany` behavior.
4. Phase 3 expands `tokenHash/usedAt/invalidatedAt`, invalidates legacy rows, configures captured test mail and real provider, then enables issuance and redemption together.
5. Lookup uses SHA-256 of a 32-byte random token, unique hash, constant public responses, one-hour expiry (subject to product approval), transactional consume/password update/session revoke, route-specific rate limits and redacted monitoring.
6. Rollback disables requests/redeems safely; it never restores plaintext or console delivery.

“Production fails closed” is safe only when its scope is the recovery capability and messaging is truthful. Making all backend startup depend on an unconfigured email provider would convert a contained recovery defect into a production outage.

## 14. Retention and Deletion Review

No legal conclusion is made. DB-13 must not proceed until an owner decides soft deletion, hard deletion, anonymization, restoration, email reuse, public attribution, and retention periods. Safe interim behavior is soft-delete/login denial with no destructive cascade.

Financial provider identities, invoice ledger and adjustments may need retention, but customer name/email snapshots should be the minimum approved fields. Reviews/comments can remain with an anonymized display identity or be removed according to product policy; current cascade behavior would delete them. Stripe customer ID may remain only if required for billing/support retention. Releasing email uniqueness can enable confusing account recreation and must be explicit. Restore capability is incompatible with irreversible anonymization and should not be implied.

## 15. Review and Moderation Review

- One review per user/media is DB-enforced and should remain.
- Only `APPROVED` reviews count; current public queries and aggregate calculation confirm this.
- Current edits reset to pending and immediately hide the review, but update + rating recompute are not one transaction. The target must choose whether the last approved revision remains public during re-review or the review disappears.
- Status update, append-only moderation action and aggregate recomputation require one transaction plus a concurrency strategy (row lock/serializable retry or a deterministic aggregate update).
- Current report status is `PENDING`, not `OPEN`; reporter field is `userId`. Unique `(reviewId,userId)` is appropriate after duplicate inspection. Self-reporting should fail.
- Comment deletion already allows owner or ADMIN. There is no comment-update route despite document 19 claiming one.
- Admin moderation reasons should be required for rejection/removal/report resolution and bounded for audit safety.

## 16. Design-System and Page Review

Red, amber and neutrals are proportional and satisfy the maximum-three-primary-color intent. Light/dark/system, hydration bootstrap, focus, reduced motion, semantic tokens and existing shadcn primitives are appropriate. Static legal/help pages should not gain feature packages or CMS records without editorial need. Wrapper components are justified only when they add a repeated state/accessibility contract; otherwise use the primitive directly.

Accessibility requirements are testable through component keyboard tests plus runtime viewport/zoom/screen-reader checks. No-placeholder-content requires an owned-content checklist and link crawl, not visual inspection alone. The current eight-section home is structurally eight but not real/manageable; hardcoded hero/editor/pricing/FAQ claims must be removed or explicitly editorially owned.

## 17. Dashboard and Analytics Review

Three meaningful chart types are possible without decorative metrics:

| Chart | Exact metric/source | Range/cost/authorization |
|---|---|---|
| Bar | Published media count grouped by `Media.type` and `pricingType` | Current snapshot; admin; indexed publication/type only if measured. |
| Line | Daily new users from `User.createdAt`, or net collected per currency from corrected invoice ledger | Selected bounded range; admin; never call registrations “active”; never mix currencies. |
| Donut | Reviews grouped by `Review.status` | Current snapshot; admin; small fixed enum with text/table alternative. |

“Active users” is undefined until an activity event/window and update cadence are chosen; `lastActiveAt` is not automatically justified. Media views have only lifetime aggregate data, so no view time series exists. Recent moderation requires DB-08. Active subscribers must be derived from entitlement/billing categories with a stated clock. Revenue must be labeled net collected unless finance approves recognition. Every card needs an empty state, bounded query, owner and definition tooltip.

## 18. Contact and Blog Scope Review

The simplest Contact scope is one persisted submission, strict validation, honeypot/rate controls, a small approved status enum, optional assignee/note, admin list/detail/status, retention, and notification after commit. Generic idempotency is not necessary if a unique short-lived submission key or duplicate-submit protection suffices. Notification failure must not lose the row.

The simplest Blog scope is `DRAFT/PUBLISHED/ARCHIVED`, slug, title, excerpt, supported sanitized body, optional owned cover, author, published time and SEO fields, with public list/detail and admin CRUD. No page builder, revisions, arbitrary HTML, media library or generic CMS is justified. Help/FAQ/legal remain code-owned unless the editorial owner explicitly wants them in the same content model; do not maintain duplicate FAQ copy in home, pricing and content records.

## 19. Testing Review

Vitest/Supertest/RTL/Playwright and disposable PostgreSQL are reasonable. Provider ports with deterministic fakes and signed Stripe fixtures avoid credentials. Current evidence is zero test/spec files, zero workflow files, no backend ESLint dependency despite a lint script, and no test/typecheck/format scripts.

Phase 1 is too broad if one exit requires lint repair, both unit frameworks, DB isolation, Playwright, OpenAPI diff, scans, both builds and all merge protection at once. Split it into: 1A lint/unit clocks/fakes; 1B disposable DB/migration harness; 1C frontend component/E2E smoke; 1D minimal CI gates. Add OpenAPI diff only after Phase 2 generates a contract. Historical migration fixtures must be synthetic and versioned; no production copy is needed.

Critical missing/underspecified tests are: refresh winner/loser response ordering and cookie clearing; same-timestamp/stale Stripe snapshots; durable-receipt crash recovery; ambiguous invoice backfill; current/free subscription dual reads; review edit/aggregate race; reconciliation approval audit; and rollback with old code reading expanded schema. Provider sandbox checks remain manual pre-release, not CI.

## 20. Deployment and Migration Review

One automated migration actor is correct, but it is not selected. Current `render.yaml` has no `preDeployCommand` and uses `/api/health`; Render pre-deploy is available only on paid web services. Choose exactly one:

- paid Render `preDeployCommand` in the Blueprint, with overlapping-deploy policy set to wait; or
- one protected CI migration job that completes before Render deploy is triggered.

Never configure both. Prisma `migrate deploy --schema=../prisma/schema.prisma` is appropriate and uses advisory locking, but the lock timeout is short and the command does not detect schema drift. CI must separately validate migration history/upgrade and the release must fail before app rollout on migration failure.

Render's HTTP health check should point to `/api/ready`, not liveness, after readiness exists; `/api/health` remains fast process liveness. App rollback means old-compatible code over expanded schema. Irreversible data repair is forward-only; database restore is reserved for proven corruption. Current server signal handling disconnects Prisma and exits without closing/draining the HTTP server.

## 21. Roadmap Dependency Review

| Phase | Independent finding |
|---:|---|
| 0 | Safe only after recovery-outage behavior is corrected; exact narrow scope in document 34. |
| 1 | Split tooling/DB/frontend/CI subgates; do not require OpenAPI diff before Phase 2. |
| 2 | Establish patterns and migrate high-risk endpoints first; converting all 42 before auth/payment is oversized. |
| 3 | Blocked by lifetime, concurrency, CSRF and email decisions; split core secure rotation from optional session UI. |
| 4 | Must split event/invoice containment, projection/checkout, then adjustments/reconciliation. Repair API excluded. |
| 5 | Invalid as “exact DB-01–18”; move feature tables/indexes to owning phases. |
| 6 | Can proceed after frontend test baseline in parallel with backend security work. |
| 7 | Own DB-10/11 migrations here; content/retention owners required. |
| 8 | Core browse/detail does not depend on DB-16/18; optional lifecycle/view work is separately gated. |
| 9 | Own DB-12 and dashboard activity decisions here; session UI consumes Phase 3 APIs. |
| 10 | Block suspension/repair mutations until schema/audit/product policy; read-only admin areas may proceed. |
| 11 | Appropriate convergence gate. |
| 12 | Optimize measured behavior only; metadata work may start route-by-route earlier. |
| 13 | Runtime proxy/readiness/shutdown/jobs must complete before production, with provider-independent liveness. |
| 14 | Blocked until actor, plan, backup, origins, secrets and rollback are verified. |
| 15 | Appropriate independent gate; cannot cite document 30 as its independent evidence. |

Detailed entry/exit gates are in document 33.

## 22. Backlog Review

The count of 51 is exact, but 14 XL items violate the stated one-focused-task contract: BL-016, BL-017, BL-019, BL-026, BL-028, BL-032, BL-033, BL-037, BL-042, BL-044, BL-046, BL-047, BL-049 and BL-050. Each needs outcome-based child items before implementation.

BL-009 is unsafe until the concurrency algorithm is corrected. BL-019 lacks reconciliation/audit models. BL-044 assumes suspension/final-admin policy without schema. BL-023 mixes cleanup and unrelated index tuning. BL-050 mixes migrations, two deployments, backup/restore, rollback and smoke. Missing explicit backlog outcomes include correcting the API inventory/compatibility map, removing Checkout token storage, selecting a durable event-processing protocol, creating reconciliation approval/audit persistence, and closing product decisions.

Complexity distribution is S 1, M 10, L 26, XL 14. The backlog is a portfolio, not 51 implementation-ready single-thread tasks.

## 23. Traceability Review

Unique ID counts are ARC 18, SEC 30, PAY 28, DAT 30, UI 52 and OPS 26 = **184**. Every row has a current statement, target, phase and verification cell. None has an explicit acceptance-criterion/status/evidence-link column, so the matrix cannot itself prove completion.

Distinctness classification:

| Classification | Count | IDs/notes |
|---|---:|---|
| Valid distinct requirement | 147 | All IDs not listed below. Cross-layer security/UI/ops mirrors are retained where verification differs. |
| Compound; split before evidence closure | 28 | ARC-015/016; SEC-022/026; PAY-019; DAT-009/015/016/017/020; UI-003/016/020/022/024/027/031/035/036/039/043/046/050/051; OPS-008/018/020/025. |
| Optional but presented as mandatory | 7 | SEC-008/009; DAT-013/014/022/030; UI-023. |
| Architecture guardrail, not stakeholder requirement | 2 | ARC-012; DAT-012. |
| Exact duplicates | 0 | No duplicate ID/text; several justified cross-layer mirrors exist. |
| Missing current/target/phase/verification cell | 0 | Structural fields are present. |

Add an acceptance statement, status (`planned/in progress/evidenced/accepted exception`), evidence link and source (`rubric/CineTube reliability/optional`) to each atomic row. Do not mark a row complete from an ADR or design document.

## 24. ADR Review

| ADR | Classification | Required clarification/revision |
|---|---|---|
| 001 | Approve with clarification | Define hybrid precisely; module catalog is conceptual, not mandatory physical folders. |
| 002 | Revise | Combine small domains initially; classify admin/analytics/health/uploads correctly. |
| 003 | Approve with clarification | Comments merge candidate; legal/shared are not feature packages. |
| 004 | Revise | Remove hard-coded five-session decision; specify multi-tab race/grace/cookie outcomes. |
| 005 | Approve | Named capability/ownership policies fit the project. |
| 006 | Revise | Do not silently make whole-app startup depend on email; define recovery-only outage behavior. |
| 007 | Blocked by product decision | Grace, refund, dispute, trial and admin access remain open; ordering guard also changes. |
| 008 | Revise | Define durable receipt, lease, transaction and acknowledgement protocol; no provider I/O in DB transaction. |
| 009 | Approve with clarification | Invoice ledger fits subscription billing; define zero invoices and secondary Invoice Payment/PI correlation. |
| 010 | Revise | Add run/discrepancy/approval/audit persistence; internalize repair initially. |
| 011 | Approve with clarification | Select actor; account for drift check, lock timeout, concurrent-index SQL and feature-phased migrations. |
| 012 | Approve with clarification | Decide approved-revision visibility and transaction isolation/retry. |
| 013 | Approve | Server-mediated uploads are proportional. |
| 014 | Approve | Token/theme direction is proportional. |
| 015 | Revise | Explicitly remove Checkout token stash and define user-scoped cache tagging/clearing. |
| 016 | Approve | Redacted structured observability is justified. |
| 017 | Approve with clarification | Split Phase 1 and define deterministic upgrade fixtures/time budget. |
| 018 | Approve with clarification | Render plan/actor/health path/overlap policy must be selected at runtime gate. |
| 019 | Approve with clarification | Decision is sound; document 19's separate source inventory must be replaced. |
| 020 | Revise | Anonymous identity inputs/proxy/rotation/retention need privacy decision; retain as P2. |

Totals: 4 approve, 8 approve with clarification, 7 revise, 1 blocked by product decision, 0 reject/split/merge. Aggregated for the final response: **12 approval-class, 7 revision-class, 0 rejected, 1 blocked**.

## 25. Severity Review

The five P0 outcomes remain supported:

- P0-01 plaintext/logged reset secret: confirmed in schema/service.
- P0-02 no real reset delivery: confirmed; recovery is unusable without log access.
- P0-03 double-counted initial payment/revenue: confirmed checkout and invoice handlers both create transactions with different IDs.
- P0-04 unordered/non-durable event processing: confirmed and capable of entitlement/financial projection error.
- P0-05 paid cancellation loses access immediately: confirmed by CANCELED write plus ACTIVE-only entitlement.

The original 18 P1 rows are not atomic. The corrected count is **22**, documented in section 1 of document 33. It retains mandatory outcomes, removes the implication that session metadata/five-session UI is inherently P1, splits bundled operational/payment items, and adds confirmed omitted issues: Checkout access-token persistence, unverified payment-success copy, non-atomic approved-review edit, and false/unowned production plan/content claims.

## 26. Product Decisions

| ID | Decision / owner / deadline | Safe default and consequence of deferral |
|---|---|---|
| PD-01 | Past-due grace; Product + Finance; before Phase 4 projection | No grace. Deferral blocks PAST_DUE entitlement. Options: none or bounded 72h capped by period. |
| PD-02 | Refund eligibility and entitlement; Product + Finance; Phase 4C | Record adjustment; full current-period refund denies, partial retains pending review. Blocks refund UX. |
| PD-03 | Dispute/chargeback entitlement; Product + Finance/Legal; Phase 4C | Suspend premium pending resolution. Blocks dispute automation. |
| PD-04 | Net collected vs recognized revenue; Finance/Product; Phase 4C/10 | Label net collected by payment date. Recognition requires allocation policy. |
| PD-05 | Reporting timezone/currencies; Finance/Product; Phase 10 | UTC and currency-separated. Blocks combined finance charts. |
| PD-06 | Access/refresh/reset lifetimes; Security/Product; Phase 3 | 15m access, bounded 7d refresh, 1h reset as current/proposed baseline; approval blocks constraints. |
| PD-07 | Session cap/eviction/notice; Product/Security; Phase 3 optional UI | No new cap; retain secure revocation. Deferral does not block core rotation. |
| PD-08 | Email provider/sender/domain; Operations/Product; Phase 3 | Recovery disabled honestly in production. Blocks enabling recovery. |
| PD-09 | Recovery outage/startup behavior; Product/Operations; before Phase 0 | Recovery-only 503, whole app remains available. Blocks Phase 0 wording. |
| PD-10 | Retention matrix; Product/Privacy/Operations; before each affected migration | Minimize and expire operational/PII data; blocks DB-01 metadata, 03, 08, 10, 13, 18 constraints. |
| PD-11 | Editorial/legal/help/FAQ ownership; Product/Content; Phase 7 | Code-owned approved pages; blog model only. Blocks publishable copy. |
| PD-12 | Suspension/reactivation/final-admin policy; Product/Security; before Phase 10 | No suspension mutation. Blocks admin status endpoint/schema. |
| PD-13 | Account deletion/anonymization/restore/email reuse/public attribution; Product/Privacy; before DB-13 | Soft-delete only. Blocks hard deletion and finance FK change. |
| PD-14 | Preview-origin allowlist; Security/Operations; Phase 3 before preview, final Phase 14 | Production origin only. Blocks credentialed preview auth. |
| PD-15 | RPO; Operations/Product; Phase 14 | Do not claim target until provider plan verified. Blocks release evidence. |
| PD-16 | RTO; Operations/Product; Phase 14 | Do not claim target until restore drill. Blocks release evidence. |
| PD-17 | ADMIN premium entitlement; Product/Security; Phase 4 | No implicit bypass; grant only through an explicit audited preview capability if needed. |
| PD-18 | Media draft/archive/delete lifecycle; Product/Content; before DB-16 | Preserve current hard-delete behavior only for admin test data; defer new lifecycle. |
| PD-19 | Active user/recent activity definition; Product/Privacy; Phase 9/10 | Use registrations and explicit domain activity labels; do not create `lastActiveAt` yet. |
| PD-20 | Authoritative plans/features/pricing/refund marketing; Product/Finance; before Phase 4/7 | Expose only backend-supported FREE/MONTHLY/YEARLY facts; remove Gold/refund promises. |
| PD-21 | Approved review visibility during edit re-review; Product/Moderation; Phase 5 | Hide pending revision as current behavior, with clear user copy; alternate requires revision storage. |
| PD-22 | Contact categories/status/assignment/retention; Product/Support/Privacy; Phase 7 | Minimal NEW/IN_PROGRESS/RESOLVED, no assignment unless owner exists. |

There are **22** product decisions. Only decisions relevant to a phase block that phase; optional session UI does not block core auth security.

## 27. Runtime Verification

| ID | Environment and precondition | Procedure / expected result / failure evidence | Owner / deadline / block |
|---|---|---|---|
| RV-01 | Stripe test mode; pinned SDK/event destination version | Capture real fixtures for subscribed event types; DTO parsing succeeds. Save redacted fixture/version; parse failure is evidence. | Billing; Phase 4 entry; blocks payment work. |
| RV-02 | Test webhook + disposable DB | Replay, concurrent duplicate, separate events for same object, reverse order and same timestamp; one object mutation. Preserve event/run logs on failure. | Billing; Phase 4 exit; blocks payment release. |
| RV-03 | Stripe test mode | Initial, renewal, failure/recovery, cancel/resume/delete/re-subscribe/refund flows; projection/entitlement match table. | Billing/Product; Phase 4 exit; blocks release. |
| RV-04 | Read-only Stripe history + sanitized local report | Reconcile invoice/session/current Transaction links; ambiguous rows remain exceptions. | Finance; before DB-05 constraint; blocks migration. |
| RV-05 | Render staging | Send known proxy/header requests and inspect Express IP/protocol without secrets; configure exact hop only. | Operations/Security; Phase 13; blocks production. |
| RV-06 | Render account/plan staging | Confirm paid pre-deploy availability or select CI actor; run no-op command before deploy. | Operations; Phase 14 entry; blocks migration deploy. |
| RV-07 | Render/CI staging | Trigger overlapping releases; one actor runs, second waits/fails safely; capture events/migration table. | Operations; Phase 14; blocks production. |
| RV-08 | Render staging | Long request + SIGTERM; stop accepts, readiness 503, drain, disconnect within configured delay. | Backend/Ops; Phase 13; blocks production. |
| RV-09 | Vercel preview/prod + Render staging | Browser refresh/login/logout with `Secure; HttpOnly; SameSite=None`; no cookie loss. HAR/cookie screenshot on failure, no secret value. | Frontend/Security; Phase 14; blocks production auth. |
| RV-10 | Same | Exact origin passes; lookalike, null and unapproved preview fail with credentials. | Security; Phase 3 staging/14 prod; blocks production. |
| RV-11 | Same | Missing/mismatch/signed CSRF cases for cookie mutations; webhook unaffected. | Security; Phase 3/14; blocks production. |
| RV-12 | Production read-only DB metadata | Compare `_prisma_migrations`, committed history and expected schema; no drift assumption. | DBA/Ops; Phase 14 entry; blocks migration. |
| RV-13 | Production-like snapshot/staging | Record row counts, EXPLAIN and lock duration for each migration/index. | DBA/module owner; each migration; blocks that constraint/index. |
| RV-14 | Isolated restore environment | Verify backup/PITR plan, restore, run finance/rating invariants, record elapsed/data point. | Operations; Phase 14; blocks production. |
| RV-15 | Email sandbox then production domain | Verify SPF/DKIM/provider acceptance, known/unknown public parity, delivered link and suppression failure. | Operations/Security; Phase 3/14; blocks recovery enablement. |
| RV-16 | Cloudinary test folder | Upload spoof/oversize/dimension cases; inspect folder/format/ownership; wrong-ID delete fails. | Backend/Security; Phase 9/10; blocks upload release. |
| RV-17 | Production frontend build | Capture 320/375/768/1024/1440 and 200% zoom; no page overflow or hidden action. | Frontend/Design; Phase 11; blocks UI release. |
| RV-18 | Production frontend build | Keyboard journeys, axe, reduced motion, contrast, representative screen reader; retain issue evidence. | Accessibility owner; Phase 11; blocks mandatory UI release. |
| RV-19 | CI clean checkout | Measure immutable install, gates, DB/E2E isolation and duration; no credentials/live providers. | Engineering; Phase 1; blocks risky phases. |
| RV-20 | Staging monitoring | Inject synthetic readiness/auth/payment/job failures; alert routes to current runbook without secrets. | Operations; Phase 13; blocks production. |
| RV-21 | Staging | Deploy expanded schema/new app, roll app back, verify old reader; exercise forward-repair runbook. | Release/DBA; Phase 14; blocks production. |
| RV-22 | Staging then production read-only | Run bounded reconciliation dry-run; zero unexplained financial discrepancy or approved exception. | Finance/Ops; Phase 4/14; blocks payment release. |
| RV-23 | Production-safe | Public/member/admin/health/provider-safe smoke tied to release SHA; no real charge. | Release owner; Phase 14; blocks promotion. |
| RV-24 | Staging | DB available/unavailable checks: `/health` stays fast, `/ready` returns 200/503 within timeout; Render gates on ready. | Backend/Ops; Phase 13; blocks production. |

There are **24** runtime-verification items. RV-01 and CI harness validation block risky implementation; most remaining checks block feature activation or production, not Phase 0.

## 28. Architecture Scorecard

| Category | Score | Required correction for scores below 4 |
|---|---:|---|
| Source grounding | 3 | Replace the current endpoint inventory; correct home/report/source claims. |
| Architectural proportionality | 3 | Treat eight packages as initial domains; classify infrastructure/read models; defer optional schema. |
| Domain cohesion | 3 | Merge users/profiles, media/genres, reviews/comments and billing pairs initially. |
| Incremental migratability | 4 | Direction is sound once Phase 5 is redistributed. |
| Security | 3 | Specify rotation races, CSRF binding, token stash removal, suspension/audit schema. |
| Payment correctness | 2 | Replace event-time ordering, define event inbox, reconciliation persistence and finance semantics. |
| Data integrity | 3 | Correct DB-09, review-edit transaction and retention-dependent deletion. |
| API coherence | 2 | Rebuild source baseline; retain plural/slug compatibility; remove unsafe repair API. |
| Frontend coherence | 3 | Remove token persistence/fake success and limit route-only abstractions. |
| Accessibility planning | 4 | Strong plan with appropriate manual/runtime evidence. |
| Testing feasibility | 3 | Split Phase 1 and add missing concurrency/backfill/rollback cases. |
| Deployment safety | 3 | Select migration actor/plan, ready health path and overlap policy. |
| Recoverability | 3 | Persist repair workflow and prove restore/app rollback. |
| Requirements coverage | 4 | Broad coverage; atomicity/status fields still need repair. |
| Backlog executability | 2 | Decompose 14 XL items and add missing corrective outcomes. |
| Documentation consistency | 2 | Resolve contradictions and replace document 30's no-blocker claim. |

## 29. Required Corrections

Document 32 contains 40 correction records: **26 Required**, 2 Recommended, 3 Clarification, 8 Product decision, and 1 Runtime verification. Required items are ACR-001/002/003/006/008/009/010/011/012/013/014/015/019/020/021/022/025/026/027/028/029/030/032/033/035/036.

The implementation-start gate requires acceptance of the corrections relevant to Phase 0, replacement of the factual baseline, and agreement that no payment/schema/dependency/deployment work is included. Payment/database gates require all related corrections, decisions and runtime preconditions, not merely document creation.

## 30. Final Recommendation

Accept the stack, modular-monolith direction, in-memory JWT model, invoice-ledger direction, derived entitlement, provider adapters, design/accessibility direction, and expand-compatible deployment strategy. Do not execute the 16-module folder tree, 60-row API plan, 18-change Phase 5, refresh reuse algorithm, event ordering, reconciliation repair endpoints, or XL backlog items exactly as written.

After the Phase 0 documentation gate is accepted, approve only reset-secret containment and honest recovery-unavailable behavior. Then split Phase 1, rebuild the API baseline, and close the auth/payment product and state-machine decisions before any migration. Payment migration, database migration, broad frontend implementation, and production release remain no-go.
