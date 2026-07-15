# ADR-020: View count and analytics strategy

## Status

Proposed

## Context

View suppression is process-local and unauthenticated calls can inflate counts. Exact event analytics would add cost and privacy exposure.

## Decision

Treat `Media.viewCount` as an approximate unique-day counter. Insert a `MediaViewDedup` row keyed by media, a daily bucket, and a privacy-preserving viewer hash; increment the media counter only when the unique insert succeeds, in one transaction. Authenticated hashes derive from user ID; anonymous hashes use an HMAC of coarse IP prefix and user agent with a rotating secret. Retain dedup rows for seven days. Do not add Redis.

## Alternatives Considered

Keep process memory; count every request; store raw IPs; introduce Redis or a full analytics platform.

## Trade-offs

Counts are intentionally approximate and a person can count once per day/device context. Database writes increase modestly.

## Positive Consequences

Behavior is consistent across instances, abuse is bounded, and no raw IP is retained.

## Negative Consequences

HMAC rotation and cleanup need scheduled maintenance; bots can still distribute traffic.

## Migration Impact

Create the dedup table, switch recording atomically, then remove the in-memory map.

## Security Impact

Rate-limit view writes and keep the HMAC secret server-only.

## Data Impact

New short-retention dedup rows; lifetime count remains on Media.

## Validation Method

Concurrent duplicate, multi-instance, anonymous/authenticated, rotation, cleanup, and abuse-limit tests.

## Rollback or Reversal Strategy

Disable dedup inserts and retain the existing counter; do not fall back to raw-IP storage.
