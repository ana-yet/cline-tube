# 25. Gladiator Requirements Traceability Plan

## How to use this plan

This is the architecture-pass traceability baseline. `Current` is based on source/discovery, not the desired brief. `Target/decision` points to the controlling architecture rather than claiming implementation. Phase numbers refer to the 16-phase roadmap in document 26. Verification is the minimum evidence required to close the row; a document alone cannot close an implementation requirement.

## Architecture and contract requirements

| Requirement ID | Requirement | Current | Target/decision | Phase | Verification |
|---|---|---|---|---|---|
| ARC-001 | Preserve confirmed technology stack | Next/React/Express/Prisma/Postgres/Stripe/Cloudinary present | Retain stack; no rewrite (ADR-001) | 0–15 | Manifest/source review and final diff |
| ARC-002 | Incremental modular monolith | Layered monolith, cross-domain services | Hybrid domain-oriented modular monolith (ADR-001/002) | 2–14 | Dependency tests and module review |
| ARC-003 | Frontend feature boundaries | Route/page-heavy components | 17 feature boundaries (ADR-003) | 6–12 | Import-boundary check and route ownership |
| ARC-004 | Backend domain boundaries | Route/controller/service layout | 16 named modules with owned models/APIs | 2–13 | Module catalog and import checks |
| ARC-005 | Shared-kernel limits | General utilities mixed | DTO/error/auth/log primitives only; no business service dumping ground | 2 | Architecture review |
| ARC-006 | Provider adapter boundaries | Stripe/Cloudinary logic partly direct | Billing, asset, and email ports in infrastructure (ADR-006/013) | 3–5 | Adapter contract tests |
| ARC-007 | Data-access boundaries | Prisma service access | Owning module repositories/transactions; no frontend/raw record exposure | 2–5 | Import review and DTO tests |
| ARC-008 | Validation boundaries | Incomplete endpoint/path validation | Zod at HTTP boundary plus domain invariants | 2 | Contract test matrix |
| ARC-009 | Authorization boundaries | Middleware plus ad hoc service checks | Named capability, ownership, entitlement policies (ADR-005) | 2–4 | Policy tests per route |
| ARC-010 | API response boundaries | Inconsistent/raw-ish shapes | Explicit request/response DTOs and standard envelopes (ADR-019) | 2 | OpenAPI/schema response tests |
| ARC-011 | Background-task boundary | No durable job discipline | Leased reconciliation/cleanup/backfill outside web process | 4–5,13 | Job concurrency/restart tests |
| ARC-012 | No unjustified microservices/events | Monolith | Remain monolith; domain calls and narrow audit records only | All | Architecture review |
| ARC-013 | API versioning decision | `/api`, no formal version | Keep `/api`; version only for independently supported breaking contract | 2 | ADR-019 approval |
| ARC-014 | API documentation | None | OpenAPI 3.1 generated from runtime schemas | 2 | Generated doc and breaking diff |
| ARC-015 | Standard errors and request IDs | Central error handler, inconsistent details | Stable code/message/details/requestId envelopes | 2 | HTTP tests for 400/401/403/404/409/429/500 |
| ARC-016 | Pagination/filter/sort contract | Mixed validation; limits already capped at 50 | Default 20/max 50, typed filters, allowlisted stable sorts | 2,8 | Contract/query-plan tests |
| ARC-017 | Deprecation strategy | None | Compatibility window plus Deprecation/Sunset headers and usage observation | 2,15 | Header and usage report |
| ARC-018 | Observability boundary | Console-centric/inconsistent | Structured redacted signals at HTTP/domain/provider/job boundaries | 13 | Log/metric redaction tests |

## Authentication, authorization, and security

