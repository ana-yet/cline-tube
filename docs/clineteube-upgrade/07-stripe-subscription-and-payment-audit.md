# CineTube Stripe, Subscription, and Payment Audit

> **Discovery date:** 2026-07-13  
> **Branch:** `main`  
> **Reference docs:** `00-project-baseline.md` through `06-data-model-diagrams.md`

---

## 1. Executive Summary

CineTube uses Stripe Checkout (hosted) for subscription payments. Prices are hardcoded server-side in minor currency units. Checkout sessions are created for authenticated users only, with user identity derived from the JWT token (never from the client body). The webhook handler processes 5 Stripe events and uses Prisma batch transactions to atomically update subscription state and create transaction records. `Transaction.providerTxnId` is UNIQUE, providing database-level idempotency for transaction rows. However, subscription updates in webhook handlers are not individually idempotent — duplicate events can re-run side effects. Cancellation sets `cancel_at_period_end` on Stripe but immediately updates the database status to `CANCELED`, creating a mismatch where the `userHasPremiumAccess` function rejects CANCELED users even though their billing period hasn't ended. No reconciliation, retry, or monitoring infrastructure exists.

---

## 2. Stripe Configuration

| Property | Value | Evidence |
|---|---|---|
| Stripe SDK version | `^22.2.2` | `backend/package.json` |
| Stripe API version | `2026-05-27.dahlia` (explicitly set) | `backend/src/services/payment.service.ts` |
| Secret key env var | `STRIPE_SECRET_KEY` | `backend/src/config/env.ts` |
| Webhook secret env var | `STRIPE_WEBHOOK_SECRET` | `backend/src/config/env.ts` |
| Frontend publishable key | **Not found** — no Stripe.js or Elements | No `NEXT_PUBLIC_STRIPE` env var, no `@stripe/stripe-js` dependency |
| Checkout mode | **Hosted Stripe Checkout** (redirect to Stripe) | `session.url` returned, `window.location.href = url` |
| Price IDs | **None** — inline `price_data` used | `payment.service.ts:createCheckoutSession` |
| Currency | `USD` hardcoded | `price_data.currency: "usd"`, default in schema |
| Plan definitions | Server-side only: `MONTHLY: $9.99/month`, `YEARLY: $99.99/year` | `PLAN_PRICES` constant |
| Amount units | Minor units (cents): 999 = $9.99, 9999 = $99.99 | `PLAN_PRICES` |

### Pricing Duplication Risk
| Location | Monthly | Yearly | Evidence |
|---|---|---|---|
| Backend `PLAN_PRICES` | 999 ($9.99) | 9999 ($99.99) | `payment.service.ts` |
| Frontend pricing page | "$9.99" / "$99.99" | Display only, not sent to API | `pricing/page.tsx` |
| Stripe | Created dynamically via `price_data` | No stored Price IDs | `payment.service.ts` |

**Risk:** Frontend and backend pricing must be updated independently. A mismatch would show one price but charge another.

---

## 3. Checkout Request Flow

### Frontend
1. User clicks plan button on `/pricing` page
2. `handleCheckout("MONTHLY"|"YEARLY")` called
3. Checks `isAuthenticated` — redirects to `/register` if not
4. Calls `startStripeCheckout(plan, returnPath)` in `frontend/src/lib/checkout.ts`
5. Stashes access token in `sessionStorage` via `stashAccessTokenBeforeCheckout`
6. `POST /api/payments/checkout` with `{ plan, returnPath }`
7. Receives `{ url }` from API
8. Redirects browser to Stripe Checkout URL

### Backend
1. `authenticate` middleware verifies JWT
2. `payment.controller.ts:checkout` — manual validation: `plan` must be `"MONTHLY"` or `"YEARLY"`
3. `returnPath` checked with `typeof === "string"`, passed to service
4. `payment.service.ts:createCheckoutSession(userId, email, plan, returnPath)`
5. `sanitizeReturnPath(returnPath)` — whitelist-based sanitization
6. `getOrCreateStripeCustomer(userId, email)` — reuses or creates Stripe customer
7. `prisma.subscription.upsert` — ensures Subscription row exists
8. `stripe.checkout.sessions.create(...)` — creates hosted Checkout Session
9. Returns `{ sessionId, url }` to frontend

### Input Protection Classification: **Partial**
- Plan validated manually (not Zod) — ✅ Strong
- `userId` from JWT, not client — ✅ Strong
- `email` from JWT, not client — ✅ Strong
- Amount/price not from client — ✅ Strong (server-side `PLAN_PRICES`)
- `returnPath` sanitized via whitelist — ✅ Strong
- No Zod validation on route — ⚠️ Partial
- No check for existing active subscription — ⚠️ Partial

---

## 4. Customer Creation and Reuse

### `getOrCreateStripeCustomer(userId, email)`

