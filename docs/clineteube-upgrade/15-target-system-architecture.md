# Target system architecture

## Current system context — verified

```mermaid
flowchart LR
    User["Guest, user, premium user, admin"] --> FE["Next.js 16 on Vercel\nclient-rendered pages"]
    FE -->|"REST /api; bearer access token"| API["Express 4 on Render\nlayered routes/controllers/services"]
    FE -.->|"Hosted Checkout redirect"| Stripe["Stripe Checkout"]
    Stripe -->|"signed webhook"| API
    API --> DB["PostgreSQL through Prisma\n15 models"]
    API --> Cloudinary["Cloudinary images"]
    API -.-> Log["stdout logs\nreset token exposure"]
```

## Target system context

```mermaid
flowchart LR
    Actor["Guest / USER / ADMIN"] --> Web["Next.js frontend\npublic server shells + client features"]
    Web -->|"typed REST DTOs"| App["Express modular monolith\n16 modules"]
    Web -->|"hosted checkout"| Stripe["Stripe"]
    Stripe -->|"signed, duplicate-prone events"| Pay["Payment adapter + event ledger"]
    Pay --> App
    App --> DB["PostgreSQL / Prisma\nsingle transaction boundary"]
    App --> Assets["Cloudinary adapter"]
    App --> Email["Email adapter"]
    App --> Obs["structured logs + error monitor"]
    Ops["Render cron/admin repair"] -->|"cleanup and reconciliation"| App
```

## Target container architecture

```mermaid
flowchart TB
    subgraph Vercel["Vercel"]
      Routes["App Router layouts/pages"]
      Features["17 feature/shared boundaries"]
      Query["TanStack Query + in-memory auth"]
      Routes --> Features --> Query
    end
    subgraph Render["Render web service"]
      HTTP["Express middleware\nrequest ID, security, validation"]
      Modules["16 domain/application modules"]
      Infra["Prisma + Stripe + Cloudinary + email adapters"]
      Jobs["cleanup/reconciliation entrypoints"]
      HTTP --> Modules --> Infra
      Jobs --> Modules
    end
    Query --> HTTP
    Infra --> PG["Hosted PostgreSQL"]
    Infra --> Providers["Stripe / Cloudinary / email"]
```

## Architecture style and dependency rules

- Routes validate transport DTOs and call application services; they do not call Prisma or providers.
- Domain/application services enforce policy and transaction boundaries; they do not depend on Express or React.
- Repositories map Prisma records to internal entities/read models. Only owning modules write owned tables.
- Stripe, Cloudinary, email, logging, clocks, and ID generation are adapters behind narrow interfaces.
- Shared kernel is limited to error/envelope types, pagination, request context, policy primitives, clocks/IDs, and test factories. Business enums stay with owners.
- Admin and analytics compose public module queries; they cannot bypass module writes.
- No module imports a controller, route, or another module's repository.

## Request lifecycle

```mermaid
sequenceDiagram
    participant C as Client
    participant M as Express middleware
    participant R as Route module
    participant P as Policy/service
    participant D as Repository/Prisma
    C->>M: Request + optional bearer + X-Request-ID
    M->>M: ID, proxy-aware IP, security, CORS, rate limit
    M->>R: Parsed request
    R->>R: Zod params/query/body
    R->>P: Auth context + request DTO
    P->>P: Role / ownership / entitlement policy
    P->>D: Transactional query or mutation
    D-->>P: Internal entity/read model
    P-->>R: Response DTO
    R-->>C: Envelope + requestId
```

## Boundary decisions

| Boundary | Decision |
|---|---|
| Validation | Environment at startup; transport at routes; invariants in services; uniqueness/FKs in DB; provider payload after signature |
| Authorization | Backend named policies; frontend visibility only; ADMIN does not bypass billing records |
| Responses | Explicit DTOs; no raw Prisma, provider IDs, or premium stream URL in media detail |
| Observability | Request context crosses modules; provider/event logs at adapter boundary; redaction central |
| Background tasks | No queue initially. Fast synchronous webhook processing through ledger; daily Render cron/on-demand cleanup and reconciliation |
| Scaling | One web service is adequate; remove process-local correctness dependencies; add Redis only after measured need |

## Trade-off conclusion

Microservices and general event infrastructure are rejected: CineTube has one team, one deployment owner, one database, and no independently scaling workload. A modular monolith preserves atomic review/rating and payment-ledger writes while providing enough boundaries for safe incremental delivery.
