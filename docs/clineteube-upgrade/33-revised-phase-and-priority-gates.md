# CineTube Revised Phase and Priority Gates

## 1. Corrected Severity Register

Severity counts use one independently testable current release outcome per row. Architecture-document corrections are tracked separately in document 32.

### P0 — 5

| ID | Confirmed current release blocker | Evidence | Correct treatment / phase |
|---|---|---|---|
| P0-R01 | Reset secret is plaintext in PostgreSQL and logged with email | `PasswordResetToken`; `auth.service.ts#requestPasswordReset` | Phase 0 stops disclosure/issuance without delivery; Phase 3 hash migration and real delivery. |
| P0-R02 | Production password recovery has no real delivery and is unusable without log access | Auth service/controller and forgot page | Honest recovery-only unavailable state in Phase 0; enable only after provider evidence in Phase 3. |
| P0-R03 | Initial subscription payment can be recorded twice and revenue double-counted | Checkout and `invoice.paid` branches create different `Transaction` IDs | Phase 4A invoice-only ledger, historical exception report, no automatic deletion. |
| P0-R04 | Stripe delivery has no durable event identity/order-safe recovery and can regress projection | Webhook controller/payment service; no ledger model | Phase 4A durable inbox/object uniqueness; Phase 4B current-object state projection. |
| P0-R05 | Scheduling cancellation writes CANCELED and immediately removes paid access | Cancel service + ACTIVE-only media checks | Phase 4B cancel-intent fields and derived paid-period entitlement. |

### P1 — 22

| ID | Mandatory current-release issue | Correct phase |
|---|---|---:|
| P1-R01 | Login redirect accepts an untrusted query value | 3 |
| P1-R02 | Cross-site refresh/logout/cookie mutations lack a complete Origin + CSRF contract | 3 |
| P1-R03 | Refresh rotation is non-atomic and has no safe reuse/concurrent-tab model | 3 |
| P1-R04 | Logout/user change does not clear private TanStack Query data | 3 |
| P1-R05 | Checkout stores the access token in `sessionStorage` | 3/4 |
| P1-R06 | No automated unit/integration/component/E2E safety net exists | 1 onward |
| P1-R07 | No CI exists and backend lint tooling is incomplete | 1 |
| P1-R08 | Production migrations, deploy compatibility, rollback and restore are manual/unverified | 1/14 |
| P1-R09 | Readiness, graceful drain and exact proxy behavior are incomplete | 13 |
| P1-R10 | Light/system themes are missing | 6 |
| P1-R11 | Mandatory public/contact/blog/help/legal content and truthful links/copy are missing or invented | 7 |
| P1-R12 | User dashboard, password update and owned profile image workflow are missing | 9 |
| P1-R13 | Mandatory admin navigation and operational areas are incomplete | 10 |
| P1-R14 | Defined real-data admin metrics and three meaningful accessible chart types are missing | 10 |
| P1-R15 | Dialog/form/focus/motion/semantic accessibility gaps remain | 6/11 |
| P1-R16 | Loading/skeleton/fetch-error/empty/denied/conflict states are incomplete | 6–10 |
| P1-R17 | Upload signature, decoded dimensions, memory/concurrency, ownership and deletion safety are incomplete | 9/10 |
| P1-R18 | Path/body validation, explicit DTOs, request IDs and API documentation are incomplete | 2 onward |
| P1-R19 | Refund accounting and bounded reconciliation are absent | 4C/13 |
| P1-R20 | Production API URL, environment, CORS/cookies/preview policy and provider configuration are not release-safe | 3/14 |
| P1-R21 | Approved-review edit and rating recomputation are not one transaction | Review integrity phase |
| P1-R22 | Checkout redirect flags can show payment-success copy without owned server confirmation | 4B |

Session metadata, a five-session cap, view dedup, Server Component conversions, optional related media, and richer observability remain P2/product-dependent unless the assignment owner explicitly makes them mandatory. The P0 count is unchanged at 5; the corrected P1 count is **22**.

## 2. Phase Entry Gates