| Property | Value | Evidence |
|---|---|---|
| Lookup | `prisma.subscription.findUnique({ where: { userId }, select: { stripeCustomerId } })` | `payment.service.ts` |
| Reuse | Returns existing `stripeCustomerId` if found | Same function |
| Creation | `stripe.customers.create({ email, metadata: { userId } })` | Same function |
| Storage | `Subscription.stripeCustomerId` (UNIQUE) | Prisma schema |
| Customer metadata | `{ userId }` — CineTube user ID | Same function |

### Partial-Failure Scenarios
| Scenario | Behavior | Evidence |
|---|---|---|
| Customer created in Stripe but DB upsert fails | Customer exists in Stripe but not linked. Next attempt creates another customer. | No Stripe customer lookup by email |
| DB upsert succeeds but Checkout Session creation fails | Customer linked but no session. User can retry. Safe. | — |
| Stored customer ID deleted in Stripe | Next checkout creates a new Stripe customer. Old ID remains in DB. `stripeCustomerId` is NOT updated. | `getOrCreateStripeCustomer` only creates, never updates |

### Duplicate Customer Risk: **Yes**
If `stripeCustomerId` is null in the Subscription row (e.g., first checkout attempt failed after customer creation but before upsert), `getOrCreateStripeCustomer` will create a new Stripe customer because the DB lookup returns null. The UNIQUE constraint on `stripeCustomerId` prevents storing two, but a Stripe-side duplicate can exist.

---

## 5. Checkout Session Construction

| Property | Value | Evidence |
|---|---|---|
| Mode | `"subscription"` | `payment.service.ts:createCheckoutSession` |
| Payment methods | `["card"]` | Same |
| Line items | Inline `price_data` (no Price ID) | Same |
| Quantity | 1 | Same |
| Customer | Stripe customer ID from `getOrCreateStripeCustomer` | Same |
| Customer email | Not set on session (already on customer) | — |
| Client reference ID | **Not set** | No `client_reference_id` in session create |
| Session metadata | `{ userId, plan }` | Same |
| Subscription metadata | `{ userId, plan }` | Same (`subscription_data.metadata`) |
| Success URL | `buildCheckoutRedirectUrl(returnPath, "success")` | Same |
| Cancel URL | `buildCheckoutRedirectUrl(returnPath, "canceled")` | Same |
| Promotion codes | Not configured | — |
| Tax behavior | Not configured | — |
| Billing address | Not configured | — |
| Automatic tax | Not configured | — |
| Trial handling | Not configured | — |
| Locale | Not configured | — |
| Duplicate subscription prevention | **None** — no check for existing active subscription | — |

### Webhook Mapping Reliability
- `checkout.session.completed`: Maps via `session.metadata.userId` and `session.metadata.plan` ✅
- `session.subscription` retrieves Stripe subscription for period dates ✅
- `session.payment_intent` or `session.id` used as transaction ID ⚠️

---

## 6. Webhook Transport and Signature Verification

| Property | Value | Evidence |
|---|---|---|
| Route path | `POST /api/webhooks/stripe` | `backend/src/routes/webhook.routes.ts` |
| Raw body parser | `express.raw({ type: "application/json" })` | Same — applied to webhook route only |
| JSON parser ordering | Webhook mounted BEFORE `express.json()` | `backend/src/app.ts` line ~25 |
| Content-Type | `application/json` (raw parser) | `webhook.routes.ts` |
| Signature header | `stripe-signature` | `stripe-webhook.controller.ts` |
| Webhook secret source | `env.STRIPE_WEBHOOK_SECRET` | `payment.service.ts:constructWebhookEvent` |
| Verification function | `stripe.webhooks.constructEvent(payload, signature, secret)` | Same |
| Missing signature | 400 `MISSING_SIGNATURE` | `stripe-webhook.controller.ts` |
| Invalid signature | Throws in `constructEvent`, caught → 400 `WEBHOOK_ERROR` | Same |
| Unknown event | Falls through `switch` silently, returns 200 `{ received: true }` | `payment.service.ts:handleWebhookEvent` |
| Successful event | 200 `{ received: true }` | `stripe-webhook.controller.ts` |
| Error response | 400 `WEBHOOK_ERROR` with message | Same |
| Body mutation | **None** — raw body passed directly to `constructEvent` | Confirmed |
| Processing model | **Synchronous** — handler awaits all DB operations before returning 2xx | Same |

### Logging
- `console.log("Webhook Event:", event.type)` — event type logged
- `console.log("Subscription activated", { userId, plan, subscriptionId })` — success logged
- No request ID in webhook logs
- No Stripe event ID logged
- No raw payloads logged

---

## 7. Webhook Event Inventory

### Handled Events (5)

