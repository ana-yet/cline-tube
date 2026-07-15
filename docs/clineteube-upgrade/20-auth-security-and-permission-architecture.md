# 20. Authentication, Security, and Permission Architecture

## Security objective

Retain the current JWT design while making its actual capabilities explicit: a user is authenticated only when both the safe user snapshot and an in-memory access token exist. The HttpOnly refresh cookie can restore that capability, but its presence is not readable proof in the browser. The target adds server-side session families, rotation reuse detection, exact-origin CSRF defenses, auditable policy checks, and secure recovery without introducing a new identity platform.

## Authentication lifecycle

```mermaid
sequenceDiagram
    actor U as User
    participant W as Web app
    participant A as Auth API
    participant DB as PostgreSQL
    U->>W: Submit credentials
    W->>A: POST login + Origin
    A->>DB: Verify user and session limit
    A->>DB: Store hashed refresh token in new family
    A-->>W: Access token + safe user; HttpOnly refresh and CSRF cookies
    W->>W: Keep access token only in memory
    W->>A: Bearer access token on API call
    A-->>W: Resource response
    Note over W: isAuthenticated = user exists AND access token exists
    W->>A: POST logout + CSRF
    A->>DB: Revoke current session family
    A-->>W: Clear cookies; idempotent success
    W->>W: Clear auth and user-scoped query cache
```

Access tokens remain short-lived and never enter local storage, session storage, URLs, logs, or server-rendered HTML. Refresh tokens remain random, hashed at rest, rotated, and delivered only through `Secure; HttpOnly; SameSite=None` cookies in the Vercel-to-Render production split. Local development uses an explicitly configured safe variant.

## Refresh rotation and reuse response

```mermaid
sequenceDiagram
    participant C as Browser client
    participant A as Auth API
    participant DB as Session store
    C->>A: Refresh cookie T1 + CSRF
    A->>DB: Atomically consume live hash(T1)
    DB-->>A: Family F, token unused
    A->>DB: Mark T1 used; create child T2
    A-->>C: New access token; replace cookie with T2
    C->>A: Replayed T1
    A->>DB: Find already-used token in family F
    A->>DB: Revoke every live token in F (reuse detected)
    A-->>C: 401 SESSION_REUSE_DETECTED; clear cookies
```

Rotation uses a database transaction/conditional update so two concurrent refreshes cannot both succeed. A narrow client-side single-flight refresh prevents normal tabs from creating avoidable races. Reuse revokes the affected family, emits a redacted high-severity security event, and requires login. It does not reveal whether the request was an attack or a stale client.

Session rules:

- Maximum five live refresh-session families per user; a sixth login revokes the least recently used family after an explicit UI notice.
- `GET /auth/sessions` exposes coarse device label, creation, last use, and current-session flag—not token hashes or raw IP.
- Logout revokes the current family; logout-all and password reset revoke all families.
- Session expiry is absolute as well as idle; rotation never extends beyond the approved absolute limit.
- Locked/suspended users cannot refresh even if a token is otherwise valid.

## CSRF and cross-origin policy

The refresh cookie is cross-site in production, so SameSite is not a sufficient CSRF boundary. All cookie-bearing state-changing endpoints enforce:

1. Exact `Origin` match against a parsed allowlist—no suffix, substring, wildcard-with-credentials, or reflected origin.
2. Double-submit CSRF: a readable, random CSRF cookie and matching `X-CSRF-Token` header bound to the session context.
3. JSON content type for non-upload mutations; multipart routes apply the same origin/header policy.
4. Credentials only for approved Vercel production/preview origins selected by explicit environment policy.

The application does not use a query-string token fallback. Webhooks are exempt from browser CSRF because they use provider signature verification over the raw body. Rate limits are scoped separately for login, refresh, recovery, contact, upload, and report submission.

## Password-reset lifecycle

```mermaid
sequenceDiagram
    actor U as User
    participant W as Web app
    participant A as Auth API
    participant DB as PostgreSQL
    participant E as Email adapter
    U->>W: Request reset for email
    W->>A: POST forgot-password
    A->>DB: Invalidate older usable reset rows
    A->>DB: Store hash(random single-use token), expiry
    A->>E: Send same-origin reset URL containing raw token
    A-->>W: Generic accepted response
    Note over A,E: Raw token is never returned by API or logged
    U->>W: Open reset URL and submit new password
    W->>A: POST reset-password with token
    A->>DB: Atomically consume valid hash and update password
    A->>DB: Revoke all refresh sessions
    A-->>W: Success; redirect to login
```

