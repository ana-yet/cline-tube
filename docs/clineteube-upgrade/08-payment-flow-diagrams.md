# CineTube Payment Flow Diagrams

> **Discovery date:** 2026-07-13  
> **Reference:** `docs/clineteube-upgrade/07-stripe-subscription-and-payment-audit.md`

All diagrams are based on verified source-code evidence. Only interactions confirmed in the repository are included.

---

## 1. Checkout Initiation

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant FE as Next.js Frontend
    participant API as Express Backend
    participant STRIPE as Stripe API

    U->>FE: Clicks "Subscribe" on /pricing
    FE->>FE: Check isAuthenticated
    alt Not authenticated
        FE->>U: Redirect to /register
    end

    FE->>FE: stashAccessTokenBeforeCheckout(token)
    FE->>API: POST /api/payments/checkout {plan, returnPath}
    API->>API: authenticate middleware (JWT)
    API->>API: Validate plan is "MONTHLY" or "YEARLY"
    API->>API: sanitizeReturnPath(returnPath) — whitelist
    API->>API: getOrCreateStripeCustomer(userId, email)
    API->>API: prisma.subscription.upsert (ensure row exists)
    API->>STRIPE: stripe.checkout.sessions.create({mode:"subscription", customer, metadata:{userId,plan}})
    STRIPE-->>API: {sessionId, url}
    API-->>FE: 200 {success, data: {url}}
    FE->>U: window.location.href = Stripe Checkout URL
```

---

## 2. Stripe Hosted Checkout Redirect

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant STRIPE as Stripe Checkout
    participant API as Express Backend

    U->>STRIPE: Arrives at Stripe hosted checkout page
    STRIPE->>U: Shows payment form (card)
    U->>STRIPE: Enters payment details
    STRIPE->>STRIPE: Processes payment

    alt Payment succeeds
        STRIPE->>API: POST /api/webhooks/stripe (checkout.session.completed)
        STRIPE->>U: Redirect to success_url (e.g., /profile?success=true)
    end

    alt Payment fails
        STRIPE->>U: Shows error on Stripe page
    end

    alt User closes/cancels
        STRIPE->>U: Redirect to cancel_url (e.g., /profile?canceled=true)
    end
```

---

## 3. Checkout Success Return

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant FE as Next.js Frontend
    participant API as Express Backend

    U->>FE: Arrives at /profile?success=true (or /browse/[slug]?success=true)

    FE->>FE: restoreSession() — try POST /auth/refresh
    alt Refresh cookie valid
        FE->>FE: setAccessToken(new token), setUser(user)
    else Refresh cookie expired
        FE->>FE: takeStashedAccessToken() from sessionStorage
        FE->>API: GET /auth/me (with stashed token)
        API-->>FE: {user}
        FE->>FE: setUser(user)
    end

    Note over FE: Pricing page: shows "Subscription activated!" immediately

    Note over FE: Media detail page: polls subscription every 2s
    loop Until tier !== FREE
        FE->>API: GET /payments/subscription
        API-->>FE: {subscription: {tier: "FREE", ...}}
        Note over FE: Wait 2 seconds
    end
    FE->>API: GET /payments/subscription
    API-->>FE: {subscription: {tier: "MONTHLY", status: "ACTIVE", ...}}
    FE->>U: Shows full media content (premium unlocked)
```

---

## 4. `checkout.session.completed` Webhook

```mermaid
sequenceDiagram
    participant STRIPE as Stripe
    participant API as Express Backend
    participant DB as PostgreSQL

    STRIPE->>API: POST /api/webhooks/stripe (checkout.session.completed)
    API->>API: Verify signature with constructEvent
    API->>API: Extract session.metadata.userId, session.metadata.plan

    alt Missing metadata
        API->>API: console.warn, break
        API-->>STRIPE: 200 {received: true}
    end

    API->>STRIPE: stripe.subscriptions.retrieve(session.subscription)
    STRIPE-->>API: subscription {current_period_start, current_period_end}

    API->>DB: $transaction([
    Note over DB: 1. subscription.update({tier:plan, status:ACTIVE, stripeSubscriptionId, periodStart, periodEnd})
    Note over DB: 2. transaction.create({userId, amount:session.amount_total/100, status:SUCCESS, providerTxnId:payment_intent||session.id})
    API->>DB: ])

    API-->>STRIPE: 200 {received: true}