| Event | Handler | Subscription Write | Transaction Write | DB Transaction | Idempotency | Failure Response |
|---|---|---|---|---|---|---|
| `checkout.session.completed` | `handleWebhookEvent` | ✅ `subscription.update` (tier, status, stripeSubscriptionId, period) | ✅ `transaction.create` | ✅ Batch `$transaction` | Transaction row only (providerTxnId UNIQUE) | 400 (caught by outer try/catch) |
| `invoice.paid` | `handleWebhookEvent` | ✅ `subscription.update` (status, period) | ✅ `transaction.create` | ✅ Batch `$transaction` | Transaction row only | 400 |
| `invoice.payment_failed` | `handleWebhookEvent` | ✅ `subscription.update` (status: PAST_DUE) | ❌ None | ❌ No `$transaction` | None — repeatable | 400 |
| `customer.subscription.updated` | `handleWebhookEvent` | ✅ `subscription.update` (status, period) | ❌ None | ❌ No `$transaction` | None — repeatable | 400 |
| `customer.subscription.deleted` | `handleWebhookEvent` | ✅ `subscription.update` (tier: FREE, status: ACTIVE, stripeSubscriptionId: null) | ❌ None | ❌ No `$transaction` | None — repeatable | 400 |

### Unhandled Events (Relevant to CineTube)

| Event | Relevance | Impact |
|---|---|---|
| `checkout.session.expired` | Low — abandoned sessions don't create subscriptions | No DB state to clean up |
| `invoice.payment_action_required` | Medium — 3D Secure or similar | User stuck; no notification |
| `charge.refunded` | Medium — refunds not tracked | Revenue overcounted |
| `charge.dispute.created` | Medium — chargebacks not handled | No dispute management |
| `customer.subscription.paused` | Low — not used in current Stripe config | — |
| `customer.subscription.resumed` | Low — same | — |

---

## 8. Event Identity and Idempotency

### Transaction-Identity Matrix

| Event | Stored `providerTxnId` | Unique | Duplicate Safe | Double-Count Risk |
|---|---|---|---|---|
| `checkout.session.completed` | `session.payment_intent \|\| session.id` | ✅ UNIQUE constraint | ✅ DB rejects duplicate | Low — first succeeds, second fails with unique violation |
| `invoice.paid` | `invoice.id` | ✅ UNIQUE constraint | ✅ DB rejects duplicate | Low — same |

### Key Findings

1. **Different identifiers for same initial payment:** `checkout.session.completed` uses `payment_intent || session.id`. `invoice.paid` uses `invoice.id`. These are different Stripe objects. **One initial payment creates TWO Transaction rows** — one from checkout completion, one from invoice.paid.

2. **Event IDs not stored:** Stripe `event.id` is never persisted. No processed-events table exists.

3. **No application-level idempotency:** The `checkout.session.completed` handler runs all side effects (subscription update + transaction create) on every delivery. The UNIQUE constraint on `providerTxnId` prevents duplicate transaction rows but does NOT prevent duplicate subscription updates.

4. **Unique constraint not caught gracefully:** If a duplicate `checkout.session.completed` arrives, the `$transaction` will fail with a Prisma P2002 error. This error propagates to the webhook handler, which returns 400. **Stripe will retry.**

5. **Subscription updates are NOT idempotent:** Each `checkout.session.completed` re-sets `tier`, `status`, `stripeSubscriptionId`, and period dates. Repeated delivery is functionally safe (same values written) but wastes resources and creates error logs.

### Handler Classification

| Handler | Classification | Evidence |
|---|---|---|
| `checkout.session.completed` | **Transaction-row idempotent only** | UNIQUE on providerTxnId; subscription update repeated |
| `invoice.paid` | **Transaction-row idempotent only** | Same pattern |
| `invoice.payment_failed` | **Non-idempotent** (but safe — idempotent write) | `status: "PAST_DUE"` written every time |
| `customer.subscription.updated` | **Non-idempotent** (but safe — idempotent write) | Status/period overwritten |
| `customer.subscription.deleted` | **Non-idempotent** (but safe — idempotent write) | `FREE`/`ACTIVE` written every time |

---

## 9. Out-of-Order Event Analysis

### Initial Subscription
```
checkout.session.completed → invoice.paid → customer.subscription.updated
```

| Scenario | Behavior | Final State |
|---|---|---|
| Normal order | Checkout sets tier+ACTIVE. Invoice sets ACTIVE again. Updated sets ACTIVE again. | ✅ Correct |
| Invoice before checkout | Invoice fails — `subscriptionId` not yet in DB metadata lookup. Subscription lookup by Stripe subscription ID finds userId from metadata. **Works if subscription already exists.** | ⚠️ May work |
| Checkout after invoice | Checkout overwrites invoice's period dates with its own (possibly same). | ✅ Correct |
| Duplicate checkout | Second checkout fails on transaction UNIQUE. Subscription re-updated with same values. | ⚠� Safe but noisy |

### Failed Renewal
```
invoice.payment_failed → customer.subscription.updated
```
Both set `PAST_DUE`. Order doesn't matter. ✅ Safe.

