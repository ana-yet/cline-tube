# Incremental target folder structure

## Backend

```text
backend/src/
  app.ts
  server.ts
  config/                     # validated environment and composition
  infrastructure/
    db/                       # Prisma client and transaction helpers
    stripe/                   # Stripe SDK adapter
    cloudinary/               # Cloudinary adapter
    email/                    # delivery adapters
    logging/                  # logger, redaction, error monitor
  shared/
    contracts/                # envelope, errors, pagination, request context
    http/                     # common middleware and validation helper
    policies/                 # policy primitives only
    testing/
  modules/
    auth/
      auth.routes.ts
      auth.controller.ts
      auth.schemas.ts
      auth.service.ts
      auth.repository.ts
      auth.dto.ts
      auth.policy.ts
      auth.test.ts
    users/
    profiles/
    media/
    genres/
    reviews/
    comments/
    watchlists/
    subscriptions/
    payments/
    uploads/
    contacts/
    content/
    analytics/
    admin/
    health/
  jobs/                       # cleanup/reconciliation entrypoints
```

Each module uses the same pieces only when needed; do not create empty repository, policy, or event files to satisfy a template.

## Frontend

```text
frontend/src/
  app/                        # route ownership, layouts, metadata, boundaries
    (public)/
    (auth)/
    (dashboard)/dashboard/
    (dashboard)/admin/
  features/
    auth/
    home/
    browse/
    media-details/
    reviews/
    comments/
    watchlist/
    profile/
    subscription/
    user-dashboard/
    admin-dashboard/
    admin-media/
    admin-reviews/
    content/
    contact/
    legal/
  components/
    ui/                       # shadcn/Base UI primitives
    shared/                   # MediaCard, state views, app navigation
  lib/
    api/                      # client, DTO decoding, query keys
    auth/
  providers/                  # auth, query, theme
  hooks/                      # genuinely cross-feature hooks only
  config/
  types/                      # non-contract UI types only
```

`shared-ui` is the seventeenth boundary and maps to `components/ui`, `components/shared`, and token/provider files rather than a feature route.

## What stays initially

- `app.ts`, `server.ts`, config files, Prisma schema location, `app/` routes, `components/ui`, providers, and API client stay in place.
- Existing global `routes/`, `controllers/`, `services/`, and `validations/` remain while untouched capabilities use them.
- Existing pages remain valid route entrypoints; extraction never changes URLs by itself.

## Migration mapping

| Triggering work | Files moved together | Compatibility technique |
|---|---|---|
| Auth hardening | auth routes/controller/service/validation plus token utilities | old imports re-export new service for one phase |
| Payment reliability | payment/webhook routes/controllers/service | preserve endpoint paths and response compatibility adapter |
| Review audit | review/comment pieces separately | route mounts point to migrated module handlers |
| New contact/content | start directly in modules/features | no legacy move |
| UI/theme | tokens/providers/primitives first | dark remains default until pages are migrated |
| Page refactor | route becomes thin composition | feature queries/components retain behavior |

## Guardrails

- No large rename-only pull request.
- One focused backlog item moves at most one cohesive capability.
- No `index.ts` barrel may hide a module cycle.
- Cross-module imports target a documented public file, never another repository.
- Delete compatibility exports only after `rg` proves no consumer remains and relevant tests pass.
