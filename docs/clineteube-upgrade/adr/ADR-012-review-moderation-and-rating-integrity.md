# ADR-012: Review moderation and rating integrity

## Status

Proposed

## Context

Review states and rating recalculation exist, but moderation overwrites history and editing an approved review updates then recalculates outside one transaction.

## Decision

Keep PENDING, APPROVED, and REJECTED. Create and edit always result in PENDING; only APPROVED reviews are public and affect rating. Status mutation, moderation audit, and rating recomputation occur in one transaction. Admin may remove content, but may not rewrite user review text. Reports are unique per reporter and review; self-reporting is rejected.

## Alternatives Considered

Publish immediately; retain approval after edits; store only latest status; permit admin text editing.

## Trade-offs

Re-reviewing edits creates moderation work but protects public rating integrity.

## Positive Consequences

Every public rating is reproducible and every admin action is attributable.

## Negative Consequences

Audit and report data grow over time and need retention rules.

## Migration Impact

Add audit storage first, then route all moderation through the new transactional service.

## Security Impact

Named moderation policies and immutable actor identity prevent silent overrides.

## Data Impact

New moderation-action rows and report uniqueness; existing review uniqueness remains.

## Validation Method

State-machine, concurrency, rating invariant, report uniqueness, ownership, and admin-override tests.

## Rollback or Reversal Strategy

Audit rows remain append-only; old status fields remain the operational source during rollback.