| Requirement ID | Requirement | Current | Target/decision | Phase | Verification |
|---|---|---|---|---|---|
| SEC-001 | Keep access tokens in memory | Implemented | Preserve; never persist browser-side (ADR-004) | 3 | Storage inspection/E2E reload |
| SEC-002 | Authentication reflects API capability | `user && accessToken` currently correct | Preserve invariant through restore and route gates | 3 | Unit/component tests for missing half-state |
| SEC-003 | Hashed refresh tokens | Implemented | Preserve with session metadata | 3 | DB/service tests and log scan |
| SEC-004 | Atomic refresh rotation | Exists without reuse family detection | Conditional consume plus one successor | 3 | Concurrent integration test |
| SEC-005 | Refresh-token reuse detection | Missing | Revoke reused family and require login | 3 | Replay integration test |
| SEC-006 | Current-session logout | Exists, limited semantics | Idempotently revoke current family and clear cookies/cache | 3 | API + E2E logout test |
| SEC-007 | Logout all sessions | Missing | Revoke all user families | 3 | Multi-session integration test |
| SEC-008 | Session metadata/UI | Missing | Safe device/time list and revoke controls | 3,9 | DTO/privacy and E2E tests |
| SEC-009 | Session limit | Missing | Maximum five live families; evict least recently used with notice | 3 | Sixth-login integration test |
| SEC-010 | Hashed reset tokens | Plaintext | Store hash only; invalidate legacy tokens (ADR-006) | 3,5 | DB/log/security tests |
| SEC-011 | No reset-token logging | Token logged | Redaction and no raw token in response/log | 3 | Captured-log assertion |
| SEC-012 | Real reset email | Console-only/no delivery | Email adapter with production provider | 3 | Adapter contract + test-mail E2E |
| SEC-013 | Non-enumerating reset | Incomplete production flow | Generic response/timing and single-use expiry | 3 | Known/unknown account comparison |
| SEC-014 | Password reset invalidates sessions | Incomplete | Revoke all refresh families on success | 3 | Integration test |
| SEC-015 | Token cleanup | No cleanup | Indexed bounded scheduled cleanup | 5,13 | Expiry cleanup integration/metric |
| SEC-016 | CSRF for refresh/logout/cookie mutations | Incomplete | Exact Origin plus double-submit CSRF | 3 | Origin/header/cookie matrix |
| SEC-017 | Production CORS | Configured but needs hardening/preview plan | Parsed exact credentialed origins; explicit previews | 3,14 | Deployed cross-origin tests |
| SEC-018 | Secure cross-site cookies | Production behavior exists | `Secure; HttpOnly; SameSite=None`, bounded path/lifetime | 3,14 | Browser cookie inspection |
| SEC-019 | Login redirect sanitization | Unsafe/incomplete | Same-app relative route allowlist | 3 | Malicious return-path tests |
| SEC-020 | Logout clears TanStack cache | Missing | Remove all user-scoped queries | 3 | Cross-user E2E test |
| SEC-021 | Login password validation alignment | Front/back differ | Shared policy values and matching messages; server authoritative | 2,3 | Schema parity tests |
| SEC-022 | Protected-route UX | Client-only gate can flash/wait poorly | Unknown skeleton, one restore, distinct 401/403, sanitized redirect | 3,6 | Component/E2E tests |
| SEC-023 | Backend remains security boundary | Already true | All protected operations enforce backend policies | 2–10 | Route access matrix integration suite |
| SEC-024 | Roles remain USER/ADMIN | Implemented | Retain two roles; named capability policies | 2 | Policy table tests |
| SEC-025 | Ownership enforcement | Present but uneven | Central policies for review/comment/watchlist/session/profile/billing | 2–4 | Cross-user negative tests |
| SEC-026 | Admin capabilities/audit | Simple role checks; limited audit | Named admin operations and append-only state audit | 5,10 | Admin negative/audit tests |
| SEC-027 | Premium entitlement enforcement | Backend service exists; cancellation bug | One backend decision function and safe DTO | 4 | Entitlement matrix tests |
| SEC-028 | Rate limits | Production process-local global limiter | Route-specific bounded limits; document single-instance limitation | 3,13 | 429 contract/load smoke |
| SEC-029 | `trust proxy` | Missing | Configure exact hop/Render behavior after runtime verification | 13,14 | Staging IP/protocol/rate-limit test |
| SEC-030 | Sensitive-log redaction | Reset token currently exposed | Redact auth/payment/provider/contact/upload secrets | 3,13 | Automated captured-log scan |

## Payment and subscription requirements