```

---

## 5. `invoice.paid` Webhook

```mermaid
sequenceDiagram
    participant STRIPE as Stripe
    participant API as Express Backend
    participant DB as PostgreSQL

    STRIPE->>API: POST /api/webhooks/stripe (invoice.paid)
    API->>API: Verify signature
    API->>API: Extract invoice.subscription

    alt No subscription ID
        API-->>STRIPE: 200 {received: true}
    end

    API->>STRIPE: stripe.subscriptions.retrieve(subscriptionId)
    STRIPE-->>API: subscription {metadata.userId, period dates}

    alt No userId in metadata
        API-->>STRIPE: 200 {received: true}
    end

    API->>DB: $transaction([
    Note over DB: 1. subscription.update({status:ACTIVE, periodStart, periodEnd})
    Note over DB: 2. transaction.create({userId, amount:invoice.amount_paid/100, status:SUCCESS, providerTxnId:invoice.id})
    API->>DB: ])

    API-->>STRIPE: 200 {received: true}

    Note over DB: ⚠️ This creates a SECOND transaction for the same initial payment
```

---

## 6. `invoice.payment_failed` Webhook

```mermaid
sequenceDiagram
    participant STRIPE as Stripe
    participant API as Express Backend
    participant DB as PostgreSQL

    STRIPE->>API: POST /api/webhooks/stripe (invoice.payment_failed)
    API->>API: Verify signature
    API->>API: Extract invoice.subscription
    API->>STRIPE: stripe.subscriptions.retrieve(subscriptionId)
    STRIPE-->>API: subscription {metadata.userId}

    API->>DB: subscription.update({where:{userId}, data:{status:"PAST_DUE"}})

    Note over DB: ❌ No transaction record created for failed payment
    Note over DB: ❌ No $transaction wrapper

    API-->>STRIPE: 200 {received: true}
```

---

## 7. `customer.subscription.updated` Webhook

```mermaid
sequenceDiagram
    participant STRIPE as Stripe
    participant API as Express Backend
    participant DB as PostgreSQL

    STRIPE->>API: POST /api/webhooks/stripe (customer.subscription.updated)
    API->>API: Verify signature
    API->>API: Extract subscription.metadata.userId

    alt No userId
        API-->>STRIPE: 200 {received: true}
    end

    API->>API: Determine status:
    Note over API: cancel_at_period_end → "CANCELED"
    Note over API: status === "past_due" → "PAST_DUE"
    Note over API: else → "ACTIVE"

    API->>DB: subscription.update({where:{userId}, data:{status, periodStart, periodEnd}})

    Note over DB: ⚠️ No timestamp comparison — stale events can overwrite newer state
    Note over DB: ❌ No $transaction wrapper

    API-->>STRIPE: 200 {received: true}
```

---

## 8. `customer.subscription.deleted` Webhook

```mermaid
sequenceDiagram
    participant STRIPE as Stripe
    participant API as Express Backend
    participant DB as PostgreSQL

    STRIPE->>API: POST /api/webhooks/stripe (customer.subscription.deleted)
    API->>API: Verify signature
    API->>API: Extract subscription.metadata.userId

    alt No userId
        API-->>STRIPE: 200 {received: true}
    end

    API->>DB: subscription.update({
    Note over DB: tier: "FREE",
    Note over DB: status: "ACTIVE",
    Note over DB: stripeSubscriptionId: null
    API->>DB: })

    Note over DB: ❌ No $transaction wrapper
    Note over DB: ❌ currentPeriodEnd not cleared

    API-->>STRIPE: 200 {received: true}