The email adapter has production and local-development implementations. Development may capture mail in a local inbox service, but must not print raw tokens to shared logs. Requests always receive the same generic response and approximate timing. Tokens are high-entropy, short-lived, single-use, stored only as hashes, and invalidated when a password changes. Reset URLs use an allowlisted configured frontend origin.

## Authorization model

The persisted role set stays `USER` and `ADMIN`; adding a generic ACL framework is unnecessary. Controllers invoke named capabilities, then separate ownership and entitlement policies. This creates reviewable intent without changing the current role architecture.

| Policy | USER | ADMIN | Additional condition |
|---|---:|---:|---|
| `media:read` | Yes | Yes | Publication visibility for public DTO |
| `media:stream` | Yes | Yes | Media is free or entitlement policy grants premium access |
| `media:manage` | No | Yes | Valid lifecycle transition and upload ownership |
| `review:create` | Yes | Yes | One review per user/media; media visible |
| `review:update-own` | Yes | Yes | Resource owner; meaningful edit re-enters pending |
| `review:moderate` | No | Yes | Expected current state; audit reason where required |
| `comment:manage-own` | Yes | Yes | Owner, or admin through explicit moderation capability |
| `watchlist:manage-own` | Yes | Yes | Principal owns the collection |
| `profile:manage-own` | Yes | Yes | Immutable role/email/billing fields excluded |
| `billing:manage-own` | Yes | Yes | Provider object belongs to principal |
| `admin:users` | No | Yes | Cannot remove/suspend final active admin |
| `admin:finance` | No | Yes | Reconciliation repair requires explicit confirmation/audit |
| `admin:content` | No | Yes | Supported sanitized content only |
| `admin:contacts` | No | Yes | Sensitive response is no-store and audited |

Authentication, role/capability, ownership, moderation visibility, and subscription entitlement are distinct checks. An admin role does not implicitly bypass every ownership or financial invariant; bypasses must be named and audited.

## Entitlement policy boundary

`canAccessMedia(principal, media, derivedSubscription, now)` returns a decision and a stable reason code. It grants public/free media without subscription. Premium access is granted for `ACTIVE` and approved `GRACE` entitlement states and, when cancellation is scheduled, until the paid period ends. It denies `SUSPENDED`, `EXPIRED`, and `REVOKED`. The policy never exposes a streaming link before a grant and is shared by detail DTO construction and stream delivery.

## Input, output, and secret safety

- Hash passwords with the existing approved adaptive algorithm and centrally configured work factor; rehash on login when parameters become stale.
- Redact authorization headers, cookies, passwords, reset/refresh tokens, CSRF tokens, webhook signatures, provider secrets, and contact bodies from logs and tracing.
- Validate all environment secrets at boot without printing their values. Production refuses known placeholder/test secrets.
- Keep public/user/admin response mappers separate. Never serialize a Prisma user, subscription, or webhook record directly.
- Upload validation inspects actual decoded type and dimensions, not filename/MIME claims alone.
- Security headers are set deliberately at the frontend and API boundary; CSP starts in report-only mode before enforcement.

## Security events and audit

Audit records are required for account suspension/reactivation, admin content publication, review moderation, contact assignment/resolution, reconciliation repair, session-family reuse, and privileged data export if introduced. Each record includes actor (or system), action, target, before/after state hash or bounded fields, reason, request ID, and timestamp. Audit logs exclude secrets and minimize personal data.

## Threat-focused acceptance cases

- A browser with `user` restored but no memory access token is not authenticated and cannot render protected capability as available.
- Concurrent refresh with one token yields at most one successor; later reuse revokes the family.
- A request from a lookalike origin, missing CSRF header, or mismatched CSRF cookie is rejected before mutation.
- Forgot-password responses do not disclose account existence; raw reset tokens are absent from API response and logs.
- A user cannot update another user's review/comment/session/watchlist, even with a syntactically valid UUID.
- A canceled-at-period-end subscriber retains premium access through the paid period and loses it afterward unless renewed.
- An arbitrary Cloudinary public ID cannot be deleted through a request path.
- Admin endpoints reject normal users and record privileged state transitions.

## Human decisions before implementation

Confirm access/refresh/reset lifetimes, maximum session count, password rules, preview-domain policy, account deletion/retention behavior, CSP rollout, and whether administrators should receive security notifications. None of these decisions justifies returning reset tokens or weakening origin/CSRF checks in production.

