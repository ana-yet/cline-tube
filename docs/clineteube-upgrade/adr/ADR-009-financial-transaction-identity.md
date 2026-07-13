# ADR-009: Financial transaction identity

## Status

Proposed

## Context

Checkout completion and invoice payment currently create separate Transaction rows for the same initial subscription payment.

## Decision

For subscription revenue, the canonical financial identity is the Stripe invoice ID. Only a paid-invoice event creates a successful Transaction. Checkout completion associates the checkout attempt and subscription but creates no financial row. Store amounts in integer minor units, currency, service period, invoice ID, and related charge/payment-intent IDs. Record each refund as a separate immutable adjustment keyed by Stripe refund ID.

## Alternatives Considered

Use PaymentIntent, Charge, Checkout Session, or a composite mapping across all objects.

## Trade-offs

Invoice identity is subscription-specific, which fits CineTube but would not cover unrelated one-time products without a future transaction kind.

## Positive Consequences

One invoice produces one payment record; refunds are auditable and revenue cannot double-count checkout plus invoice.

## Negative Consequences

Existing rows require a cautious repair and some legacy rows may be ambiguous.

## Migration Impact

Add canonical columns, backfill by Stripe object links where verifiable, quarantine ambiguous duplicates, then enforce uniqueness.

## Security Impact

Financial repair is ADMIN-only, dry-run first, and fully audited.

## Data Impact

Transaction becomes an immutable invoice ledger; PaymentAdjustment records refunds.

## Validation Method

Initial payment, renewal, duplicate, partial refund, full refund, and backfill fixture tests.

## Rollback or Reversal Strategy

Retain legacy provider IDs and a repair mapping; never delete ambiguous financial rows automatically.
