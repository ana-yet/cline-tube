# ADR-013: Upload and Cloudinary strategy

## Status

Proposed

## Context

Uploads are server-mediated, memory-buffered, MIME-checked, and capped at 5 MB. File signatures, dimensions, ownership, and deletion public-ID scoping are incomplete.

## Decision

Retain server-mediated uploads at current volume. Accept JPEG, PNG, and WebP only; verify magic bytes, cap media images at 5 MB and profile images at 2 MB, enforce pixel and dimension bounds, limit concurrent buffers, and upload only into server-selected `cinetube/media` or `cinetube/profiles/{userId}` folders. Delete and replace by stored asset ID, never a raw client public ID.

## Alternatives Considered

Direct signed browser uploads; local disk storage; accept SVG/GIF; expose arbitrary Cloudinary deletion.

## Trade-offs

The API handles upload bandwidth and memory. Direct signed uploads can be revisited only if measured load justifies the additional callback and ownership complexity.

## Positive Consequences

Ownership and asset lifecycle remain centralized with minimal architectural change.

## Negative Consequences

Dimension decoding and orphan cleanup add implementation and test work.

## Migration Impact

Add profile public ID, harden validation, then deprecate raw public-ID deletion.

## Security Impact

Signature verification, decompression-bomb limits, folder policies, and idempotent delete reduce upload abuse.

## Data Impact

Store provider public IDs for every replaceable asset; cleanup failures enter a repair list.

## Validation Method

Spoofed MIME, oversized bytes/pixels, corrupt image, wrong owner, replacement, duplicate delete, and orphan tests.

## Rollback or Reversal Strategy

Disable new upload routes while existing URLs continue serving; do not remove old assets during rollback.