| Requirement ID | Requirement | Current | Target/decision | Phase | Verification |
|---|---|---|---|---|---|
| PAY-001 | Hosted Stripe Checkout | Implemented | Preserve hosted Checkout | 4 | Test-mode/manual flow |
| PAY-002 | Server-authoritative plan/price | Client cannot set arbitrary price | Preserve allowlist; expose safe plans endpoint | 4 | Unknown-price negative test |
| PAY-003 | Prevent checkout for active subscriber | Multiple sessions possible | Check derived state plus live attempt before provider call | 4 | Concurrent checkout test |
| PAY-004 | Checkout idempotency | Missing durable behavior | Client operation record plus stable Stripe key | 4,5 | Same/different payload tests |
| PAY-005 | Stripe customer creation idempotency | Partial drift possible | Persist/retrieve stable customer identity before retry | 4 | Ambiguous-timeout adapter test |
| PAY-006 | Preserve initiating return page | Not consistently supported | Store sanitized relative return path in checkout attempt | 4,9 | Profile/media return E2E |
| PAY-007 | Verify frontend confirmation | URL parameter displayed as success | Fetch owned checkout attempt/subscription state | 4 | Forged URL parameter test |
| PAY-008 | Delayed webhook behavior | Polls subscription; no durable attempt | Pending UI plus bounded polling; webhook/reconcile truth | 4 | Delayed fixture E2E |
| PAY-009 | Webhook signature | Implemented | Preserve raw-body verification | 4 | Valid/invalid signature tests |
| PAY-010 | Webhook event ledger | Missing | `ProcessedStripeEvent` with lease/status/error | 4,5 | Duplicate/concurrency tests |
| PAY-011 | Event idempotency | Missing event-ID persistence | Unique event ID plus domain-object uniqueness | 4 | Replay test |
| PAY-012 | Event ordering | Older events can overwrite | Provider-event-time compare-and-set/allowed transitions | 4 | Out-of-order fixture tests |
| PAY-013 | Canonical transaction identity | Checkout and invoice both create rows | Paid Stripe invoice ID only (ADR-009) | 4,5 | Initial invoice produces one row |
| PAY-014 | Prevent double-counted revenue | Currently possible | Invoice uniqueness and adjustment-aware net aggregation | 4,5,10 | Finance invariant/report test |
| PAY-015 | Subscription synchronization | Partial event mapping | Deterministic provider projection and reconciliation | 4 | State-transition fixture matrix |
| PAY-016 | Cancel at period end | Immediately loses premium | Keep entitlement through paid period | 4 | Boundary-clock integration/E2E |
| PAY-017 | Resume cancellation | Missing | Idempotent provider resume when valid | 4 | Adapter/integration test |
| PAY-018 | Failed payment/past due | Inconsistent state behavior | Billing state plus proposed 72h capped grace | 4 | Product-approved clock matrix |
| PAY-019 | Incomplete/trialing/expired/deleted/resubscribed | States incomplete/unused | Explicit mapping and transition rules | 4 | Provider fixture matrix |
| PAY-020 | Refund processing | Missing | Immutable provider refund adjustments | 4,5 | Partial/full/replay tests |
| PAY-021 | Refund entitlement | Undefined | Full current-period refund revokes; partial does not automatically | 4 | Product-approved policy tests |
| PAY-022 | Revenue calculation | May double count, no refunds | Gross/refund/net by currency from canonical ledger | 4,10 | Aggregate fixture tests |
| PAY-023 | Reconciliation | Missing | Daily/on-demand bounded dry-run comparison | 4,13 | Known-drift report test |
| PAY-024 | Manual repair | Missing | Explicit approved compare-and-set audited repair | 4,10 | Conflict/audit/authorization test |
| PAY-025 | Partial Stripe/DB failure | Can drift | Durable identity, ambiguous-result lookup, ledger, reconciliation | 4 | Fault-injection integration test |
| PAY-026 | Payment monitoring | Minimal | Checkout/webhook/conflict/drift metrics and alerts | 13 | Synthetic failure alert exercise |
| PAY-027 | Separate tier/billing/entitlement/cancellation/period | Conflated status/access checks | Distinct projection fields and derived entitlement | 4,5 | DTO/state matrix review |
| PAY-028 | FREE users | Lazy subscription rows | No fabricated paid row; entitlement `NONE` plus free-media rule | 4,5 | New-user data test |

## Data, reviews, views, uploads, contacts, and content

