# ADR-006: Password reset and email delivery

## Status

Proposed

## Context

Reset tokens are stored in plaintext and printed to production logs; no user can complete the production flow without log access.

## Decision

Generate 32-byte random tokens, store a SHA-256 hash, send the raw token once through an email-provider adapter, and return the same response for every address. Tokens expire after one hour, are single-use, and password reset revokes all sessions. Production startup requires configured email credentials; local development uses a non-sensitive captured-mail adapter, never console token output.

## Alternatives Considered

Keep UUID tokens; send tokens in API responses; build an email system inside auth; use passwordless login.

## Trade-offs

Email becomes an operational dependency. Hashing prevents recovery, so lost messages require a new request.

## Positive Consequences

The workflow becomes usable and database/log compromise no longer directly reveals live reset links.

## Negative Consequences

Delivery failures and provider suppression require monitoring and support guidance.

## Migration Impact

Invalidate all old reset tokens, deploy hash lookup and adapter together, then remove plaintext logging.

## Security Impact

Apply rate limits per IP and normalized email hash; redact email and token values.

## Data Impact

Replace `token` with `tokenHash`; index expiry and use state.

## Validation Method

Enumeration, expiry, single-use, delivery failure, hash-at-rest, and session-revocation tests.

## Rollback or Reversal Strategy

Disable reset requests while retaining hashes; never restore plaintext storage or logging.
