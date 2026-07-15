# 19. Target API Contracts

## Contract policy

The first-party API retains `/api` as its stable base. A bulk `/v1` rename would create assignment risk without a second independently released consumer. Introduce a new major path only when an externally supported contract requires parallel breaking behavior. Additive fields remain backward-compatible; field removal, meaning changes, or incompatible validation require a deprecation window.

Zod schemas define request path, query, headers, and body DTOs. Explicit response DTOs prevent Prisma records, secrets, provider metadata, and internal moderation fields from leaking. These schemas generate an OpenAPI 3.1 document checked in CI for breaking changes.

## Standard response and error shapes

```json
{
  "success": true,
  "data": { "id": "resource-id" },
  "requestId": "req_..."
}
```

```json
{
  "success": true,
  "data": {
    "items": [],
    "pageInfo": { "page": 1, "limit": 20, "total": 0, "hasNextPage": false }
  },
  "requestId": "req_..."
}
```

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request could not be validated.",
    "details": [{ "path": "email", "code": "invalid_format" }]
  },
  "requestId": "req_..."
}
```

Validation failures use 400, authentication 401, policy/ownership failure 403, absence 404, state/idempotency conflict 409, rate limiting 429, and unexpected faults 500. Production messages never expose stacks, SQL, provider payloads, tokens, or internal identifiers not present in the DTO.

## Cross-cutting request rules

- UUID path parameters use a shared schema; invalid IDs fail before Prisma.
- Collection limits default to 20 and cap at 50. Sort fields and directions are allowlisted.
- Text search is trimmed, length-limited, and consistently escaped. Filters are typed and unknown keys rejected.
- Cookie-authenticated state-changing requests carry an allowed `Origin` and double-submit CSRF token. Bearer-only calls still require exact CORS origin policy.
- POST operations with financial or retry ambiguity accept `Idempotency-Key`; the server scopes it to user, operation, and normalized request hash.
- Mutation responses return the authoritative resource state. `204` is reserved for successful operations with intentionally no body.
- Public caches vary only on safe query inputs; personalized responses are `private, no-store`.

## Verified current endpoint disposition

The source currently exposes **42 endpoints**: 41 route declarations plus the inline application health route. `Change` preserves the path unless the row says otherwise. The table deliberately records all current endpoints.

| # | Method and path | Owner | Disposition | Target contract note |
|---:|---|---|---|---|
| 1 | `POST /api/auth/register` | Auth | Keep | Strict body DTO; generic conflict response; returns safe user/session DTO. |
| 2 | `POST /api/auth/login` | Auth | Keep | Rate-limited; rotates a server session and returns access capability plus CSRF token. |
| 3 | `POST /api/auth/logout` | Auth | Change | Revokes current family, clears refresh/CSRF cookies, idempotent success. |
| 4 | `POST /api/auth/refresh-token` | Auth | Change | Atomic rotation and reuse detection; no user-only authenticated state. |
| 5 | `GET /api/auth/me` | Auth | Keep | Bearer-protected safe user DTO; `private, no-store`. |
| 6 | `POST /api/auth/forgot-password` | Auth | Change | Generic 202-style body regardless of account existence; real email adapter; no token response/log. |
| 7 | `POST /api/auth/reset-password` | Auth | Change | Hash lookup, single use, expiry, password policy, session invalidation. |
| 8 | `GET /api/media` | Media | Change | Typed filters/search, page 1/limit 20/max 50, stable sort and public DTO. |
| 9 | `GET /api/media/:id` | Media | Change | UUID validation; public detail plus derived entitlement flags, never premium URL when unauthorized. |
| 10 | `GET /api/media/genres` | Genres | Keep | Cacheable public genre DTO. |
| 11 | `GET /api/media/:id/stream` | Media | Change | Authentication plus entitlement policy; short-lived/controlled stream response. |
| 12 | `POST /api/media/:id/view` | Analytics | Change | Bounded idempotent daily dedup; `202`/success does not disclose viewer key. |
| 13 | `POST /api/media` | Admin media | Change | Admin capability; multipart DTO and upload ownership; draft/publish state explicit. |
| 14 | `PUT /api/media/:id` | Admin media | Change | UUID, optimistic `updatedAt`/version conflict, field-level DTO. |
| 15 | `DELETE /api/media/:id` | Admin media | Change | Archive/soft-delete default; explicit conflict when dependencies prevent action. |
| 16 | `GET /api/reviews/media/:mediaId` | Reviews | Keep | Approved public reviews only; limit capped at 50; stable pagination. |
| 17 | `GET /api/reviews/pending` | Reviews | Deprecate | Replace with `GET /api/admin/reviews?status=PENDING`; temporary compatibility alias. |
| 18 | `GET /api/reviews/:id` | Reviews | Keep | Public approved review or owner/admin visibility by policy. |
| 19 | `GET /api/reviews/:reviewId/comments` | Comments | Keep | Approved-visible parent policy and bounded pagination. |
| 20 | `POST /api/reviews` | Reviews | Keep | Authenticated, one-per-user/media invariant, pending state response. |
| 21 | `PUT /api/reviews/:id` | Reviews | Keep | Owner policy; meaningful edits return to pending moderation. |
| 22 | `DELETE /api/reviews/:id` | Reviews | Keep | Owner/admin policy and transactional rating recomputation if previously approved. |
| 23 | `POST /api/reviews/:reviewId/comments` | Comments | Keep | Authenticated, validated content, visible-parent policy. |
| 24 | `PUT /api/reviews/comments/:id` | Comments | Keep | Owner policy; updated comment DTO. |
| 25 | `DELETE /api/reviews/comments/:id` | Comments | Keep | Owner/admin policy; idempotent absence behavior documented. |
| 26 | `PUT /api/reviews/:id/approve` | Admin reviews | Change | Admin capability; expected current state; audit action and rating update transaction. |
| 27 | `PUT /api/reviews/:id/reject` | Admin reviews | Change | Admin capability; required bounded reason; append-only audit. |
| 28 | `GET /api/reviews/user/me` | Reviews | Keep | Authenticated own-review pagination and moderation state. |
| 29 | `GET /api/watchlist` | Watchlists | Keep | Authenticated collection with media summary DTO. |
| 30 | `POST /api/watchlist/:mediaId` | Watchlists | Change | UUID and existence validation; idempotent add returns authoritative membership. |
| 31 | `DELETE /api/watchlist/:mediaId` | Watchlists | Change | UUID validation; idempotent removal. |
| 32 | `GET /api/profile` | Profiles | Keep | Own profile/dashboard-safe aggregate DTO. |
| 33 | `PUT /api/profile` | Profiles | Keep | Allowlisted editable fields only; email/role/billing fields excluded. |
| 34 | `GET /api/admin/dashboard` | Admin analytics | Change | Capability-protected summary with named metric definitions and time range. |
| 35 | `POST /api/payment/create-checkout-session` | Payments | Change | Auth, plan allowlist, sanitized return path, idempotency, checkout-attempt response. |
| 36 | `GET /api/payment/subscription` | Subscriptions | Change | Derived billing and entitlement DTO, including cancel intent and period end. |
| 37 | `POST /api/payment/cancel-subscription` | Subscriptions | Change | Idempotent cancel-at-period-end; access remains until derived entitlement expires. |
| 38 | `POST /api/upload/image` | Uploads | Change | Auth, signature/dimensions/type/size/folder checks; returns owned asset DTO. |
| 39 | `DELETE /api/upload/:publicId` | Uploads | Deprecate | Replace with resource-specific image deletion; never accept arbitrary raw provider ID. |
| 40 | `POST /api/webhooks/stripe` | Payments | Change | Raw body signature, event ledger, ordering guard, fast 2xx for processed duplicates. |
| 41 | `GET /api/health` | Health | Change | Liveness only; no dependency probes or sensitive metadata. |
| 42 | `GET /api/health/database` | Health | Keep | Existing authenticated/admin diagnostic retained temporarily; public readiness uses the new endpoint below. |

Disposition totals: **18 Keep, 22 Change, 2 Deprecate**.

## Proposed endpoint additions

Exactly **36 additions** are proposed. Along with 22 changes and 2 deprecations above, this yields **60 endpoint-level additions/changes**.

| # | Method and path | Purpose/access | Input, response, pagination, and idempotency |
|---:|---|---|---|
| 1 | `GET /api/auth/sessions` | List own live sessions. | Auth; cursor/limit max 50; safe device/time DTO, never token hashes or raw IP. |
| 2 | `DELETE /api/auth/sessions/:sessionId` | Revoke one owned session. | UUID + ownership; idempotent; current session clears cookies if selected. |
| 3 | `DELETE /api/auth/sessions` | Log out all sessions. | Auth + CSRF; idempotent; revokes all families and clears current cookies. |
| 4 | `PUT /api/auth/password` | Change password while signed in. | Current/new password DTO; rate limit; revokes other sessions; idempotency not applicable. |
| 5 | `PUT /api/profile/image` | Attach an owned profile asset. | Asset ID DTO; ownership/type validation; returns profile. |
| 6 | `DELETE /api/profile/image` | Remove managed profile image. | Auth + CSRF; idempotent; provider delete only by stored public ID. |
| 7 | `GET /api/home` | Assemble home sections efficiently. | Public; locale optional; cacheable bounded section DTO, no free-form query. |
| 8 | `GET /api/media/:id/related` | Related media rail. | UUID; `limit` 1-20; deterministic similarity/fallback; public DTO. |
| 9 | `POST /api/reviews/:id/reports` | Report a review. | Auth; reason enum + bounded detail; unique user/review; duplicate returns 409. |
| 10 | `GET /api/admin/review-reports` | Moderation report queue. | Admin; status/filter/cursor max 50; audit-safe DTO. |
| 11 | `PATCH /api/admin/review-reports/:id` | Resolve/dismiss report. | Admin; expected status + resolution DTO; conflict-safe, audited. |
| 12 | `GET /api/admin/reviews` | Unified moderation queue. | Admin; typed status/media/user/date filters; cursor max 50. |
| 13 | `GET /api/dashboard/overview` | User overview. | Auth; own watchlist/reviews/recent-view aggregates, `private, no-store`. |
| 14 | `GET /api/admin/users` | User administration list. | Admin; search/status/role, cursor max 50, allowlisted sorts. |
| 15 | `GET /api/admin/users/:id` | User administration detail. | Admin + UUID; safe profile/session/subscription summary. |
| 16 | `PATCH /api/admin/users/:id/status` | Suspend/reactivate an account. | Admin; expected state + reason; cannot disable final admin; audited. |
| 17 | `GET /api/admin/subscriptions` | Subscription operations list. | Admin; derived status/date/search; cursor max 50. |
| 18 | `GET /api/admin/subscriptions/:id` | Subscription detail/timeline. | Admin + UUID; provider IDs masked as appropriate; finance audit DTO. |
| 19 | `POST /api/contacts` | Submit public contact request. | Strict body + anti-abuse controls; returns reference/status; retry key accepted. |
| 20 | `GET /api/admin/contacts` | Contact inbox. | Admin; status/category/assignee/cursor max 50. |
| 21 | `GET /api/admin/contacts/:id` | Contact detail. | Admin + UUID; response contains sensitive message and is `no-store`. |
| 22 | `PATCH /api/admin/contacts/:id/status` | Assign/resolve contact. | Admin; state transition, bounded note, optimistic conflict, audited. |
| 23 | `GET /api/content/posts` | Published content listing. | Public; type/tag/page max 30; cacheable summaries. |
| 24 | `GET /api/content/posts/:slug` | Published article/detail. | Slug schema; cacheable public body/SEO DTO. |
| 25 | `GET /api/admin/content/posts` | Editorial list. | Admin; status/type/search/cursor max 50. |
| 26 | `POST /api/admin/content/posts` | Create draft. | Admin; strict content DTO; optional idempotency; returns draft. |
| 27 | `GET /api/admin/content/posts/:id` | Editorial detail. | Admin + UUID; full draft DTO. |
| 28 | `PUT /api/admin/content/posts/:id` | Edit draft/content. | Admin; optimistic version; sanitized supported markup only. |
| 29 | `PATCH /api/admin/content/posts/:id/status` | Publish/archive content. | Admin; transition + expected state; published time server-owned and audited. |
| 30 | `GET /api/admin/analytics` | Chart-ready operational metrics. | Admin; range/granularity allowlists; maximum range; named series DTO. |
| 31 | `GET /api/payment/checkout/:sessionId` | Confirm checkout outcome for UI. | Auth + ownership; safe attempt/subscription state, never trusts redirect parameters. |
| 32 | `POST /api/admin/payments/reconcile` | Start dry-run reconciliation. | Admin; bounded date/object scope + idempotency; returns job/report reference. |
| 33 | `POST /api/admin/payments/repairs/:id/apply` | Apply an approved repair. | Admin; explicit action token, expected state, idempotency, immutable audit. |
| 34 | `GET /api/ready` | Orchestrator readiness. | Public minimal 200/503; bounded DB probe; no secrets/version dump. |
| 35 | `POST /api/payment/resume-subscription` | Remove scheduled cancellation when provider permits. | Auth + CSRF; idempotent provider request; returns derived subscription DTO. |
| 36 | `GET /api/payment/plans` | Serve server-authoritative plan/price choices. | Public cacheable allowlisted DTO; no arbitrary client price IDs. |

## Pagination, filters, and search

Page-number pagination remains acceptable for stable public browse and simple user lists. Cursor pagination is used for operational queues whose rows change frequently. Every collection returns its effective filters and page metadata only when that aids UI state; it never echoes untrusted strings into HTML. Database queries add a deterministic ID tie-breaker to all user-selected sorts.

Representative media query:

```text
GET /api/media?query=arrival&genre=Sci-Fi&type=MOVIE&pricing=PREMIUM&yearFrom=2000&yearTo=2026&sort=rating_desc&page=1&limit=20
```

Unknown sort/filter values are rejected rather than interpolated. Expensive cross-field combinations receive a bounded date/rating range and query-plan verification before launch.

## Idempotency semantics

The client key is opaque and at most 128 characters. The server stores a hash of `{principal, operation, normalized request, key}`, processing state, response status, and response body for the retention window. Reuse with a different payload returns 409. Concurrent duplicates wait briefly or receive a retryable conflict; they never execute the provider call twice. Stripe calls also receive stable provider idempotency keys derived from the server operation.

Webhook idempotency is separate: Stripe's signed event ID is the ledger identity, while invoice/refund IDs are domain uniqueness identities. This protects against both duplicate event delivery and distinct events describing the same financial object.

## Compatibility and deprecation

- Publish an OpenAPI diff in CI and label each change additive, behavioral, or breaking.
- Return `Deprecation` and `Sunset` headers on the two compatibility routes after replacements ship.
- Observe replacement usage before removal; retain at least one frontend release of overlap.
- Never silently change entitlement meaning, money units, review visibility, or pagination order.
- Client adapters isolate temporary old/new response compatibility; pages do not branch on raw transport shapes.

