# ADR-004: Authentication and session strategy

## Status

Proposed

## Context

Short-lived JWT access tokens are held in memory and rotating refresh tokens are hashed in PostgreSQL. Reuse detection, session metadata, session limits, and complete CSRF protection are absent.

## Decision

Preserve in-memory access JWTs and HttpOnly rotating refresh cookies. Treat each refresh token as a member of a session family, store only hashes, rotate atomically, revoke the family on reuse, cap users at five active sessions, and expose current/all-session revocation. Require an origin allowlist plus a double-submit CSRF token for refresh and logout.

## Alternatives Considered

Store JWTs in localStorage; replace JWT with server sessions; proxy all auth through Next.js.

## Trade-offs

Memory tokens are lost on reload and require refresh. Database checks add one lookup per protected request, but keep role and deletion state fresh.

## Positive Consequences

The smallest secure evolution of the current design gains theft detection and user-controlled sessions.

## Negative Consequences

Simultaneous refreshes need a short, tested grace strategy so legitimate races are not misclassified as theft.

## Migration Impact

Add session-family fields, backfill existing tokens into one family each, then enable reuse policies.

## Security Impact

Reduces token replay and CSRF risk; tokens, secrets, and raw IP addresses must never be logged.

## Data Impact

RefreshToken gains family, lifecycle, and privacy-minimized device metadata.

## Validation Method

Rotation, parallel refresh, reuse, logout-current, logout-all, CSRF, and five-session-limit integration tests.

## Rollback or Reversal Strategy

Ignore new metadata and return to single-token rotation; retain revocation fields for audit.
