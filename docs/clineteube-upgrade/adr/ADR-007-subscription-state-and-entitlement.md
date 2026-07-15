# ADR-007: Subscription state and entitlement

## Status

Proposed

## Context

Current tier and status combine billing and access. `CANCELED` immediately removes access even when `currentPeriodEnd` is in the future.

## Decision

Store tier, provider billing status, cancellation intent, provider subscription identity, current period, past-due time, and any explicit revocation separately. Compute—not persist—`entitlementStatus` as NONE, ACTIVE, GRACE, SUSPENDED, EXPIRED, or REVOKED. Cancel-at-period-end remains entitled through the paid period. Default past-due grace is 72 hours capped by period end; full refund of the current period revokes access, while partial refund does not automatically revoke it.

## Alternatives Considered

Use one status enum; persist entitlement; grant access from tier alone; remove all grace.

## Trade-offs

Derived entitlement must be shared by media, subscription DTOs, and tests. The 72-hour grace remains a product-confirmation checkpoint.

## Positive Consequences

Billing events cannot silently redefine access, and cancellation behavior matches the user promise.

## Negative Consequences

More state fields and mapping tests are required.

## Migration Impact

Backfill cancellation intent from existing CANCELED rows and period dates; deploy dual-read before switching writes.

## Security Impact

Only the backend calculator can release premium stream URLs.

## Data Impact

Subscription receives explicit lifecycle timestamps and ordering fields; free state no longer masquerades as ACTIVE billing.

## Validation Method

Table-driven lifecycle and entitlement tests covering every state and boundary timestamp.

## Rollback or Reversal Strategy

Keep old tier/status columns through one release and switch reads back if reconciliation finds drift.