### Cancel at Period End
```
customer.subscription.updated (cancel_at_period_end=true) → customer.subscription.deleted (at period end)
```
- `updated` sets `status: "CANCELED"`
- `deleted` sets `tier: "FREE"`, `status: "ACTIVE"`, clears `stripeSubscriptionId`
- If `deleted` arrives before `updated`: subscription set to FREE. Then `updated` overwrites status to CANCELED. **Drift: CANCELED + paid tier, but Stripe says deleted.**

### Re-subscription After Cancellation
```
customer.subscription.deleted → checkout.session.completed (new)
```
- `deleted` resets to FREE/ACTIVE
- New checkout sets new tier/ACTIVE/new subscriptionId
- ✅ Correct

### Stale Event Risk
The `customer.subscription.updated` handler does NOT compare timestamps or Stripe object versions. A stale event can overwrite newer state:
- A late `PAST_DUE` event could overwrite a recovered `ACTIVE` state
- A late `ACTIVE` event could overwrite a legitimate `PAST_DUE` state

---

## 10. Subscription Persistence Model

### Tier/Status Combinations

| Tier | Status | How Created | Premium Access | Valid/Questionable |
|---|---|---|---|---|
| FREE | ACTIVE | Lazy creation (`getSubscription`), registration default | ❌ No | ✅ Valid — default state |
| MONTHLY | ACTIVE | `checkout.session.completed` webhook | ✅ Yes | ✅ Valid |
| YEARLY | ACTIVE | `checkout.session.completed` webhook | ✅ Yes | ✅ Valid |
| MONTHLY | CANCELED | `cancelSubscription` API call, `customer.subscription.updated` (cancel_at_period_end) | ❌ No (status !== ACTIVE) | ⚠️ Questionable — user paid through period end |
| YEARLY | CANCELED | Same | ❌ No | ⚠️ Questionable |
| MONTHLY | PAST_DUE | `invoice.payment_failed`, `customer.subscription.updated` | ❌ No | ✅ Valid |
| YEARLY | PAST_DUE | Same | ❌ No | ✅ Valid |
| FREE | CANCELED | **Not produced by code** | N/A | ❓ Unused combination |
| FREE | PAST_DUE | **Not produced by code** | N/A | ❓ Unused combination |
| Any | INCOMPLETE | **Never assigned** | N/A | ❓ Defined but unused |
| Any | TRIALING | **Never assigned** | N/A | ❓ Defined but unused |

### Critical Finding: CANCELED + Paid Tier
When a user cancels:
1. `cancelSubscription` calls `stripe.subscriptions.update(subId, { cancel_at_period_end: true })`
2. `cancelSubscription` sets DB `status: "CANCELED"`
3. `userHasPremiumAccess` requires `status === "ACTIVE"`
4. **Result: User loses premium access immediately, even though billing period hasn't ended**

This contradicts the API response message: "Subscription will cancel at the end of the billing period."

---

## 11. Premium-Entitlement Rules

### All Premium-Check Locations

| Location | Function | Rule | Admin Bypass | Evidence |
|---|---|---|---|---|
| `media.service.ts` | `userHasPremiumAccess` | `tier !== FREE && status === ACTIVE && currentPeriodEnd > now()` | ✅ `role === ADMIN → return true` | Confirmed |
| `authorize.ts` | `authorize({ subscription: "PREMIUM" })` | `tier !== FREE && status === ACTIVE && currentPeriodEnd > now()` | ✅ `role !== ADMIN` check | Confirmed (not used on any route) |
| `pricing/page.tsx` | Frontend | Displays current tier, no entitlement check | N/A | Display only |
| `browse/[slug]/page.tsx` | Frontend | Shows lock icon if `accessRestricted: true` | N/A | Relies on API response |

### Consistency
All backend premium checks use **exactly the same business rule**: non-FREE tier + ACTIVE status + future period end. Admin always bypasses. ✅ Consistent.

### Missing-Subscription Handling
- `userHasPremiumAccess`: Returns `false` if no subscription row found
- `getSubscription`: Creates FREE/ACTIVE row lazily if not found
- **Risk:** Between registration and first `getSubscription` call, a user has no Subscription row. `userHasPremiumAccess` correctly returns `false`.

---

## 12. Cancellation Behavior

### Trace
1. **Frontend:** `POST /api/payments/cancel` (authenticated)
2. **Controller:** `payment.controller.ts:cancel` — uses `req.user.id`
3. **Service:** `payment.service.ts:cancelSubscription`
4. **Lookup:** `prisma.subscription.findUnique({ where: { userId } })`
5. **Guards:** Throws 404 if no subscription, 400 if FREE, 400 if no `stripeSubscriptionId`
6. **Stripe:** `stripe.subscriptions.update(stripeSubscriptionId, { cancel_at_period_end: true })`
7. **Database:** `prisma.subscription.update({ where: { userId }, data: { status: "CANCELED" } })`
8. **Response:** `{ message: "Subscription will cancel at the end of the billing period" }`

### Verified Behaviors