| Requirement ID | Requirement | Current | Target/decision | Phase | Verification |
|---|---|---|---|---|---|
| DAT-001 | Database-enforced one review/user/media | Present | Preserve | 5 | Constraint/concurrency test |
| DAT-002 | Review pending/approved/rejected lifecycle | Present, limited audit | Explicit transition policy | 5,10 | State transition tests |
| DAT-003 | Review edit/resubmission behavior | Inconsistent/implicit | Meaningful edit returns to pending | 5 | Service integration test |
| DAT-004 | Public rating integrity | Recalculation exists | Only approved reviews count; transition + recompute one transaction | 5 | Concurrent approve/edit/delete tests |
| DAT-005 | Moderation audit | Missing | Append-only `ReviewModerationAction` | 5,10 | Audit row assertions |
| DAT-006 | Review reports | Incomplete/unused | Report/create/admin resolve workflow | 5,10 | API/E2E queue test |
| DAT-007 | Duplicate report prevention | Missing | Unique reporter/review | 5 | Constraint and 409 test |
| DAT-008 | Comment deletion/admin override | CRUD exists | Owner or explicit admin moderation policy | 2,5 | Cross-user/admin tests |
| DAT-009 | Review likes/watchlist duplicate safety | DB-enforced | Preserve | 5 | Constraint regression tests |
| DAT-010 | Anonymous/authenticated view counting | Process-local suppression | Daily HMAC viewer key with DB uniqueness | 5,8 | Multi-instance/concurrency simulation |
| DAT-011 | View abuse/accuracy policy | Approximate, process-local | Approximate daily unique; rate limit; clearly defined analytics | 5,13 | Duplicate/expiry/load tests |
| DAT-012 | Avoid unjustified Redis | No Redis | PostgreSQL dedup at current scale (ADR-020) | 5 | Load/query-plan checkpoint |
| DAT-013 | User hard-delete finance retention | Cascade risk | Nullable user FK + immutable customer snapshot; retention approval | 5 | Delete/finance history test |
| DAT-014 | Soft delete/media retention | Only User soft deleted | Published/archive/soft-delete media; explicit retention policy | 5,10 | Visibility/delete tests |
| DAT-015 | Required indexes/constraints | Gaps vary | Evidence-led indexes plus 18-change register | 5 | Migration/query-plan tests |
| DAT-016 | Unused Account/enum states | Incomplete/unused | Audit per migration; remove only in later proven contract phase | 5,15 | Usage search and migration review |
| DAT-017 | Placeholder seed credentials/streams | Present in seed content | Production-safe seed policy; no placeholders in final | 5,15 | Seed/config/content scan |
| DAT-018 | Profile image ownership data | User URL only | Store managed public ID alongside URL | 5,9 | Replace/delete ownership test |
| DAT-019 | Contact persistence | Missing | `ContactSubmission` with status/assignment/retention | 5,7,10 | Persistence/admin E2E |
| DAT-020 | Contact validation/spam/rate limit | Missing | Strict schema, honeypot/rate controls, safe generic response | 7 | Abuse and validation tests |
| DAT-021 | Contact admin workflow | Missing | List/detail/assign/resolve with audit | 10 | Admin E2E |
| DAT-022 | Contact email notification | Missing/optional | Adapter notification after persistence; failure does not lose submission | 7 | Provider-failure integration test |
| DAT-023 | Simple blog/content model | Missing | Draft/published post, slug/body/cover/author/SEO | 5,7,10 | CRUD/public visibility tests |
| DAT-024 | Blog admin CRUD | Missing | Admin create/edit/publish/archive with optimistic conflicts | 10 | Admin E2E/audit test |
| DAT-025 | Public blog list/detail | Missing | Cacheable published-only routes/endpoints | 7 | Draft isolation and SEO test |
| DAT-026 | Accepted upload formats | MIME only | JPEG/PNG/WebP (GIF only if explicitly needed), actual signature checked | 9,10 | Spoofed-file tests |
| DAT-027 | Upload size/dimension/memory limits | Memory buffered, incomplete | Route byte/concurrency caps plus decoded pixel limits | 9,10 | Oversize/decompression tests |
| DAT-028 | Upload ownership/folder/public ID | Unsafe delete surface | Stored owned asset IDs and server-selected folders | 9,10 | Arbitrary-ID negative tests |
| DAT-029 | Replace/delete/orphan behavior | Ad hoc | Attach new in transaction boundary, delete old after commit, retry cleanup | 9,13 | Provider-failure/idempotency tests |
| DAT-030 | Server-mediated vs direct upload | Server-mediated | Retain server mediation at assignment scale (ADR-013) | 9 | Architecture/load checkpoint |

