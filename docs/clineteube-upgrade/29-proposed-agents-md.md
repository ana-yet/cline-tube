# 29. Proposed Root `AGENTS.md`

This is a proposed concise implementation guide. It does **not** modify the repository's actual root `AGENTS.md`. Adopt it only after human review and merge it with existing user preferences rather than replacing them blindly.

```markdown
# CineTube implementation rules

## Product and stack

CineTube is a movie/series discovery, review, watchlist, streaming-entitlement, and subscription portal. Preserve Next.js App Router, React, TypeScript, Tailwind/shadcn, TanStack Query, RHF/Zod/Axios, Express, Prisma/PostgreSQL, JWT/bcrypt, Stripe Checkout, Cloudinary, Vercel frontend, and Render backend. Do not introduce healthcare concepts, microservices, Redis, or a technology rewrite without an approved ADR.

Read `docs/clineteube-upgrade/13-architecture-executive-summary.md`, the controlling ADR, roadmap phase, backlog item, and traceability rows before implementation.

## Architecture and boundaries

- Incrementally use the 16 backend modules and 17 frontend feature boundaries in docs 16–17; do not perform rename-only mass refactors.
- A domain module owns its invariants/data access. Cross-module work uses its public service/policy contract, not another module's Prisma queries or private files.
- Shared code contains transport, validation, error, auth-policy, logging, and UI primitives—not miscellaneous business logic.
- Provider SDKs stay behind Stripe, Cloudinary, and email adapters. Background reconciliation/cleanup/backfills do not run as unleased timers in every web process.
- Validate HTTP path/query/header/body with Zod, then enforce domain invariants. Return explicit DTOs and standard errors; never serialize Prisma/provider records directly.

## Security

- The backend is the security boundary. Keep roles `USER` and `ADMIN`; use named capability, ownership, moderation, and entitlement policies.
- `isAuthenticated` is true only when both `user` and the in-memory access token exist. Never persist access tokens in browser storage. Clear user-scoped query cache on logout/account change.
- Hash refresh/reset tokens. Rotation is atomic and detects reuse. Reset tokens are single-use, emailed, and never returned/logged. Cookie mutations require exact Origin plus CSRF; redirect/return paths remain inside the app.
- Never log passwords, tokens, cookies, CSRF values, provider secrets/signatures/payloads, contact bodies, or raw viewer fingerprints. Use safe response DTOs and redacted structured logs.
- Uploads require actual signature, byte/dimension/concurrency limits, server folders, stored ownership, and idempotent replacement/deletion. Never delete an arbitrary request-supplied Cloudinary public ID.

## Payments and data

- Stripe is billing authority; PostgreSQL is the durable projection. Checkout proves intent, not payment. Only a paid Stripe invoice creates the canonical transaction. Store minor units/currency and immutable refund adjustments.
- Verify webhook raw-body signatures; claim provider event IDs durably; guard event ordering and domain-object uniqueness. Redirect parameters never grant entitlement.
- Cancel-at-period-end retains access until paid period end. Use the single derived entitlement policy; do not scatter raw subscription status checks.
- Reconciliation is bounded/dry-run by default; repairs are explicit, idempotent, compare-and-set, admin-only, and audited. Never delete financial history to repair it.
- Database changes follow expand, compatible code, bounded resumable backfill, verify, constrain, observe, then later contract. Run production migrations once with `prisma migrate deploy`; never at web startup.
- Only approved reviews affect public ratings; moderation and rating recomputation are one transaction and actions are audited.

## Frontend UI and accessibility

- Use design tokens and existing shadcn primitives. Support hydration-safe light/dark/system themes, a 4px spacing grid, unified radius/focus/motion, and reduced motion. Avoid duplicate wrappers and fake content/statistics.
- Every async page/section has loading/skeleton, empty, error, unauthorized/conflict where relevant, and success states. Forms have labels, autocomplete, field/form errors, ARIA associations, first-error focus, pending/duplicate protection, and server validation.
- Preserve semantic landmarks/headings, keyboard operation, visible focus, dialog trap/Escape/return, meaningful alt text, table/chart alternatives, contrast, and practical 44px targets.
- Verify 320/375/768/1024/1440px and 200% zoom with no page horizontal overflow. Public cacheable reads may use server components; protected data uses client capability/TanStack Query. Never expose premium stream URLs before backend authorization.

## Required commands

Use the exact scripts available in the working branch. Current baseline commands are:

- Backend: `npm run lint`, `npm run build` from `backend/`.
- Frontend: `npm run lint`, `npm run build` from `frontend/`.
- Prisma generation/validation/migration commands must pass `--schema=../prisma/schema.prisma` from `backend/`.

After Phase 1 adds test/typecheck/format/CI scripts, run the documented backend unit/integration, frontend component, Playwright critical E2E, Prisma migration-validation, both build, contract-diff, dependency, and secret-scan commands applicable to the changed scope. Do not invent a nonexistent command; update this guide when scripts are approved.

## Task workflow and done

- Work from one `BL-NNN` item and list requirement IDs, assumptions, schema/API/UI/security impact, tests, and rollback before editing.
- Preserve user changes and assignment quality. No unused/generated-looking code, debug output, placeholder implementation, hardcoded credentials/URLs, or `Co-authored-by: Cursor <cursoragent@cursor.com>` trailer.
- Do not change schema, migrations, dependencies, environment, or deployment config outside the backlog scope and required human checkpoint. Do not call live Stripe/Cloudinary or deploy without explicit authorization.
- A task is done only when its acceptance criteria and relevant `docs/clineteube-upgrade/28-definition-of-done.md` checks pass, CI is green, docs/OpenAPI/traceability are updated, rollback is credible, and human checkpoints approve.
```

## Adoption note

Testing commands are intentionally honest about the current manifests: neither package currently defines test/typecheck/format scripts. Phase 1 must choose and add them before this proposed guide can name final commands. Deployment commands/settings remain governed by docs 23–24 and ADR-018 rather than being casually run from an implementation task.

