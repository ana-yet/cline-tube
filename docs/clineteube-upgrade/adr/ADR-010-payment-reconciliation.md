# ADR-010: Payment reconciliation

## Status

Proposed

## Context

Provider and database writes cannot share a transaction. No current job detects missed webhooks, stale subscriptions, missing invoices, or refund drift.

## Decision

Provide a read-only reconciliation service that compares active/recent Stripe subscriptions and invoices with CineTube state, emits discrepancies, and supports an explicit audited repair command. Run it daily through a Render cron command when available and on demand from an admin endpoint. Automatic repair is limited to unambiguous, idempotent mappings; all financial deletions are forbidden.

## Alternatives Considered

Trust webhooks alone; introduce a message broker; allow direct database edits.

## Trade-offs

Reconciliation consumes provider API quota and needs pagination/checkpoints. It is operationally simpler than a new queue service.

## Positive Consequences

Missed delivery and partial failures become detectable and recoverable.

## Negative Consequences

Some discrepancies require human judgment and remain open alerts.

## Migration Impact

Ship dry-run reports before any repair action; establish a known-good baseline after transaction backfill.

## Security Impact

Least-privilege admin policy, confirmation, reason, actor, request ID, and before/after audit are mandatory.

## Data Impact

Reconciliation reads provider IDs and updates only through module services; run summaries are retained.

## Validation Method

Fixtures for missing event, stale event, duplicate invoice, refund, deleted subscription, and provider outage.

## Rollback or Reversal Strategy

Disable scheduled and repair modes independently; dry-run remains available.