## Frontend, design, page, accessibility, and performance

| Requirement ID | Requirement | Current | Target/decision | Phase | Verification |
|---|---|---|---|---|---|
| UI-001 | Light, dark, and system themes | Permanent dark | Tokenized three-mode theme with safe persistence | 6 | First-paint/hydration/theme tests |
| UI-002 | Brand/color/contrast system | Inconsistent dark styles | Red + amber + neutrals; measured contrast | 6,11 | Token review and contrast testing |
| UI-003 | Spacing/type/radius/shadow/z-index/breakpoints | Inconsistent | 4px grid, unified scales and content containers | 6 | Visual regression/design review |
| UI-004 | Motion/reduced motion | Framer Motion; gaps | Restrained motion and reduced-motion variants | 6,11 | OS preference tests |
| UI-005 | Focus rings | Gaps | Visible high-contrast focus token | 6,11 | Keyboard review |
| UI-006 | Required primitive inventory | Incomplete shared set | Reuse shadcn for named controls/states/uploads | 6 | Story/component inventory |
| UI-007 | Skeleton loaders | Missing | Route/section/table/form-shape skeletons | 6–10 | Component and route tests |
| UI-008 | Loading/error/empty states | Several missing | Every async page/section owns all states | 6–10 | State matrix tests |
| UI-009 | Media card description/fallback | Missing | Shared card with bounded text and image fallback | 8 | Component tests |
| UI-010 | Listing grid responsiveness | Four desktop columns | Content-driven 1–5 columns with runtime QA | 8,11 | Viewport/zoom screenshots |
| UI-011 | Home has eight real sections | Eight areas, some hardcoded | Eight endpoint/manageable-data sections; omit empty | 7,8 | Data/state/a11y review per section |
| UI-012 | No fake testimonials/partners/statistics | Hardcoded content risk | Only derived or editorially managed truthful content | 7,15 | Content audit |
| UI-013 | Public About page | Missing | Code-owned accurate product page | 7 | Route/content/metadata test |
| UI-014 | Public Contact page/form | Missing | Accessible persisted form | 7 | E2E submission |
| UI-015 | Public Blog list/detail | Missing | Published content routes | 7 | Public/draft isolation E2E |
| UI-016 | Help/Privacy/Terms pages | Missing/placeholders | Owned real content and metadata | 7 | Link/content audit |
| UI-017 | Footer placeholder links | Seven placeholders | Real owned routes; no dead placeholder anchors | 7 | Link crawl |
| UI-018 | Pricing route | Subscription UI exists partially | Server-authoritative plan presentation | 7,9 | Plan/CTA/return E2E |
| UI-019 | Browse search/type/genre/pricing/rating/year | Partially supported | URL-owned validated filter set | 8 | Query/API/E2E matrix |
| UI-020 | Browse sorting/pagination/result count | Present, inconsistent states | Stable allowlist, page max 50, visible count | 8 | Contract and E2E tests |
| UI-021 | Mobile filter experience | Runtime verification needed | Sheet with explicit apply/reset and focus return | 8,11 | Mobile keyboard/touch QA |
| UI-022 | Media poster/backdrop/metadata/synopsis/genres | Mostly present | Unified detail hierarchy and image fallbacks | 8 | Component/visual tests |
| UI-023 | Cast/director/gallery data | Schema support may be limited | Render only verified modeled data; schema expansion requires product value | 8 | Data-availability checkpoint |
| UI-024 | Media rating/watchlist/reviews/comments/related | Mostly partial | Typed sections with complete states and policies | 8 | Integration/E2E tests |
| UI-025 | Premium stream safety | Backend controls exist | Entitlement-gated action; URL absent before grant | 4,8 | DTO/network negative test |
| UI-026 | Media SEO/structured data | Per-page metadata missing | Server metadata and valid Movie/TV structured data from public DTO | 12 | HTML/schema validator |
| UI-027 | Common form pattern | Inconsistent | RHF/Zod, server mapping, error focus/ARIA/autocomplete/pending | 6,11 | Form component test matrix |
| UI-028 | Login/register/recovery forms | Exist with gaps | Apply common pattern and security semantics | 3,6 | Component/E2E tests |
| UI-029 | Contact form | Missing | Apply common pattern and abuse-safe response | 7 | Component/E2E tests |
| UI-030 | Media create/edit forms | Exist, large/admin gaps | Shared fields, asset ownership, optimistic conflict | 10 | Admin CRUD E2E |
| UI-031 | Profile/password forms | Password/image missing | Own profile, image, password workflows | 9 | Component/E2E tests |
| UI-032 | Cancellation confirmation | Existing behavior flawed | Impact/period shown; focus-safe confirm; server truth | 4,9 | E2E boundary test |
| UI-033 | User dashboard | Missing | Watchlist/review counts/status/recent activity/subscription | 9 | DTO definitions and E2E states |
| UI-034 | Admin sidebar at least six meaningful items | Three links | Overview, Catalog, Community, Users, Billing, Contacts, Content | 10 | Navigation/role/mobile test |
| UI-035 | Total/active user metrics | Limited dashboard | Defined totals and coarse activity range | 10 | Aggregate SQL fixture test |
| UI-036 | Media/review metrics | Limited | Live catalog and approved/pending/report queue definitions | 10 | Aggregate tests |
| UI-037 | Premium subscriber metric | Risk of status conflation | Derived active/grace/canceling definitions shown separately | 10 | State fixture aggregate test |
| UI-038 | Monthly recognized revenue | Double-count risk | Paid invoices plus adjustments, per currency | 4,10 | Finance aggregate test |
| UI-039 | Media views/recent moderation | Process-local/incomplete audit | Durable dedup aggregates and audit timeline | 5,10 | Aggregate/audit tests |
| UI-040 | Bar chart | Missing | Catalog/subscription categorical metric with definition/table | 10 | Component/a11y/data test |
| UI-041 | Line chart | Missing | Time-series users/revenue/views with range/currency | 10 | Component/a11y/data test |
| UI-042 | Pie/donut chart | Missing | Small bounded distribution only, with text/table alternative | 10 | Component/a11y/data test |
| UI-043 | Semantic landmarks/headings/names | Gaps | Route landmarks, one h1, ordered headings, accessible names | 11 | axe + manual screen reader |
| UI-044 | Dialog focus/Escape/return | Gaps | Radix behavior preserved and tested | 6,11 | Keyboard component/E2E |
| UI-045 | Form error associations | Gaps | `aria-invalid`, `aria-describedby`, summary/first-error focus | 6,11 | RTL + manual screen reader |
| UI-046 | Image alt/table semantics/touch/contrast | Gaps | Contextual alt, semantic tables, 44px targets, measured contrast | 11 | Manual/automated audit |
| UI-047 | Runtime responsive verification | Outstanding | 320–1440px, 200% zoom, no horizontal overflow | 11 | Screenshot/manual matrix |
| UI-048 | Server/client boundaries | Many client pages | Public SSR/cache; protected client capability | 8,12 | Bundle/render/data review |
| UI-049 | TanStack Query keys/cache invalidation | Present, inconsistent logout | Feature key factories and narrow invalidation | 3,8–10 | Cache behavior tests |
| UI-050 | Images/dynamic imports/bundle/motion | Partial | Responsive Cloudinary transforms, route-local charts/editors, restrained motion | 12 | Lighthouse/bundle/image audit |
| UI-051 | N+1/index/dashboard aggregation | Risk not fully measured | Bounded aggregate queries and plan verification | 5,10,12 | Query count/EXPLAIN evidence |
| UI-052 | Metadata ownership | Root metadata only/incomplete | Feature/route-owned title, description, canonical, social data | 12 | Route HTML audit |

