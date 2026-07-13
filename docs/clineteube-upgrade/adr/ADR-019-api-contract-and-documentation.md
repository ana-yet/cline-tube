# ADR-019: API contract and documentation

## Status

Proposed

## Context

Responses are mostly consistent, but raw service/Prisma shapes leak into contracts and no OpenAPI description or deprecation process exists.

## Decision

Keep `/api` as the first-party stable base for this upgrade; do not create a duplicate `/v1` tree. Treat incompatible changes as coordinated releases and introduce URL major versioning only when an external or independently deployed consumer requires it. Route modules own Zod request and response DTOs; CI generates OpenAPI 3.1 from those schemas and validates examples. Every response includes request ID; collections use one pagination envelope; deprecations use headers and a documented removal release.

## Alternatives Considered

Bulk move all routes to `/api/v1`; manually maintain an unrelated OpenAPI file; expose Prisma records; use GraphQL.

## Trade-offs

Schema generation needs a small adapter and careful DTO definitions. Delaying URL versioning is appropriate for one coordinated frontend but requires disciplined additive changes.

## Positive Consequences

Runtime validation, TypeScript types, documentation, examples, and tests share a contract source.

## Negative Consequences

Response schemas must be written explicitly instead of inferred from Prisma selections.

## Migration Impact

Define common envelopes, then migrate high-risk endpoints and expand coverage module by module.

## Security Impact

DTO allowlists prevent provider IDs, stream URLs, and internal fields from leaking.

## Data Impact

None; contracts deliberately decouple from schema migrations.

## Validation Method

OpenAPI generation, lint, snapshot, consumer contract, and negative response tests.

## Rollback or Reversal Strategy

Retain compatibility serializers during the announced deprecation window.
