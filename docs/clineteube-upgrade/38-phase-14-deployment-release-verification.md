# Phase 14 Deployment, Migration, Rollback, and Production Verification

Date: 2026-07-19

## Implemented Scope

- Added Render `preDeployCommand` for a single pre-start `prisma migrate deploy` actor.
- Switched Render health rollout path to `/api/ready` so rollout waits for database readiness.
- Declared production Render environment keys for exact frontend origins, HTTP email delivery, and view-dedup HMAC secret.
- Added Vercel `vercel.json` schema metadata for configuration validation/autocomplete.
- Added backend production fail-fast checks for HTTPS frontend origin, no localhost frontend origin, no Stripe test secret key, and no placeholder webhook secret.
- Added frontend production deploy fail-fast checks for HTTPS Render `/api` base URL and HTTPS site URL.
- Added production-safe smoke script at `scripts/production-smoke.mjs` for frontend pages, API liveness/readiness, and OpenAPI contract.

## Automated Evidence

- `npm run typecheck` in `backend`: passed.
- `npm test` in `backend`: passed, 77 tests across 10 test files.
- `npm run lint` in `backend`: passed.
- `npm run build` in `backend`: passed.
- `npm run typecheck` in `frontend`: passed.
- `npm test` in `frontend`: passed, 25 tests across 5 test files.
- `npm run lint:ci` in `frontend`: passed with 17 warnings under the 40-warning CI cap.
- `npm run build` in `frontend`: passed.

## Production Smoke Command

Run after backend and frontend deployment are promoted:

```bash
FRONTEND_URL=https://<vercel-production-domain> \
API_URL=https://<render-backend-domain>/api \
node scripts/production-smoke.mjs
```

The smoke script only performs safe GET requests and does not trigger billing, provider writes, or authenticated mutations.

## Manual Release Evidence Still Required

- Confirm managed PostgreSQL backup/PITR and restore drill evidence before migration promotion.
- Confirm exactly one migration actor ran `prisma migrate deploy` for the release.
- Verify Vercel production env `NEXT_PUBLIC_API_URL` points to the HTTPS Render `/api` base and never localhost.
- Verify frontend cookie/CORS/CSRF behavior across Vercel and Render.
- Verify Stripe webhook signing secret and event delivery in provider test mode without live charges.
- Verify Cloudinary and email adapters with bounded production-safe checks.
- Record rollback owner, trigger, previous compatible commit, and database compatibility notes.

No destructive migration rollback or live billing charge is part of this phase implementation.
