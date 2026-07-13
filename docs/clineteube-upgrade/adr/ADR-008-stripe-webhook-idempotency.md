# ADR-008: Stripe webhook idempotency

## Status

Proposed

## Context

Stripe can deliver duplicates and out of order. CineTube stores no event IDs, and duplicate transaction inserts currently turn an already-processed event into an error loop.

## Decision

After signature verification, record each Stripe event ID in `ProcessedStripeEvent`. Acquire processing with a compare-and-set status, apply domain writes and mark PROCESSED in one database transaction, return 2xx for processed duplicates, and return 5xx for retryable processing failures. Reclaim stale PROCESSING rows and retain failed payload metadata without storing secrets or full card data.

## Alternatives Considered

Rely only on transaction uniqueness; add a queue; acknowledge before processing; store raw payloads forever.

## Trade-offs

Synchronous processing is simpler and adequate at current volume, but provider calls must be bounded. A queue can be added later behind the same ledger.

## Positive Consequences

Duplicate delivery is harmless and failures are visible and retryable.

## Negative Consequences

The compare-and-set and stale-lease behavior require concurrency tests.

## Migration Impact

Create the ledger first, deploy observe-only recording, then gate side effects through it.

## Security Impact

Signature verification remains first; logs contain event IDs and types, not raw bodies.

## Data Impact

New ledger rows are retained for at least 13 months, then archived or deleted by policy.

## Validation Method

Duplicate, concurrent duplicate, stale lease, retry, invalid signature, and replay tests.

## Rollback or Reversal Strategy

Disable ledger gating while continuing to record events; transaction uniqueness remains a last defense.