| Phase | Entry Conditions | Exit Conditions | Blocking Decisions | Blocking Tests | Review Required |
|---:|---|---|---|---|---|
| 0 | Documents 31–34 and ACR-001/003/010/036 accepted; clean source baseline; owner chooses recovery-only outage behavior | Six narrow criteria in §3; no payment/schema/config/dependency work | PD-09 | Captured known/unknown response and log scan using existing means | Security + product + release owner |
| 1 | Phase 0 containment deployed/verified or safe local patch accepted; tooling versions approved | 1A lint/unit, 1B disposable DB, 1C frontend/E2E smoke, 1D minimal CI independently green | CI cost/tool choices | Harness self-tests, migration apply to disposable DB, clean-checkout CI | Engineering lead + security fixture review |
| 2 | Relevant Phase 1 harness/gates green; ACR-001/002 accepted | Actual 42-route baseline generated; common error/request ID/validation/policy/DTO pattern; high-risk routes migrated; remaining route plan explicit | Envelope/deprecation ownership | Contract negatives and OpenAPI generation for migrated routes | API/security reviewer |
| 3 | Phase 2 auth contracts; ACR-006/008/009/010/020 resolved; email sandbox available | Core family rotation/reuse, CSRF, redirect, reset, revocation and cache/storage invariants green; optional session UI separately gated | PD-06/07/08/09/14; PD-12 only if suspension included | Winner/loser rotation, cookie ordering, CSRF/origin, reset/mail, cross-user cache | Highest security review |
| 4A | Phase 1 DB/HTTP harness; corrected provider fixtures RV-01; API baseline fixed | Durable event inbox; invoice-only transaction; duplicate/crash/backfill exception tests; no checkout revenue | PD-04/05 for reporting only | Duplicate/same-object/crash/ambiguous history | Billing + finance + DBA-like review |
| 4B | 4A stable; subscription/checkout schema approved; ACR-012/019/037 resolved | Owned checkout outcome/return, authoritative projection, cancel/resume, entitlement matrix; no token stash/query success trust | PD-01/06/17/20 | Provider-state/order, cancel clock, forged callback, active checkout concurrency | Billing/security/product |
| 4C | 4A/4B stable; ACR-013/014/015/017/018 resolved | Typed adjustments; bounded stored dry-run reconciliation; internal approved repair command only; net totals by currency | PD-02/03/04/05 | Refund/dispute/reconcile/CAS/audit fixtures | Highest finance/security review |
| 5 | Only dual-written Phase 3/4 data exists; retention approvals for included rows; backup checkpoint | Included auth/billing/review backfills verified and constrained; feature tables not pre-created; old app reads expanded schema | PD-10/13/21 as applicable | Empty/upgrade/repeat/old-reader/lock/invariant tests | DBA-like + domain owner |
| 6 | Frontend component harness; design direction approved | Tokens/themes/primitives/state grammar work on existing routes without hydration/a11y regression | Brand/content copy only | Theme first-paint, keyboard, contrast, reduced motion | Design + accessibility |
| 7 | Phase 2 patterns + Phase 6; Contact/Content migrations designed in this phase | Approved truthful routes/content; contact persists once; blog draft isolation/admin workflow; no duplicate FAQ/CMS | PD-10/11/20/22 | Link/content, spam/rate, provider failure, XSS/draft isolation | Product/content/privacy |
| 8 | Phase 2/6; media DTO/content inventory; optional DB-16/18 separately approved | Core browse/detail URL/state/query/stream contract green; optional lifecycle/view features independently proven | PD-18; PD-10 for view HMAC | Filter/ordering/query-count/network entitlement/mobile tests | Product/design/security |
| 9 | Auth/billing stable; Phase 6; profile image contract corrected | Dashboard/profile/password/image/session consumers ownership-safe and cache-isolated; no undefined activity metric | PD-07/10/19 | Private DTO, upload failure, password/session, responsive E2E | Product/privacy/security |
| 10 | Required feature models/APIs stable; ACR-013/014/020/021/031 resolved | Seven real admin areas; read metrics/charts defined; mutations policy/audit-backed; unsafe repair/suspension absent unless approved | PD-04/05/12/19/22 | Role denial, aggregates, currency, audit/CAS, chart a11y/perf | Highest finance/security + product |
| 11 | Phases 6–10 complete for in-scope routes | Runtime keyboard/axe/screen-reader/zoom/viewport/contrast/touch matrix accepted | Accepted exceptions only | RV-17/RV-18 | Accessibility + design |
| 12 | Stable pages and production-like build | Measured bundle/query/image/CWV/metadata improvements, no private caching | Telemetry consent/budgets | Lighthouse/bundle/query/metadata/cache | Performance/SEO/privacy |
| 13 | Auth/payment/job behaviors stable; monitoring platform and retention approved | Ready/health/drain/proxy/jobs/log redaction/alerts/runbooks exercised | PD-10/14; monitor retention | RV-05/08/20/24 | Operations + security |
| 14 | All mandatory phases green; one actor/plan/origins/secrets/backups selected | Migration, backend-ready-first/frontend promotion, providers, rollback/restore and smoke evidence tied to SHA | PD-14/15/16 plus any open mandatory decision | RV-06/07/09–16/21–24 | Release owner + DBA/security/product |
| 15 | Production observation window; reconciliation clean/accepted exceptions | Every atomic requirement has evidence or accepted exception; no P0/P1; independent sign-off | Exception owners | Full gates + runtime audit + reconciliation | Independent architect and relevant owners |