```

---

## 9. Cancellation at Period End

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend (Profile)
    participant API as Express Backend
    participant DB as PostgreSQL
    participant STRIPE as Stripe API

    U->>FE: Clicks "Cancel Subscription"
    FE->>API: POST /api/payments/cancel
    API->>API: authenticate middleware
    API->>DB: subscription.findUnique({where:{userId}})
    DB-->>API: {stripeSubscriptionId, tier:"MONTHLY", status:"ACTIVE"}

    API->>STRIPE: stripe.subscriptions.update(subId, {cancel_at_period_end: true})
    STRIPE-->>API: success

    API->>DB: subscription.update({where:{userId}, data:{status:"CANCELED"}})

    API-->>FE: {message: "Subscription will cancel at the end of the billing period"}

    Note over DB: ⚠️ status is now CANCELED but currentPeriodEnd is still in the future
    Note over DB: ❌ userHasPremiumAccess now returns false (requires status=ACTIVE)

    FE->>U: Shows cancellation message

    Note over U,DB: User loses premium access IMMEDIATELY despite paying through period end

    Note over STRIPE,DB: Later, at period end:
    STRIPE->>API: customer.subscription.deleted webhook
    API->>DB: subscription.update({tier:"FREE", status:"ACTIVE", stripeSubscriptionId:null})
```

---

## 10. Premium-Content Entitlement Check

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant FE as Frontend (browse/[slug])
    participant API as Express Backend
    participant DB as PostgreSQL

    U->>FE: Views premium media detail page
    FE->>API: GET /api/media/[slug] (optional Bearer token)
    API->>API: optionalAuthenticate
    API->>DB: media.findUnique({where:{slug}})
    DB-->>API: {pricingType:"PREMIUM", streamingLink:"https://...", ...}

    API->>API: userHasPremiumAccess(userId, role)

    alt role === ADMIN
        API->>API: return true (bypass)
    end

    API->>DB: subscription.findUnique({where:{userId}})
    DB-->>API: subscription record

    alt tier !== FREE && status === ACTIVE && currentPeriodEnd > now()
        API-->>FE: {media: {streamingLink: "https://...", accessRestricted: false}}
        FE->>U: Shows full content with streaming link
    else No premium access
        API-->>FE: {media: {streamingLink: null, accessRestricted: true}}
        FE->>U: Shows lock icon + upgrade CTA
    end
```

---

## 11. Duplicate Webhook Delivery

```mermaid
sequenceDiagram
    participant STRIPE as Stripe
    participant API as Express Backend
    participant DB as PostgreSQL

    Note over STRIPE,DB: First delivery
    STRIPE->>API: checkout.session.completed (event evt_1)
    API->>DB: $transaction([subscription.update, transaction.create(providerTxnId=X)])
    DB-->>API: Success
    API-->>STRIPE: 200 {received: true}

    Note over STRIPE,DB: Duplicate delivery (same event)
    STRIPE->>API: checkout.session.completed (event evt_1)
    API->>DB: $transaction([subscription.update, transaction.create(providerTxnId=X)])
    DB-->>API: P2002 UNIQUE violation on providerTxnId
    API->>API: Error caught → 400 WEBHOOK_ERROR

    Note over DB: ✅ Transaction row NOT duplicated (UNIQUE constraint)
    Note over DB: ⚠️ Subscription update did NOT execute (rolled back by $transaction)
    Note over STRIPE: Stripe may retry (400 received)
    Note over STRIPE,DB: Retries will continue to fail on UNIQUE violation