| Question | Answer | Evidence |
|---|---|---|
| Uses `cancel_at_period_end`? | ✅ Yes | `stripe.subscriptions.update` with `{ cancel_at_period_end: true }` |
| Status changes immediately? | ✅ Yes — set to `CANCELED` | `prisma.subscription.update` |
| Tier remains MONTHLY/YEARLY? | ✅ Yes — tier not changed | Same update — only `status` changed |
| `currentPeriodEnd` preserved? | ✅ Yes — not changed | Same |
| Premium access retained until period end? | ❌ **No** — `userHasPremiumAccess` requires `status === ACTIVE` | `media.service.ts` |
| Can be reversed? | ⚠️ Via Stripe API only — no CineTube endpoint | No "reactivate" endpoint |
| Idempotent? | ⚠️ Repeated calls safe if already CANCELED (same Stripe call, same DB update) | `cancel_at_period_end: true` is idempotent in Stripe |
| FREE users blocked? | ✅ Throws 400 `ALREADY_FREE` | `cancelSubscription` |
| Stripe failure leaves DB unchanged? | ✅ Yes — Stripe call is before DB update | Same function |
| DB failure after Stripe success? | ⚠️ Stripe set `cancel_at_period_end`, but DB still shows `ACTIVE`. Drift until webhook delivers `customer.subscription.updated`. | Partial failure |

### Business Behavior Resolution
**A user who cancels does NOT retain premium access through the paid billing period.** The database status is immediately set to `CANCELED`, and `userHasPremiumAccess` rejects `CANCELED` status. The frontend FAQ says "You will retain access until the end of your current billing cycle" — this is incorrect per the current implementation.

---

## 13. Checkout Return and Frontend Recovery

### Success Return
1. Stripe redirects to `FRONTEND_URL/profile?success=true` (or other sanitized path)
2. `pricing/page.tsx`: `useEffect` checks `searchParams.get("success") === "true"` → shows "Subscription activated!" message
3. `browse/[slug]/page.tsx`: Polls `GET /payments/subscription` every 2 seconds until tier !== FREE (only when `?success=true`)
4. `auth-provider.tsx:restoreSession`: On page load, tries `POST /auth/refresh`. If refresh cookie expired during Stripe redirect, tries stashed token from `sessionStorage`.

### Cancel Return
1. Stripe redirects to `FRONTEND_URL/profile?canceled=true`
2. `pricing/page.tsx`: Shows "Checkout canceled. No charges were made."

### Key Findings

| Question | Answer | Evidence |
|---|---|---|
| Frontend verifies session? | ❌ No — relies on redirect params only | `pricing/page.tsx` |
| Frontend polls subscription? | ✅ Yes — on media detail page with `?success=true` | `browse/[slug]/page.tsx` — `refetchInterval: 2000` |
| Delayed webhook handled? | ✅ Yes — polling continues until tier updates | Same |
| Success shown before confirmation? | ⚠️ Yes — pricing page shows "activated" immediately from URL param | `pricing/page.tsx` |
| Auth preserved across redirect? | ✅ Via stashed token in sessionStorage | `auth-session.ts` + `restoreSession` |
| SessionStorage cleared? | ✅ `takeStashedAccessToken` removes after reading | `auth-session.ts` |
| Return path sanitized? | ✅ Whitelist-based | `sanitizeReturnPath` |
| Open redirect possible? | ❌ No — whitelist prevents external URLs | Same |
| Admin path as return? | ❌ Not in whitelist — falls back to `/profile` | `ALLOWED_RETURN_EXACT` set |

### Delayed Webhook Scenario
If the webhook is delayed but the user returns to the pricing page:
1. `?success=true` → "Subscription activated!" shown immediately (premature)
2. Subscription query returns FREE tier
3. No polling on pricing page — message persists even if webhook fails
4. On media detail page, polling would eventually detect the tier change

---

## 14. Transaction Persistence

### Model Summary

| Property | Value | Evidence |
|---|---|---|
| Primary key | `id` (UUID) | Prisma schema |
| User relation | `userId` FK → `User.id` (CASCADE) | Same |
| Subscription relation | `subscriptionId` FK → `Subscription.id` (SET NULL) | Same |
| Provider transaction ID | `providerTxnId` (UNIQUE) | Same |
| Amount | `Decimal(10,2)` — major units (dollars) | Same |
| Currency | `String` default "USD" | Same |
| Status | `TransactionStatus` enum | Same |
| Timestamps | `createdAt` only (no updatedAt) | Same |
| Immutability | ✅ No update/delete in application code | Confirmed |

### Which Events Create Transactions

| Event | Creates Transaction | Identifier Used | Amount Source |
|---|---|---|---|
| `checkout.session.completed` | ✅ | `session.payment_intent \|\| session.id` | `session.amount_total / 100` |
| `invoice.paid` | ✅ | `invoice.id` | `invoice.amount_paid / 100` |
| `invoice.payment_failed` | ❌ | — | — |
| `customer.subscription.updated` | ❌ | — | — |
| `customer.subscription.deleted` | ❌ | — | — |