The original phase labels 0–15 remain for traceability. Phase 4 is explicitly subdivided into 4A/4B/4C; this does not add a new headline phase count.

## 3. Phase Exit Gates

Every phase must satisfy scope, tests, rollback, security/privacy, compatibility and independent review proportional to risk. Additional corrected gates are:

- **Phase 0 exact exit:** (1) no reset/access/refresh/password appears in recovery logs or response; (2) known and unknown addresses have identical public status/shape/message when delivery is unavailable; (3) production without mail creates no reset token; (4) UI says temporarily unavailable rather than “check inbox”; (5) legacy redemption is disabled or its maximum expiry window is recorded; (6) no payment, subscription, schema, migration, dependency, config or deployment change exists.
- **Phase 1:** each subgate can land independently, but auth/payment phases require the DB/HTTP/concurrency subset relevant to them. OpenAPI diff is not required until an artifact exists.
- **Phase 2:** the source-accurate 42-route compatibility map is an artifact. Endpoint-by-endpoint migration can continue in owning phases; a mass rewrite is not an exit condition.
- **Phase 3:** benign refresh race never revokes family or clears a newer cookie; true replay does. Access token appears in no browser storage.
- **Phase 4:** 4A protects finance before 4B changes entitlement; 4C cannot introduce public repair endpoints. Provider calls are outside DB transactions.
- **Phase 5:** “18 changes complete” is prohibited as an exit metric. Only accepted, feature-owned migrations with evidence count.
- **Phases 7–10:** new schema is created in the owning phase; audit claims require durable storage, not console logs.
- **Phase 14:** Render health path is readiness, migration actor is singular, Prisma drift/lock limits are accounted for, and application rollback is proven over expanded schema.
- **Phase 15:** document 30 is not independent evidence; documents 31–34 are planning evidence only, not implementation proof.

## 4. Product-Decision Deadlines

| Decision | Latest resolution point | If unresolved |
|---|---|---|
| PD-09 recovery outage | Before Phase 0 | Phase 0 cannot start. |
| PD-06 lifetimes; PD-08 mail; PD-14 preview origin | Phase 3 entry | Secure auth/recovery activation blocked. |
| PD-07 session cap | Before optional session UI/constraint | Core auth may proceed without cap. |
| PD-01 grace; PD-17 admin entitlement; PD-20 plans | Phase 4B entry | Entitlement/checkout UI blocked. |
| PD-02 refund; PD-03 dispute; PD-04 finance semantic; PD-05 timezone/currency | Phase 4C entry | Adjustment/revenue/admin finance blocked. |
| PD-10 retention | Before each affected table/constraint | That migration is blocked; unrelated code may proceed. |
| PD-13 account deletion | Before DB-13 | Hard delete/FK change blocked; soft delete remains. |
| PD-21 review edit visibility | Review-integrity entry | Review edit migration blocked. |
| PD-11 editorial ownership; PD-22 contact workflow | Phase 7 entry | Public content/contact workflow blocked. |
| PD-18 media lifecycle | Before DB-16/admin lifecycle | Core browse may proceed; lifecycle work blocked. |
| PD-19 active/recent metric | Phase 9/10 entry | Do not add DB-17 or label users active. |
| PD-12 suspension/final admin | Before admin status work | Read-only user admin can proceed; status mutation blocked. |
| PD-15 RPO; PD-16 RTO | Phase 14 entry | Production release blocked. |

## 5. Runtime-Verification Deadlines