## Testing, CI, deployment, observability, and recovery

| Requirement ID | Requirement | Current | Target/decision | Phase | Verification |
|---|---|---|---|---|---|
| OPS-001 | Backend unit tests | Zero | Policies/mapping/validation/rating/return-path suite | 1–5 | Required CI results |
| OPS-002 | Backend integration tests | Zero | Auth/media/reviews/watch/admin/contact/payment/upload matrix | 1–10 | Disposable-DB CI results |
| OPS-003 | Frontend component tests | Zero | Forms/cards/states/theme/nav/dialog/chart tests | 1,6–11 | Required CI results |
| OPS-004 | End-to-end tests | Zero | Guest/member/payment-mock/admin/contact/responsive journeys | 1–11 | Playwright artifacts |
| OPS-005 | Non-functional tests | Missing | Accessibility, responsive, smoke, API, migration checks | 11–15 | Gate/release evidence |
| OPS-006 | CI pipeline | Missing | Minimal ordered quality gates (ADR-017) | 1 | Green pull-request workflow |
| OPS-007 | Backend lint configuration | Broken | Repair/configure then zero-new-warning ratchet | 1 | Lint gate |
| OPS-008 | Immutable install/format/lint/typecheck | No pipeline | Required gates both packages | 1 | CI job evidence |
| OPS-009 | Prisma validate/migration validation | Manual | Empty/upgrade DB validation in CI | 1,5 | CI database job |
| OPS-010 | Frontend/backend production builds | Manual | Both required before deploy | 1 | CI build artifacts |
| OPS-011 | Dependency review/secret scan | Missing | PR/release gates with triage policy | 1 | Scanner reports |
| OPS-012 | Vercel frontend/Render backend | Current split | Preserve deployment split | 14 | Platform configuration/deployed URLs |
| OPS-013 | Production API URL/no localhost fallback | Fallback exists | Production build fails without HTTPS Render `/api` | 14 | Built-config/smoke test |
| OPS-014 | Automatic Prisma migration execution | Missing | Single pre-deploy `migrate deploy` actor | 14 | Deploy log/migration table |
| OPS-015 | Deployment order | Informal | Expand migrate, backend, verify, frontend, backfill/activate | 14 | Release checklist |
| OPS-016 | Health/database readiness | Health lacks readiness | Liveness separate from bounded DB readiness | 13 | DB-down probe test |
| OPS-017 | Graceful shutdown | Incomplete | Unready, drain, stop jobs, disconnect, deadline | 13 | SIGTERM integration/staging drill |
| OPS-018 | Structured logging/levels/request IDs | Partial | JSON/redacted/correlated logs and release ID | 13 | Captured-log and deployed inspection |
| OPS-019 | Error monitoring | Missing/incomplete | Front/back error reporting with privacy controls | 13 | Synthetic error correlation |
| OPS-020 | Stripe/upload/reconciliation alerts | Missing | Named bounded metrics and actionable runbooks | 13 | Alert exercise |
| OPS-021 | Rollback runbook | Missing | Code/data-compatible triggers, owners, commands, verification | 14 | Staging rollback drill |
| OPS-022 | Database backups/restore | Not verified | Plan confirmation, restore point and isolated restore drill | 14 | Restore evidence/RPO-RTO record |
| OPS-023 | Production smoke workflow | Missing | Public/member/admin-safe post-deploy smoke | 14 | Release artifact |
| OPS-024 | Preview CORS strategy | Not formalized | Explicit preview origin policy, no wildcard credentials | 14 | Preview browser/API test |
| OPS-025 | Cloudinary/email/Stripe production checks | Partial providers; email absent | Bounded provider-adapter smoke with test/safe operations | 14 | Release checklist evidence |
| OPS-026 | Final compliance audit | Discovery only | Independent traceability, content, security, runtime evidence review | 15 | Document 30 plus independent sign-off |

## Product decisions that keep rows open

The traceability matrix cannot close the following until a human owner records the choice: past-due grace duration; refund/dispute entitlement policy; session/access/reset lifetimes; session eviction UX; allowed Vercel preview origins; contact/finance/audit/view-fingerprint retention; exact email provider and sender domain; content ownership and initial copy; cast/director/gallery scope; admin suspension/deletion policy; chart reporting timezone and supported currencies; backup plan/RPO/RTO.

## Traceability maintenance rule

Each implementation pull request names its requirement IDs and backlog IDs, changes their evidence link/status, and adds tests before marking them satisfied. If scope changes, update this matrix and the controlling ADR first. Phase 15 checks every row individually; “covered by redesign” is not acceptable evidence.