### Double-Count Risk
**Confirmed:** The initial subscription payment generates BOTH a `checkout.session.completed` event AND an `invoice.paid` event. Both create Transaction rows with different `providerTxnId` values. **One payment is recorded twice.**

Evidence: `checkout.session.completed` uses `payment_intent || session.id`, `invoice.paid` uses `invoice.id` — different identifiers for the same payment.

---

## 15. Database Transaction Boundaries

### Workflow Matrix

| Workflow | Stripe Action | DB Operations | `$transaction` | Partial-Failure Risk |
|---|---|---|---|---|
| Checkout creation | `stripe.customers.create`, `stripe.checkout.sessions.create` | `subscription.upsert` | ❌ No | Customer created but session fails → retry safe |
| `checkout.session.completed` | `stripe.subscriptions.retrieve` | `subscription.update` + `transaction.create` | ✅ Batch | Stripe call before DB — if Stripe fails, DB not touched |
| `invoice.paid` | `stripe.subscriptions.retrieve` | `subscription.update` + `transaction.create` | ✅ Batch | Same |
| `invoice.payment_failed` | `stripe.subscriptions.retrieve` | `subscription.update` | ❌ No | Single write — no atomicity needed |
| `customer.subscription.updated` | None | `subscription.update` | ❌ No | Single write |
| `customer.subscription.deleted` | None | `subscription.update` | ❌ No | Single write |
| Cancellation | `stripe.subscriptions.update` | `subscription.update` | ❌ No | Stripe succeeds but DB fails → drift until webhook |

### Distributed Consistency
Stripe and PostgreSQL do not share a transaction. Every webhook handler has a window between Stripe API success and DB commit where:
- Stripe state has changed
- DB state has not changed
- If the process crashes, the DB is stale

The system relies on Stripe retrying webhooks to recover from this window.

---

## 16. Webhook Failure and Retry Behavior

### Error Handling in `stripe-webhook.controller.ts`

| Error Type | HTTP Status | Stripe Retry Behavior |
|---|---|---|
| Missing signature | 400 | Stripe does not retry (client error) |
| Invalid signature | 400 | Stripe does not retry |
| Handler throws (DB error, etc.) | 400 | **Stripe WILL retry** (4xx is retried for webhooks) |
| Handler succeeds | 200 | No retry |

### Key Issue: 400 for Server Errors
The webhook controller catches ALL errors and returns 400. Stripe treats 400 as a client error and may NOT retry. **Database failures during webhook processing cause the event to be lost.**

Actually, Stripe retries on 4xx for webhooks (unlike typical HTTP semantics). But the error message "Webhook error" doesn't distinguish between "bad request" and "server error."

### Specific Failure Scenarios

| Failure | Current Behavior | Recovery |
|---|---|---|
| Missing metadata (`userId`/`plan`) | `console.warn`, break, return 200 | ❌ Lost — no retry |
| Stripe `retrieve` fails | Caught → 400 | ⚠️ Stripe retries |
| DB unique violation (transaction) | Caught → 400 | ⚠️ Stripe retries, but retry will fail again |
| DB connection error | Caught → 400 | ⚠️ Stripe retries, may succeed on retry |
| Unknown event type | Falls through switch, return 200 | ✅ Correct — no action needed |

### Logging
- Event type logged: ✅
- Stripe event ID: ❌ Not logged
- Request ID: ❌ Not in webhook logs
- Structured logging: ❌ `console.log`/`console.error` only

---

## 17. Reconciliation and Recovery

### Search Results
No files matching `reconcile`, `syncSubscription`, `repair`, `retry`, `cron`, `job`, or `scheduler` were found in the codebase.

### Recovery Matrix

| Failure Scenario | Auto Recovery | Manual Recovery | Evidence |
|---|---|---|---|
| Stripe customer created, DB update failed | ❌ | Re-run checkout (creates new customer) | — |
| Checkout completed, webhook never processed | ❌ | No recovery mechanism | — |
| Invoice paid, transaction creation failed | ❌ | No recovery mechanism | — |
| Subscription canceled in Stripe, DB remained ACTIVE | ✅ Webhook `customer.subscription.updated` eventually delivers | — | — |
| DB set CANCELED, Stripe cancellation failed | ❌ | Manual Stripe dashboard | — |
| Duplicate webhook | ✅ Transaction UNIQUE prevents duplicate rows | — | `providerTxnId` UNIQUE |
| Out-of-order webhook | ⚠️ Last write wins — may overwrite newer state | Manual DB correction | — |
| User re-subscribes after cancellation | ✅ New checkout creates new subscription | — | — |
| Transaction unique violation | ❌ Causes 400, Stripe retries, fails again | Manual intervention | — |
| Stripe subscription deleted externally | ✅ `customer.subscription.deleted` webhook resets to FREE | — | — |