| Runtime checks | Required by | Blocking scope |
|---|---:|---|
| RV-01 provider version/fixtures | Phase 4 entry | Stripe implementation |
| RV-02 duplicate/order; RV-03 lifecycle | Phase 4 exit | Payment activation |
| RV-04 historical reconciliation | Before DB-05 unique constraint | Financial migration |
| RV-05 Render proxy | Phase 13 exit | Production rate/IP/security behavior |
| RV-06 pre-deploy plan; RV-07 overlap | Phase 14 entry | Production migration |
| RV-08 SIGTERM | Phase 13 exit | Production backend |
| RV-09 cookie; RV-10 CORS; RV-11 CSRF | Phase 3 staging, Phase 14 production | Cross-origin auth |
| RV-12 migration history; RV-13 plans/locks | Each migration / Phase 14 | Constraint and production deploy |
| RV-14 backup/restore | Phase 14 | Production release |
| RV-15 email | Phase 3 enablement/14 | Recovery availability |
| RV-16 Cloudinary | Profile/media upload release | Upload mutations |
| RV-17 responsive; RV-18 accessibility | Phase 11 | Mandatory frontend release |
| RV-19 CI isolation/time | Phase 1 | Risky implementation phases |
| RV-20 alerts; RV-24 probes | Phase 13 | Production release |
| RV-21 rollback | Phase 14 | Production release |
| RV-22 reconciliation | 4C/14 | Payment activation/release |
| RV-23 smoke | Phase 14 | Production promotion |

## 6. Migration Safety Gates

No migration may be authored from the “18 changes” count alone. For each accepted change:

1. Name the owning feature, current invariant, target invariant and product/retention approval.
2. Record production-shaped row counts, FK/unique duplicates and expected lock behavior.
3. Expand with nullable/additive schema; hand-review PostgreSQL SQL, especially enum, FK, unique, amount-type and index operations.
4. Prove the running old application tolerates the expansion.
5. Deploy dual-reader/writer before backfill when representation changes.
6. Backfill in resumable primary-key/provider-identity batches; ambiguous finance rows remain exceptions.
7. Run invariant/reconciliation queries twice; compare counts and samples.
8. Add constraints only after clean evidence and a backup/restore checkpoint.
9. Observe one release before contracting; rollback means compatible old code over expanded schema.
10. Select one migration actor. `migrate deploy` advisory locking is a safeguard, not permission for overlapping release actors; drift is checked separately.

DB-02/03/05/07 are mandatory before their release-critical cutovers. DB-08/09/10/11/12/16/18 move to owning feature phases. DB-13 is blocked. DB-14/15 fold into owners. DB-17 is optional.

## 7. Payment Safety Gates

- Checkout session is intent; it creates no `Transaction` and grants no access.
- Invoice ID is unique subscription-invoice ledger identity; Invoice Payment/PaymentIntent remain secondary references.
- Zero/no-charge invoices have explicit non-revenue behavior.
- Every signed event is durably received once; every invoice/refund/dispute has independent uniqueness.
- Provider I/O is not held inside the local mutation transaction.
- Subscription state uses authoritative current object and allowed transitions, not event timestamp alone.
- Terminal deletion/cancellation cannot be undone by a stale event.
- Cancel-at-period-end retains access through the authoritative paid/cancel period.
- Refund/dispute decisions are approved before adjustment/entitlement code.
- Historical ambiguity is reported, preserved and excluded from “clean” totals until resolved.
- Reconciliation is bounded, dry-run and stored; repair begins as an internal command with actor/reason/before/after/CAS audit.
- Callback success is an owned server state; query parameters only trigger polling/navigation.

Failure of any gate blocks Phase 4 activation and production release.

## 8. Implementation Start Gate

Implementation is not authorized by the original package alone. It may begin only when:

- the user accepts the independent verdict and the relevant required corrections;
- ACR-001, ACR-003, ACR-010 and ACR-036 are accepted for the first task;
- Phase 0 is scoped exactly to §3 and document 34;
- Git scope contains no source change from this review pass;
- a human security/product reviewer owns recovery-unavailable behavior;
- the implementation task explicitly excludes payment, schema, dependencies, deployment and UI redesign.

After that gate, only corrected Phase 0 is approved. Phase 1 starts after Phase 0 evidence. Phase 2+, payment and database changes remain independently gated.

## 9. Production Release Gate

Production is no-go until all P0/P1 outcomes are evidenced and:

- all 26 Required correction records are incorporated into controlling documents/backlog or explicitly superseded by an approved decision;
- all blocking product decisions and runtime checks are closed;
- every applied migration passes §6 and one actor runs it before compatible backend rollout;
- backend readiness is green before frontend promotion; Vercel uses explicit HTTPS Render `/api` with no localhost fallback;
- exact-origin CORS, secure cookies, CSRF, proxy, shutdown and provider adapters pass deployed checks;
- invoice/refund/subscription reconciliation and review-rating invariants have no unexplained mismatch;
- backup restore and compatible application rollback are demonstrated;
- public/member/admin/provider-safe smoke and alerts are tied to the release SHA;
- an independent reviewer finds no unresolved P0/P1 and every exception has owner, rationale and expiry where applicable.

