# ADR-005: Authorization and ownership policies

## Status

Proposed

## Context

Roles are USER and ADMIN, while ownership and premium rules are scattered through middleware and services.

## Decision

Keep USER and ADMIN only. Express uses named policies such as `canManageMedia`, `canModerateReview`, `canEditOwnReview`, `canDeleteComment`, and `hasMediaEntitlement`. Role, ownership, and entitlement are separate checks. Frontend visibility mirrors policy outcomes but never grants access.

## Alternatives Considered

Add moderator/editor roles; use route-local boolean checks; adopt a general-purpose authorization engine.

## Trade-offs

Named policies add small indirection but make intent and tests explicit without introducing a new system.

## Positive Consequences

Ownership is consistently enforced and admin overrides are deliberate and auditable.

## Negative Consequences

Every new mutation must choose and test a policy.

## Migration Impact

Extract existing checks while retaining route behavior; add moderation audit before enabling new admin overrides.

## Security Impact

Denial is the default. User-supplied IDs never select the acting user.

## Data Impact

Moderation actions record actor, subject, action, reason, and timestamp.

## Validation Method

Policy unit matrices and integration tests for guest, USER owner, USER non-owner, and ADMIN.

## Rollback or Reversal Strategy

Policies can delegate to existing service checks during transition.