---

## 18. Revenue and Analytics Integrity

### `getRevenueStats()` in `payment.service.ts`

| Metric | Query | Status Filter | Risk |
|---|---|---|---|
| Total revenue | `transaction.aggregate({ where: { status: "SUCCESS" }, _sum: { amount } })` | SUCCESS only | ✅ Excludes failed |
| Monthly revenue | Same + `createdAt >= monthStart` | SUCCESS only | ✅ |
| Yearly revenue | Same + `createdAt >= yearStart` | SUCCESS only | ✅ |
| Active subscribers | `subscription.count({ where: { tier: { not: "FREE" }, status: "ACTIVE" } })` | Paid + ACTIVE | ✅ |
| Recent transactions | `transaction.findMany({ where: { status: "SUCCESS" }, take: 10 })` | SUCCESS only | ✅ |

### Double-Count Risk
**Confirmed:** Initial checkout creates TWO Transaction rows (from `checkout.session.completed` and `invoice.paid`). Revenue totals include both. **Initial subscription payment is double-counted in revenue metrics.**

### Refund Risk
No refund handling exists. Refunded payments remain as `SUCCESS` in the Transaction table. Revenue is overcounted by any refund amount.

---

## 19. Payment Security Controls

### Security Matrix

| Control | Status | Evidence |
|---|---|---|
| Stripe secret key backend-only | ✅ Confirmed | `backend/src/config/env.ts` — server-side only |
| Webhook secret backend-only | ✅ Confirmed | Same |
| Frontend does not expose secrets | ✅ Confirmed | No `NEXT_PUBLIC_STRIPE_SECRET` |
| Client cannot choose arbitrary amount | ✅ Confirmed | `PLAN_PRICES` server-side |
| Client cannot choose arbitrary price ID | ✅ Confirmed | Inline `price_data`, no Price IDs |
| Client cannot subscribe another user | ✅ Confirmed | `userId` from JWT |
| Client cannot cancel another user | ✅ Confirmed | `userId` from JWT |
| Return paths sanitized | ✅ Confirmed | `sanitizeReturnPath` whitelist |
| Stripe signature verified | ✅ Confirmed | `constructEvent` |
| Raw body preserved | ✅ Confirmed | `express.raw` before `express.json` |
| Sensitive objects not logged | ⚠️ Partial — no raw payloads, but no explicit filtering | — |
| Error responses hide Stripe details | ⚠️ Partial — generic "Webhook error" message | — |
| Customer/subscription IDs returned | ⚠️ `stripeCustomerId` and `stripeSubscriptionId` exposed via `GET /payments/subscription` | `payment.service.ts:getSubscription` |

---

## 20. Data-Consistency Scenarios

| # | Scenario | Stripe State | CineTube DB | User Entitlement | Recovery |
|---|---|---|---|---|---|
| 1 | New monthly succeeds | Active subscription | MONTHLY + ACTIVE | ✅ Premium | None needed |
| 2 | New yearly succeeds | Active subscription | YEARLY + ACTIVE | ✅ Premium | None needed |
| 3 | Checkout abandoned | Session expired | FREE + ACTIVE (unchanged) | ❌ Free | None needed |
| 4 | Session expires | Expired | FREE + ACTIVE | ❌ Free | None needed |
| 5 | Initial payment fails | No subscription | FREE + ACTIVE | ❌ Free | None needed |
| 6 | Renewal succeeds | Active | ACTIVE + new period | ✅ Premium | None needed |
| 7 | Renewal fails | Past due | PAST_DUE | ❌ Free (immediate) | Stripe retries |
| 8 | Renewal later succeeds | Active | ACTIVE + new period | ✅ Premium | Webhook restores |
| 9 | Cancel at period end | cancel_at_period_end | CANCELED + paid tier | ❌ Free (immediate) — **bug** | Webhook at period end resets to FREE |
| 10 | Period end reached | Deleted | FREE + ACTIVE | ❌ Free | None needed |
| 11 | Subscription deleted externally | Deleted | FREE + ACTIVE | ❌ Free | Webhook delivers |
| 12 | Duplicate checkout event | Same | Re-updates subscription (same values) | ✅ Premium | Transaction UNIQUE prevents double row |
| 13 | Duplicate invoice event | Same | Re-updates subscription | ✅ Premium | Transaction UNIQUE |
| 14 | Out-of-order events | Varies | Last write wins | ⚠️ May be incorrect temporarily | Next correct event fixes |
| 15 | Second checkout while active | New session created | — | — | No prevention |
| 16 | Re-subscribe after cancel | New subscription | New tier + ACTIVE | ✅ Premium | Works correctly |
| 17 | Invalid signature | — | No change | — | 400 returned |
| 18 | DB unavailable | Stripe unchanged | No update | Previous state | Stripe retries |
| 19 | Unique transaction conflict | — | First succeeds, second fails | ✅ Premium | 400 → Stripe retries (fails again) |
| 20 | Frontend returns before webhook | Subscription not yet active | FREE | ❌ Free (temporary) | Polling on detail page detects change |