```

---

## 12. Delayed Webhook After Frontend Return

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as Express Backend
    participant DB as PostgreSQL
    participant STRIPE as Stripe

    U->>STRIPE: Completes payment
    STRIPE->>U: Redirect to /browse/movie?success=true
    STRIPE->>API: Webhook (delayed)

    U->>FE: Page loads, polls subscription
    FE->>API: GET /payments/subscription
    API->>DB: subscription.findUnique
    DB-->>API: {tier:"FREE", status:"ACTIVE"} (webhook not yet processed)
    API-->>FE: {subscription: {tier: "FREE"}}
    FE->>U: Shows "premium unlocked" message but content is locked

    Note over FE: Polling continues every 2 seconds...

    STRIPE->>API: checkout.session.completed arrives
    API->>DB: subscription.update({tier:"MONTHLY", status:"ACTIVE", ...})
    DB-->>API: Success
    API-->>STRIPE: 200

    FE->>API: GET /payments/subscription (next poll)
    API->>DB: subscription.findUnique
    DB-->>API: {tier:"MONTHLY", status:"ACTIVE"}
    API-->>FE: {subscription: {tier: "MONTHLY"}}
    FE->>U: Content unlocked ✅
```

---

## 13. Database Failure During Webhook

```mermaid
sequenceDiagram
    participant STRIPE as Stripe
    participant API as Express Backend
    participant DB as PostgreSQL

    STRIPE->>API: checkout.session.completed
    API->>API: Verify signature ✅
    API->>API: Extract metadata ✅
    API->>STRIPE: stripe.subscriptions.retrieve ✅

    API->>DB: $transaction([subscription.update, transaction.create])
    DB-->>API: Connection error / timeout

    API->>API: Error caught in catch block
    API-->>STRIPE: 400 WEBHOOK_ERROR

    Note over DB: ❌ Subscription NOT updated
    Note over DB: ❌ Transaction NOT created
    Note over DB: ❌ No retry queue
    Note over DB: ❌ No dead-letter handling

    Note over STRIPE: Stripe will retry (400 received)
    Note over STRIPE,DB: If DB recovers, retry succeeds
    Note over STRIPE,DB: If DB stays down, event is lost after Stripe retry exhaustion
```

---

## 14. Re-subscription After Cancellation

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as Express Backend
    participant DB as PostgreSQL
    participant STRIPE as Stripe

    Note over U,DB: User previously canceled (status: CANCELED, tier: MONTHLY)

    U->>FE: Visits /pricing, clicks "Subscribe Monthly"
    FE->>API: POST /api/payments/checkout {plan:"MONTHLY"}
    API->>API: getOrCreateStripeCustomer → reuses existing stripeCustomerId
    API->>DB: subscription.upsert → updates stripeCustomerId (already set)
    API->>STRIPE: stripe.checkout.sessions.create({customer: existingCustomer})
    STRIPE-->>API: {url}
    API-->>FE: {url}

    U->>STRIPE: Completes payment
    STRIPE->>API: checkout.session.completed webhook
    API->>DB: $transaction([
    Note over DB: subscription.update({tier:"MONTHLY", status:"ACTIVE", stripeSubscriptionId: NEW})
    Note over DB: transaction.create({providerTxnId: payment_intent})
    API->>DB: ])

    Note over DB: ✅ New subscription active
    Note over DB: ✅ Old stripeSubscriptionId replaced
```

---

## Diagram Notes

### Critical Timing Issues
1. **Frontend return before webhook:** The `?success=true` URL param triggers optimistic UI, but actual entitlement depends on webhook processing.
2. **Cancellation immediate effect:** DB status changes to `CANCELED` before billing period ends, breaking premium access.
3. **Double transaction on initial payment:** Both `checkout.session.completed` and `invoice.paid` create Transaction rows.

### Failure Recovery Summary
| Failure | Auto Recovery | Mechanism |
|---|---|---|
| Webhook delayed | ✅ Frontend polling | `refetchInterval: 2000` |
| Webhook fails (DB error) | ⚠️ Stripe retries | 400 response triggers retry |
| Duplicate webhook | ✅ Transaction UNIQUE | P2002 prevents duplicate row |
| Subscription drift | ❌ None | No reconciliation |
| Double transaction | ❌ None | No deduplication |
