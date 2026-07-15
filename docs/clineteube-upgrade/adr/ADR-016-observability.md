# ADR-016: Observability

## Status

Proposed

## Context

Logs are unstructured, request IDs are not propagated through every operation, and there is no error monitor, readiness check, or payment alerting.

## Decision

Emit structured JSON logs with timestamp, level, service, environment, deployment version, request ID, actor ID when safe, operation, duration, and error code. Centralize redaction. Add error monitoring, liveness and database-backed readiness endpoints, payment/reconciliation alerts, and provider-operation logs. Never log passwords, reset/access/refresh tokens, cookies, authorization headers, provider secrets, or webhook bodies.

## Alternatives Considered

Continue Morgan plus console; build a metrics platform; log complete provider payloads.

## Trade-offs

An error-monitoring service and log schema add configuration, but no new runtime service is required.

## Positive Consequences

Security incidents, failed payments, uploads, migrations, and deploy regressions become diagnosable.

## Negative Consequences

Retention and sampling must be controlled to protect privacy and cost.

## Migration Impact

Add logger/redaction adapters, replace sensitive logs first, then instrument boundaries.

## Security Impact

Default-deny redaction and minimized actor metadata are release gates.

## Data Impact

No product-table impact; reconciliation run summaries may be retained.

## Validation Method

Log-capture tests assert redaction, correlation, levels, and alert triggers.

## Rollback or Reversal Strategy

Fall back to stdout JSON without the external monitor; never re-enable sensitive logs.