---

## 21. Confirmed Controls

1. ✅ Prices hardcoded server-side — client cannot manipulate amounts
2. ✅ User identity from JWT, not client body
3. ✅ Return paths whitelist-sanitized
4. ✅ Webhook signatures verified with `constructEvent`
5. ✅ Raw body preserved for signature verification
6. ✅ Webhook mounted before JSON parser
7. ✅ `providerTxnId` UNIQUE prevents duplicate transaction rows
8. ✅ Checkout and invoice handlers use DB transactions for atomicity
9. ✅ Customer reuse via `stripeCustomerId` lookup
10. ✅ Subscription metadata includes `userId` and `plan`

---

## 22. Confirmed Payment Gaps

1. ❌ No Zod validation on checkout route
2. ❌ No check for existing active subscription before creating checkout
3. ❌ `cancel_at_period_end` + immediate `CANCELED` status = premature access loss
4. ❌ One payment creates two Transaction rows (checkout + invoice)
5. ❌ No refund handling
6. ❌ No event ID storage or processed-events table
7. ❌ No reconciliation or monitoring
8. ❌ Webhook returns 400 for server errors (may prevent retries)
9. ❌ `stripeCustomerId` and `stripeSubscriptionId` exposed in subscription API response
10. ❌ No Stripe.js — no client-side payment element
11. ❌ Pricing displayed on frontend may drift from backend
12. ❌ No trial handling
13. ❌ No `client_reference_id` on Checkout Session
14. ❌ Revenue metrics double-count initial payments
15. ❌ `invoice.payment_failed` doesn't use DB transaction
16. ❌ `customer.subscription.updated` doesn't compare timestamps

---

## 23. Idempotency Risks

| Risk | Severity | Description |
|---|---|---|
| Duplicate checkout completion | **Medium** | Transaction row prevented by UNIQUE, but subscription update re-runs. Stripe retries may fail repeatedly on the unique violation. |
| Duplicate invoice.paid | **Medium** | Same pattern as checkout. |
| Checkout + invoice for same payment | **High** | Two different identifiers (`payment_intent` vs `invoice.id`) → two Transaction rows for one payment. Revenue double-counted. |
| Repeated `customer.subscription.updated` | **Low** | Idempotent writes (same values), but no deduplication. |
| Repeated `customer.subscription.deleted` | **Low** | Same — idempotent reset to FREE. |

---

## 24. Subscription-State Risks

| Risk | Severity | Description |
|---|---|---|
| CANCELED loses access immediately | **High** | `userHasPremiumAccess` rejects `CANCELED` even with future `currentPeriodEnd` |
| Stale `updated` event overwrites newer state | **Medium** | No timestamp comparison |
| `PAST_DUE` set by both `invoice.payment_failed` and `customer.subscription.updated` | **Low** | Both correct, but double write |
| No prevention of duplicate active subscriptions | **Medium** | Second checkout session can be created for already-active user |
| `INCOMPLETE`/`TRIALING` never set | **Low** | Dead enum values |

---

## 25. Financial-Reporting Risks

| Risk | Severity | Description |
|---|---|---|
| Initial payment double-counted | **High** | Checkout + invoice both create SUCCESS transactions |
| Refunds not tracked | **High** | Revenue overcounted by refund amount |
| No currency normalization | **Low** | Only USD used currently |
| No failed-transaction recording | **Low** | Failed payments not in revenue (correct), but not tracked for analytics |
| Monthly grouping uses server timezone | **Low** | `new Date(now.getFullYear(), now.getMonth(), 1)` — server-local time |

---

## 26. Unknowns Requiring Later Investigation

1. **Does Stripe retry 400 responses?** Stripe documentation says it retries on 3xx/4xx/5xx for webhooks, but behavior may vary.
2. **What happens if `stripe.subscriptions.retrieve` fails in a webhook handler?** The error propagates and returns 400.
3. **Can a user create multiple simultaneous checkout sessions?** No prevention found — both could complete.
4. **Does `payment_intent` change across Stripe retries?** Need Stripe documentation verification.
5. **Is the Stripe API version `2026-05-27.dahlia` current?** May need updating.
6. **What happens during Stripe maintenance windows?** No retry queue or dead-letter handling.

---

## 27. Recommended Next Discovery Pass

1. **Frontend component and state audit** — Catalog all components, verify loading/error/empty states, check responsive design.
2. **Error handling audit** — Verify all error boundaries, API error display, and user-facing error messages.
3. **Deployment readiness** — Verify environment variables, build scripts, health checks, and production configuration.
4. **Performance audit** — Identify N+1 queries, large payload risks, and missing pagination.
5. **Accessibility audit** — Check ARIA labels, keyboard navigation, color contrast.
