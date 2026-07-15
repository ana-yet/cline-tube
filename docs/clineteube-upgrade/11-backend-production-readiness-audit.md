# CineTube Backend and Production-Readiness Audit

> **Discovery date:** 2026-07-13  
> **Branch:** `main`  
> **Reference docs:** `00-project-baseline.md` through `10-frontend-page-and-component-map.md`

---

## 1. Executive Summary

CineTube's backend is a cleanly layered Express 4 + TypeScript API with 10 controllers, 9 services, 10 route files, and 7 middleware modules. The architecture follows a consistent route → middleware → validation → controller → service → Prisma pattern. Centralized error handling exists and is consistently used via `try/catch` + `next(error)` in every controller. Response shapes are consistent through `sendSuccess`/`sendError` helpers. Environment variables are Zod-validated at startup. Graceful shutdown handles SIGTERM/SIGINT. However: zero tests exist, no CI/CD pipeline exists, no API documentation exists, production logging contains password reset tokens, rate limiters use in-memory storage (not multi-instance safe), `trust proxy` is not configured for Render, and the backend lint script references ESLint without ESLint being in dependencies.

---

## 2. Backend Architecture

### Dependency Map
```
Route (routes/*.ts)
  → Middleware (middlewares/auth.ts, authorize.ts, rateLimiter.ts, validate.ts, upload.ts)
    → Validation (validations/*.ts — Zod schemas)
      → Controller (controllers/*.ts — parse request, call service, format response)
        → Service (services/*.ts — business logic, Prisma queries, external APIs)
          → Prisma Client (config/prisma.ts)
          → Cloudinary (services/cloudinary.service.ts)
          → Stripe (services/payment.service.ts)
```

### Classification: **Clean layered structure**
- Controllers do NOT contain business logic — they delegate to services ✅
- Services do NOT use Express request/response objects ✅
- Routes do NOT call Prisma directly ✅
- Controllers do NOT call Prisma directly ✅
- No circular imports found ✅
- Domain boundaries are clear (auth, media, review, comment, watchlist, profile, payment, admin, upload, cloudinary) ✅

Evidence: All controller files import from services, all services import from prisma/config.

---

## 3. Controller Inventory

| Controller | Route Group | Service Dependency | Direct DB/Provider | Main Risk | Status |
|---|---|---|---|---|---|
| `auth.controller.ts` | `/api/auth` | `auth.service` | None | None | Clean |
| `media.controller.ts` | `/api/media` | `media.service`, `cloudinary.service` | None | None | Clean |
| `review.controller.ts` | `/api/reviews` | `review.service` | None | None | Clean |
| `comment.controller.ts` | `/api/reviews/:id/comments` | `comment.service` | None | None | Clean |
| `watchlist.controller.ts` | `/api/watchlist` | `watchlist.service` | None | None | Clean |
| `profile.controller.ts` | `/api/profile` | `profile.service` | None | None | Clean |
| `payment.controller.ts` | `/api/payments` | `payment.service` | None | Manual plan validation | Partial |
| `stripe-webhook.controller.ts` | `/api/webhooks` | `payment.service` | None | None | Clean |
| `upload.controller.ts` | `/api/upload` | `cloudinary.service` | None | None | Clean |
| `admin.controller.ts` | `/api/admin` | `admin.service` | None | None | Clean |

**Total: 10 controllers.** All follow `try/catch → next(error)` pattern consistently. None contain business logic or direct Prisma access.

---

## 4. Service Inventory

| Service | Domain | Prisma Models | External Providers | Transactions | Size | Status |
|---|---|---|---|---|---|---|
| `auth.service.ts` | Authentication | User, RefreshToken, PasswordResetToken | None | 1 (password reset) | ~400 lines | Clean |
| `media.service.ts` | Media CRUD | Media, Genre, MediaGenre | Cloudinary (delete) | 1 (genre update) | ~350 lines | Clean |
| `review.service.ts` | Reviews | Review, Media, ReviewLike | None | 4 (delete, edit, approve, reject) | ~500 lines | Clean |
| `comment.service.ts` | Comments | Comment, Review | None | None | ~80 lines | Clean |
| `watchlist.service.ts` | Watchlists | Watchlist, Media | None | None | ~60 lines | Clean |
| `profile.service.ts` | User profiles | User, UserProfile | None | None | ~80 lines | Clean |
| `payment.service.ts` | Payments/subscriptions | Subscription, Transaction | Stripe | 3 (webhook handlers) | ~500 lines | Clean |
| `admin.service.ts` | Dashboard KPIs | User, Media, Review, Watchlist | None | None | ~30 lines | Clean |
| `cloudinary.service.ts` | Image storage | None | Cloudinary | None | ~70 lines | Clean |

**Total: 9 services.** All return data to controllers. None use Express objects. Services are cohesive by domain.

---

## 5. Route Modularity

| Route File | Base Path | Naming | REST Convention | Status |
|---|---|---|---|---|
| `auth.routes.ts` | `/api/auth` | Plural (auth actions) | Mixed (RPC-style actions) | Partial |
| `media.routes.ts` | `/api/media` | Plural | REST + RPC (`/by-id/:id`, `/:slug/stream`, `/:slug/view`) | Partial |
| `review.routes.ts` | `/api/reviews` | Plural | REST + nested (`/media/:slug`, `/:id/comments`, `/:id/like`) | Partial |
| `watchlist.routes.ts` | `/api/watchlist` | Singular | REST | Clean |
| `profile.routes.ts` | `/api/profile` | Singular | REST | Clean |
| `admin.routes.ts` | `/api/admin` | Singular | RPC (`/dashboard`) | Partial |
| `payment.routes.ts` | `/api/payments` | Plural | RPC (`/checkout`, `/subscription`, `/cancel`) | Partial |
| `upload.routes.ts` | `/api/upload` | Singular | RPC (`/image`) | Partial |
| `webhook.routes.ts` | `/api/webhooks` | Plural | RPC (`/stripe`) | Clean |

### Issues
- No API versioning (e.g., `/api/v1/`)
- Inconsistent singular/plural naming (`/watchlist` vs `/payments`)
- Action-based endpoints mixed with REST (`/checkout`, `/cancel`, `/approve`, `/reject`)
- `media.routes.ts` has `POST /:slug/view` with no auth — view count inflation possible
- All routes are mounted and none appear unused

---

## 6. Validation Coverage

### Endpoint Group Validation Matrix

| Endpoint Group | Body | Query | Params | Files | Source | Status |
|---|---|---|---|---|---|---|
| Auth (register, login, forgot, reset) | ✅ Zod schemas | — | — | — | `auth.validation.ts` | Fully validated |
| Auth (logout, refresh, me) | ❌ None | — | — | — | Manual | Partially validated |
| Media list | — | ✅ `mediaQuerySchema` | — | — | `media.validation.ts` | Fully validated |
| Media detail | — | — | ✅ (slug — no validation) | — | — | Unvalidated params |
| Media create | ✅ `createMediaSchema` | — | — | ✅ Multer | `media.validation.ts` | Fully validated |
| Media update | ✅ `updateMediaSchema` | — | ✅ (id — no validation) | ✅ Multer | `media.validation.ts` | Partially validated |
| Media delete | — | — | ✅ (id — no validation) | — | — | Unvalidated params |
| Media by-id | — | — | ✅ (id — no validation) | — | — | Unvalidated params |
| Reviews by media | — | ✅ `reviewQuerySchema` | ✅ (slug — no validation) | — | `review.validation.ts` | Partially validated |
| Review create | ✅ `createReviewSchema` | — | — | — | `review.validation.ts` | Fully validated |
| Review update | ✅ `updateReviewSchema` | — | ✅ (id — no validation) | — | `review.validation.ts` | Partially validated |
| Review delete | — | — | ✅ (id — no validation) | — | — | Unvalidated params |
| Review like | — | — | ✅ (id — no validation) | — | — | Unvalidated params |
| Review approve/reject | — | — | ✅ (id — no validation) | — | — | Unvalidated params |
| Comments list | — | — | ✅ (id — no validation) | — | — | Unvalidated params |
| Comment create | ✅ `createCommentSchema` | — | ✅ (id — no validation) | — | `comment.validation.ts` | Partially validated |
| Comment delete | — | — | ✅ (id, commentId — no validation) | — | — | Unvalidated params |
| Watchlist add | ❌ Manual check in controller | — | — | — | Manual | Manually validated |
| Watchlist remove | — | — | ✅ (mediaId — no validation) | — | — | Unvalidated params |
| Watchlist list | — | — | — | — | — | N/A |
| Profile get | — | — | — | — | — | N/A |
| Profile update | ✅ Zod inline | — | — | — | `profile.routes.ts` | Fully validated |
| Payment checkout | ❌ Manual check | — | — | — | Manual | Manually validated |
| Payment subscription | — | — | — | — | — | N/A |
| Payment cancel | ❌ None | — | — | — | — | Unvalidated |
| Upload image | — | — | — | ✅ Multer | — | Partially validated |
| Upload delete | — | — | ✅ (publicId — no validation) | — | — | Unvalidated params |
| Admin dashboard | — | — | — | — | — | N/A |
| Webhook stripe | — | — | — | — | Signature | Signature verified |

### Summary
- **Fully validated:** 7 endpoint groups (auth body, media list query, media create/update body, review create/update body, comment create body, profile update body)
- **Partially validated:** 8 endpoint groups (body validated but params not)
- **Unvalidated:** 10 endpoint groups (no validation at all)
- **Path parameter UUID validation:** **Missing everywhere** — no `z.string().uuid()` on any route param

---

## 7. Error Architecture

### Custom Error Class (`backend/src/utils/errors.ts`)
```
ApiError(statusCode, message, errorCode, details?)
```

### Centralized Error Handler (`backend/src/middlewares/errorHandler.ts`)
| Error Type | HTTP Status | Response Shape |
|---|---|---|
| `ApiError` | `err.statusCode` | `{ success, error: { message, code, details? } }` |
| `ZodError` | 400 | `{ success, error: { message: "Validation failed", code: "VALIDATION_ERROR", details: [{field, message}] } }` |
| Prisma P2002 (unique) | 409 | `{ success, error: { message: "A record with this ${target} already exists", code: "DUPLICATE_ENTRY" } }` |
| Prisma P2025 (not found) | 404 | `{ success, error: { message: "Record not found", code: "NOT_FOUND" } }` |
| Prisma P2003 (FK) | 400 | `{ success, error: { message: "Referenced record does not exist", code: "REFERENCE_ERROR" } }` |
| `TokenExpiredError` | 401 | `{ success, error: { message: "Token expired", code: "TOKEN_EXPIRED" } }` |
| `JsonWebTokenError` | 401 | `{ success, error: { message: "Invalid token", code: "INVALID_TOKEN" } }` |
| Unknown | 500 | Production: generic message. Dev: `err.message` |

### Key Findings
- ✅ All controllers use `try/catch → next(error)` — centralized handler catches all
- ✅ `requestId` included in error logs
- ✅ Stack traces hidden in production responses
- ⚠️ Stack traces logged to console in production (via `console.error`)
- ⚠️ Prisma P2002 leaks field name in `err.meta?.target`
- ❌ No async wrapper — every controller manually wraps in try/catch
- ❌ Stripe errors not specifically handled (fall through to unknown 500)
- ❌ Cloudinary errors not specifically handled

---

## 8. Response Consistency

### Success Shape
```json
{ "success": true, "data": { ... }, "meta": { "page", "limit", "total", "totalPages" } }
```
✅ Consistent across all controllers via `sendSuccess`.

### Error Shape
```json
{ "success": false, "error": { "message": "...", "code": "...", "details": [...] } }
```
✅ Consistent across centralized handler.

### Inconsistencies
- `sendSuccess` does NOT include `requestId` in responses
- `sendError` helper exists but is unused — all errors go through centralized handler
- Webhook returns `{ received: true }` (different shape) — acceptable for Stripe

---

## 9. Upload and Cloudinary Security

| Control | Status | Evidence |
|---|---|---|
| Transport | Multer memory storage | `upload.ts` |
| MIME types | Whitelist: JPEG, JPG, PNG, WebP | `upload.ts: ALLOWED_MIME_TYPES` |
| File size | 5MB max | `upload.ts: MAX_FILE_SIZE` |
| File count | 2 files max (image + backdropImage) | `upload.ts: fields([...])` |
| Extension validation | ❌ Not checked — MIME only | `upload.ts` |
| SVG rejected | ✅ Not in whitelist | — |
| Executable rejection | ✅ Not in whitelist | — |
| Uploads admin-only | ✅ `authorize({ roles: ["ADMIN"] })` | `upload.routes.ts`, `media.routes.ts` |
| Cloudinary folder | `cinetube/media` | `cloudinary.service.ts` |
| Public ID generation | Cloudinary auto-generated | `cloudinary.service.ts` |
| Transformations | `quality: "auto", fetch_format: "auto"` | `cloudinary.service.ts` |
| Old image cleanup | ✅ On media update | `media.controller.ts` |
| Orphan risk | ⚠️ Fire-and-forget delete — errors caught silently | `cloudinary.service.ts: deleteImage` |
| Memory pressure | ⚠️ Entire file buffered in memory (5MB max) | `multer.memoryStorage()` |
| Public ID manipulation | ⚠️ `DELETE /upload/:publicId(*)` accepts any path | `upload.routes.ts` |

---

## 10. Security Middleware

| Middleware | Status | Evidence |
|---|---|---|
| Helmet | ✅ Default configuration | `app.ts: helmet()` |
| CORS | ✅ Single origin, credentials | `config/cors.ts` |
| Global rate limit | ✅ 500/15min prod, skipped in dev | `rateLimiter.ts` |
| Auth rate limit | ✅ 10/15min prod | `rateLimiter.ts` |
| Compression | ✅ `compression()` | `app.ts` |
| JSON limits | ✅ 10MB | `app.ts: express.json({ limit: "10mb" })` |
| Cookie parsing | ✅ `cookieParser()` | `app.ts` |
| Request IDs | ✅ UUID per request | `middlewares/requestId.ts` |
| Morgan | ✅ Combined in prod, dev in dev | `app.ts` |
| **Trust proxy** | ❌ **Not configured** | No `app.set("trust proxy", ...)` |
| Content Security Policy | ❌ Not configured (Helmet defaults) | `app.ts` |
| HSTS | ⚠️ Helmet default (may not include if not HTTPS) | — |
| Health endpoint rate-limited | ⚠️ Yes — `apiLimiter` applies before health check | `app.ts` ordering |
| Webhook rate-limited | ❌ No — mounted before `apiLimiter` | `app.ts` — correct |
| Stripe raw body | ✅ Mounted before `express.json()` | `app.ts` |

---

## 11. Logging and Observability

### Console Output Inventory

| Location | Type | Content | Sensitive? | Evidence |
|---|---|---|---|---|
| `server.ts:9` | `console.log` | "Database connected" | No | Confirmed |
| `server.ts:12-14` | `console.log` | Server URL, env, API base | No | Confirmed |
| `server.ts:17` | `console.error` | Startup failure | No | Confirmed |
| `server.ts:25` | `console.log` | Shutdown signal | No | Confirmed |
| `errorHandler.ts:15` | `console.error` | Method, path, message, requestId, stack (dev only) | ⚠️ Error messages | Confirmed |
| `env.ts:42-43` | `console.error` | Invalid env var errors | No | Confirmed |
| `auth.service.ts:349` | `console.log` | **Password reset token** | ❌ **YES** | Confirmed |
| `payment.service.ts:228` | `console.warn` | Missing webhook metadata | No | Confirmed |
| `payment.service.ts:269` | `console.log` | Subscription activated (userId, plan, subscriptionId) | ⚠️ IDs | Confirmed |
| `payment.service.ts:315` | `console.log` | Subscription renewed (userId, invoiceId) | ⚠️ IDs | Confirmed |
| `payment.service.ts:337` | `console.log` | Subscription past due (userId, invoiceId) | ⚠️ IDs | Confirmed |
| `stripe-webhook.controller.ts:28` | `console.log` | Webhook event type | No | Confirmed |
| `stripe-webhook.controller.ts:35` | `console.error` | Webhook error message | ⚠️ May leak Stripe details | Confirmed |
| `cloudinary.service.ts:67` | `console.warn` | Failed Cloudinary delete (publicId) | ⚠️ Public ID | Confirmed |

### Key Findings
- ❌ **Password reset token logged to console in production** — `auth.service.ts:349`
- ❌ No structured logging (all `console.log/error/warn`)
- ❌ No log levels
- ❌ No Sentry or monitoring integration
- ❌ No JSON logging
- ⚠️ Request IDs logged in error handler but not in other logs
- ❌ No health check verifying database connectivity (returns static JSON)
- ❌ No readiness/liveness probes
- ✅ Graceful shutdown exists

---

## 12. Server Lifecycle and Graceful Shutdown

| Aspect | Status | Evidence |
|---|---|---|
| Environment validation | ✅ Zod at startup, exits on failure | `config/env.ts` |
| Prisma connection | ✅ `prisma.$connect()` before listen | `server.ts` |
| Server listen | ✅ After DB connect | `server.ts` |
| Startup failure | ✅ Disconnect Prisma, `process.exit(1)` | `server.ts` |
| SIGTERM | ✅ Disconnect Prisma, `process.exit(0)` | `server.ts` |
| SIGINT | ✅ Same | `server.ts` |
| HTTP server close | ❌ **Not called** — `process.exit(0)` without `server.close()` | `server.ts` |
| In-flight request handling | ❌ Not handled — immediate exit | `server.ts` |
| Uncaught exceptions | ❌ No handler | — |
| Unhandled rejections | ❌ No handler | — |

**Render compatibility:** Partial — SIGTERM handled but in-flight requests may be dropped.

---

## 13. Performance Findings

| Area | Finding | Risk | Evidence |
|---|---|---|---|
| Pagination defaults | `page: 1, limit: varies` (12 for browse, 20 for admin) | Low | Services |
| Maximum page size | ❌ No cap — client can request `limit=10000` | Medium | No validation |
| Unbounded lists | ❌ Watchlist returns all items without pagination | Medium | `watchlist.service.ts` |
| Media listing | Single query with `include` for genres | Low | `media.service.ts` |
| Reviews by media | Two queries (findMany + count) with `Promise.all` | Low | `review.service.ts` |
| Dashboard KPIs | 7 queries in `Promise.all` | Low | `admin.service.ts` |
| Revenue stats | 5 queries in `Promise.all` | Low | `payment.service.ts` |
| N+1 risk | Low — Prisma `include` used instead of loops | Low | — |
| In-memory view dedup | `Map<string, number>` with 1-hour cooldown | Medium | `media.service.ts` |
| Search | `contains` with `insensitive` mode | Low | `media.service.ts` |
| Caching | ❌ None | — | — |
| Compression | ✅ `compression()` middleware | — | `app.ts` |

---

## 14. Scalability Characteristics

| Aspect | Status | Evidence |
|---|---|---|
| Stateless between requests | ⚠️ Mostly — in-memory view Map | `media.service.ts` |
| Horizontally scalable | ❌ Blocked by in-memory state | — |
| In-memory rate limiter | ❌ Not shared across instances | `rateLimiter.ts` |
| In-memory view dedup | ❌ Not shared | `media.service.ts` |
| Module-level access token | N/A (backend) | — |
| Local disk | ✅ None used | — |
| Safe for multiple instances | ❌ No | — |
| Background jobs | ❌ None | — |
| Queue | ❌ None | — |
| Reconciliation | ❌ None | — |

---

## 15. Environment Configuration

### Variable Matrix

| Variable | Layer | Required | Validated | Secret | Documented | Status |
|---|---|---|---|---|---|---|
| `DATABASE_URL` | Backend | ✅ | ✅ Zod URL | ✅ | ✅ `.env.example` | Complete |
| `JWT_SECRET` | Backend | ✅ | ✅ min 32 chars | ✅ | ✅ `.env.example` | Complete |
| `JWT_REFRESH_SECRET` | Backend | ✅ | ✅ min 32 chars | ✅ | ✅ `.env.example` | Complete |
| `JWT_ACCESS_EXPIRY` | Backend | ❌ Optional | ✅ Zod default "15m" | ❌ | ✅ `.env.example` | Complete |
| `JWT_REFRESH_EXPIRY` | Backend | ❌ Optional | ✅ Zod default "7d" | ❌ | ✅ `.env.example` | Complete |
| `STRIPE_SECRET_KEY` | Backend | ✅ | ✅ min 1 char | ✅ | ✅ `.env.example` | Complete |
| `STRIPE_WEBHOOK_SECRET` | Backend | ✅ | ✅ min 1 char | ✅ | ✅ `.env.example` | Complete |
| `FRONTEND_URL` | Backend | ✅ | ✅ Zod URL | ❌ | ✅ `.env.example` | Complete |
| `PORT` | Backend | ❌ Optional | ✅ Zod default 5000 | ❌ | ✅ `.env.example` | Complete |
| `NODE_ENV` | Backend | ❌ Optional | ✅ Zod enum | ❌ | ✅ `.env.example` | Complete |
| `CLOUDINARY_CLOUD_NAME` | Backend | ✅ | ✅ min 1 char | ✅ | ✅ `.env.example` | Complete |
| `CLOUDINARY_API_KEY` | Backend | ✅ | ✅ min 1 char | ✅ | ✅ `.env.example` | Complete |
| `CLOUDINARY_API_SECRET` | Backend | ✅ | ✅ min 1 char | ✅ | ✅ `.env.example` | Complete |
| `NEXT_PUBLIC_API_URL` | Frontend | ❌ Optional | ✅ Zod URL, default localhost | ❌ | ❌ No `.env.example` | Partial |

### Key Findings
- ✅ All backend env vars validated by Zod at startup
- ⚠️ `FRONTEND_URL` is a single value — only one origin supported
- ⚠️ `NEXT_PUBLIC_API_URL` defaults to `http://localhost:5000/api` — could leak to production if not set
- ❌ No frontend `.env.example` file
- ✅ `.gitignore` excludes `.env` files

---

## 16. TypeScript Quality

### Backend Configuration
| Setting | Value | Evidence |
|---|---|---|
| `strict` | `true` | `tsconfig.json` |
| `noImplicitAny` | ✅ (via strict) | — |
| `strictNullChecks` | ✅ (via strict) | — |
| Target | ES2020 | `tsconfig.json` |
| Module | Node16 | `tsconfig.json` |
| Source maps | ✅ | `tsconfig.json` |
| Declaration | ✅ | `tsconfig.json` |

### Type Safety Search
- `as any`: **0 occurrences** ✅
- `@ts-ignore`: **0 occurrences** ✅
- `@ts-expect-error`: **0 occurrences** ✅
- `eslint-disable`: **0 occurrences** ✅

### Express Augmentation
`backend/src/types/express.d.ts` extends `Request` with `user?: AuthUser` and `requestId?: string`.

### Type Drift Risk
Frontend and backend define types independently:
- Frontend: `frontend/src/types/index.ts` (manual TypeScript interfaces)
- Backend: `backend/src/types/index.ts` (manual TypeScript interfaces) + Prisma generated types
- **Risk:** Frontend `Media`, `User`, `Review` types can drift from backend Prisma models.

---

## 17. Linting and Formatting

### Frontend
| Tool | Status | Evidence |
|---|---|---|
| ESLint | ✅ Configured | `frontend/eslint.config.mjs` |
| Config | `eslint-config-next/core-web-vitals` + `typescript` | Same |
| Lint command | `npm run lint` → `eslint` | `frontend/package.json` |

### Backend
| Tool | Status | Evidence |
|---|---|---|
| ESLint | ❌ **Not in dependencies** | `backend/package.json` — no `eslint` in devDependencies |
| Lint script | `eslint src/ --ext .ts` | `backend/package.json` — will fail without ESLint installed |
| Prettier | ❌ Not configured | No `.prettierrc` found |
| EditorConfig | ❌ Not found | — |
| Git hooks | ❌ Not found | No `.husky/`, no `lint-staged` |
| Pre-commit checks | ❌ None | — |

---

## 18. Testing Inventory

### Search Results
- `*.test.*`: **0 files**
- `*.spec.*`: **0 files**
- `__tests__/`: **Not found**
- `jest`: Not in dependencies
- `vitest`: Not in dependencies
- `supertest`: Not in dependencies
- `playwright`: Not in dependencies
- `cypress`: Not in dependencies
- `testing-library`: Not in dependencies

**No tests exist.** Zero unit, integration, API, E2E, or accessibility tests.

---

## 19. Critical Test Gaps

| Workflow | Unit | Integration | E2E | Risk |
|---|---|---|---|---|
| Registration | ❌ | ❌ | ❌ | High |
| Login | ❌ | ❌ | ❌ | High |
| Refresh rotation | ❌ | ❌ | ❌ | High |
| Logout | ❌ | ❌ | ❌ | High |
| Password reset | ❌ | ❌ | ❌ | High |
| Role authorization | ❌ | ❌ | ❌ | High |
| Media CRUD | ❌ | ❌ | ❌ | High |
| Media listing filters | ❌ | ❌ | ❌ | Medium |
| Reviews | ❌ | ❌ | ❌ | High |
| Comments | ❌ | ❌ | ❌ | Medium |
| Watchlists | ❌ | ❌ | ❌ | Medium |
| Premium access | ❌ | ❌ | ❌ | High |
| Stripe checkout | ❌ | ❌ | ❌ | High |
| Stripe webhooks | ❌ | ❌ | ❌ | High |
| Cancellation | ❌ | ❌ | ❌ | High |
| File upload | ❌ | ❌ | ❌ | Medium |
| Admin dashboard | ❌ | ❌ | ❌ | Medium |

---

## 20. Build Configuration

### Backend Scripts
| Script | Command | Purpose | Evidence |
|---|---|---|---|
| `dev` | `ts-node-dev --respawn --transpile-only src/server.ts` | Development | `package.json` |
| `build` | `tsc` | TypeScript compilation | `package.json` |
| `build:render` | `prisma generate --schema=../prisma/schema.prisma && tsc` | Render build | `package.json` |
| `start` | `node dist/server.js` | Production | `package.json` |
| `prisma:generate` | `prisma generate --schema=../prisma/schema.prisma` | Generate client | `package.json` |
| `prisma:migrate` | `prisma migrate dev --schema=../prisma/schema.prisma` | Run migrations | `package.json` |
| `prisma:seed` | `ts-node --transpile-only prisma/seed.ts` | Seed database | `package.json` |
| `lint` | `eslint src/ --ext .ts` | Lint | `package.json` |

### Key Findings
- ✅ Render build generates Prisma client before compilation
- ❌ Migrations NOT automatically applied during deployment
- ❌ `build:render` not used in `render.yaml` — uses `npm run build` instead
- ⚠️ `render.yaml` build: `npm install --include=dev && npx prisma generate --schema=../prisma/schema.prisma && npm run build`
- ✅ Source maps produced (`declarationMap: true, sourceMap: true`)
- ❌ Builds do not remove console logs

---

## 21. Deployment Configuration

### Backend (Render)
| Property | Value | Evidence |
|---|---|---|
| Service type | `web` | `render.yaml` |
| Runtime | `node` | `render.yaml` |
| Root directory | `backend` | `render.yaml` |
| Build command | `npm install --include=dev && npx prisma generate --schema=../prisma/schema.prisma && npm run build` | `render.yaml` |
| Start command | `node dist/server.js` | `render.yaml` |
| Health check | `/api/health` | `render.yaml` |
| NODE_ENV | `production` (hardcoded) | `render.yaml` |
| Env vars | 10 (sync: false — manual in Render dashboard) | `render.yaml` |

### Frontend (Vercel)
| Property | Value | Evidence |
|---|---|---|
| Framework | `nextjs` | `vercel.json` |
| Build command | `npm run build` | `vercel.json` |
| Install command | `npm install` | `vercel.json` |
| Root directory | `frontend` | README instructions |

### Key Findings
- ❌ Migrations not in build or start command — must be run manually
- ❌ No rollback instructions in README
- ❌ No database rollback guidance
- ⚠️ Health check returns static JSON — does not verify DB connectivity
- ⚠️ `trust proxy` not configured — rate limiter may not see real client IP on Render
- ⚠️ Vercel preview deployments may not match `FRONTEND_URL` in CORS

---

## 22. CI/CD Readiness

### Pipeline Status: **None**
- No `.github/workflows/` directory
- No CI configuration files
- No automated lint, type-check, test, or build verification
- No branch protection evidence
- No pull-request checks
- No dependency audit
- No security scanning

### What Currently Relies on Manual Execution
- Linting (backend lint broken — no ESLint dependency)
- Type checking (`tsc` — runs as part of build)
- Testing (none exist)
- Migration application (manual)
- Deployment (Render/Vercel auto-deploy on push)

---

## 23. Dependency Findings

### Backend Dependencies
| Package | Purpose | Status |
|---|---|---|
| `@prisma/client` | ORM | ✅ Used |
| `bcrypt` | Password hashing | ✅ Used |
| `cloudinary` | Image storage | ✅ Used |
| `compression` | Gzip | ✅ Used |
| `cookie-parser` | Cookie parsing | ✅ Used |
| `cors` | CORS | ✅ Used |
| `dotenv` | Env loading | ✅ Used |
| `express` | HTTP framework | ✅ Used |
| `express-rate-limit` | Rate limiting | ✅ Used |
| `helmet` | Security headers | ✅ Used |
| `jsonwebtoken` | JWT | ✅ Used |
| `morgan` | HTTP logging | ✅ Used |
| `multer` | File uploads | ✅ Used |
| `stripe` | Payments | ✅ Used |
| `uuid` | UUID generation | ✅ Used |
| `zod` | Validation | ✅ Used |

### Missing Dependencies
| Package | Expected | Evidence |
|---|---|---|
| `eslint` | Backend lint script | `package.json` scripts reference it but not in devDependencies |
| `@eslint/js` or similar | Backend ESLint config | Not found |

### Unused Schema Elements
- `Account` model — no OAuth library installed
- `ReviewReport` model — no report creation API

---

## 24. API Documentation

### Status: **Not implemented**
- No OpenAPI/Swagger specification
- No Postman/Insomnia collection
- No API markdown documentation
- No response schema documentation
- No error-code documentation
- Route files contain JSDoc-style comments describing endpoints

---

## 25. README and Developer Onboarding

### README (`README.md`) covers:
| Topic | Status |
|---|---|
| Product purpose | ✅ Brief |
| Stack | ✅ Listed |
| Requirements | ❌ Not specified |
| Installation | ✅ `npm install` + Prisma commands |
| Environment variables | ⚠️ References `.env.example` but doesn't list them |
| Prisma generate | ✅ |
| Migrations | ✅ `prisma migrate` |
| Seed | ✅ `prisma seed` |
| Backend startup | ✅ `npm run dev` |
| Frontend startup | ✅ `npm run dev` |
| Stripe webhook setup | ✅ `stripe listen` command |
| Cloudinary setup | ❌ Not documented |
| Demo accounts | ✅ Admin email/password documented |
| Deployment | ✅ Vercel + Render instructions |
| Testing | ❌ Not mentioned |
| Troubleshooting | ❌ Not present |

### AGENTS.md
Contains learned preferences and workspace facts. Not a developer onboarding document.

---

## 26. Gladiator Backend Compliance Matrix

### Backend Architecture

| Requirement | Status | Evidence |
|---|---|---|
| Express | ✅ | `backend/package.json` |
| Required modular structure | ✅ Functionally equivalent | `routes/`, `controllers/`, `services/`, `middlewares/`, `config/`, `validations/`, `utils/`, `types/` |
| API route separation | ✅ | 10 route files by domain |
| Centralized error handling | ✅ | `middlewares/errorHandler.ts` |
| Proper status codes | ✅ | 200, 201, 400, 401, 403, 404, 409, 500 |

### Database

| Requirement | Status | Evidence |
|---|---|---|
| Schema | ✅ | `prisma/schema.prisma` — 15 models |
| Relationships | ✅ | Foreign keys with cascade |
| Constraints | ✅ | Unique, composite unique, indexes |
| Validation | ✅ | Zod schemas |
| Contact-form storage | ❌ | No contact form |
| Dynamic data | ✅ | All content from database |

### Security

| Requirement | Status | Evidence |
|---|---|---|
| Password hashing | ✅ bcrypt(12) | `auth.service.ts` |
| Input validation | ✅ Zod | `validations/` |
| CORS | ✅ | `config/cors.ts` |
| Role access control | ✅ | `middlewares/authorize.ts` |
| JWT expiration | ✅ 15m access, 7d refresh | `config/env.ts` |
| Protected routes | ✅ | `middlewares/auth.ts` |
| File security | ✅ MIME whitelist, 5MB limit | `middlewares/upload.ts` |
| Rate limiting | ✅ | `middlewares/rateLimiter.ts` |

### Performance

| Requirement | Status | Evidence |
|---|---|---|
| Image optimization | ✅ Cloudinary auto-quality | `cloudinary.service.ts` |
| Lazy loading | N/A (backend) | — |
| Code splitting | N/A (backend) | — |
| Production build | ✅ `tsc` | `package.json` |

### Code Quality

| Requirement | Status | Evidence |
|---|---|---|
| Organized structure | ✅ | Clean layered architecture |
| Reusable components | ✅ | Shared utils, middleware, validation |
| Environment variables | ✅ | Zod-validated |
| No production console logs | ❌ | Reset tokens and webhook events logged |
| Meaningful commit readiness | ⚠️ | No pre-commit hooks |

### Deployment

| Requirement | Status | Evidence |
|---|---|---|
| Frontend deployment config | ✅ | `vercel.json` |
| Backend deployment config | ✅ | `render.yaml` |
| Production env vars | ✅ | `render.yaml` lists all |
| No localhost production refs | ✅ | `FRONTEND_URL` from env |
| Working health check | ⚠️ | Static JSON — no DB check |
| Migration process | ⚠️ | Manual — not in build |
| Rollback process | ❌ | Not documented |

---

## 27. Production Blockers

### P0 — Release Blocking

| ID | Finding | Impact | Evidence |
|---|---|---|---|
| P0-1 | Password reset token logged to console in production | Token exposure in logs | `auth.service.ts:349` |
| P0-2 | `trust proxy` not configured — rate limiter may not see real client IP on Render | Rate limiting ineffective behind proxy | `app.ts` — no `trust proxy` |
| P0-3 | No path parameter UUID validation — malformed IDs reach Prisma | Potential 500 errors from Prisma | All route files |

### P1 — Must Fix Before Final Submission

| ID | Finding | Impact | Evidence |
|---|---|---|---|
| P1-1 | Zero tests | No quality verification | No test files |
| P1-2 | No CI/CD pipeline | No automated quality gates | No `.github/` |
| P1-3 | Backend lint script broken — ESLint not in dependencies | `npm run lint` fails | `package.json` |
| P1-4 | No API documentation | Developer onboarding gap | No OpenAPI/Swagger |
| P1-5 | No page size limit on list endpoints | Client can request `limit=10000` | No validation |
| P1-6 | Prisma migrations not auto-applied in deployment | Manual step required | `render.yaml` |
| P1-7 | Initial payment double-counted in revenue | Financial reporting incorrect | `payment.service.ts` |
| P1-8 | No rollback documentation | Deployment risk | README |
| P1-9 | Health check doesn't verify DB | False healthy status | `app.ts` — static JSON |
| P1-10 | Missing required Gladiator pages (About, Contact, etc.) | Feature gap | Previous docs |

### P2 — Important Hardening

| ID | Finding | Impact | Evidence |
|---|---|---|---|
| P2-1 | In-memory rate limiter not multi-instance safe | Scaling blocker | `rateLimiter.ts` |
| P2-2 | In-memory view dedup not multi-instance safe | View count inconsistency | `media.service.ts` |
| P2-3 | No structured logging | Observability gap | All console.log usage |
| P2-4 | No Sentry/monitoring | Error tracking gap | — |
| P2-5 | Prisma unique constraint errors leak field names | Minor info disclosure | `errorHandler.ts` |
| P2-6 | No uncaught exception/rejection handlers | Silent crashes possible | `server.ts` |
| P2-7 | HTTP server not closed before process exit | In-flight requests dropped | `server.ts` |
| P2-8 | Frontend/backend type definitions can drift | Maintenance risk | Separate type files |
| P2-9 | No CORS support for Vercel preview deployments | Preview deploys broken | `config/cors.ts` |
| P2-10 | No connection pooling configuration | Database performance | `config/prisma.ts` |

---

## 28. Confirmed Backend Strengths

1. ✅ Clean layered architecture (route → controller → service → Prisma)
2. ✅ Consistent error handling via centralized handler
3. ✅ Consistent response shapes via `sendSuccess`/`sendError`
4. ✅ Zod-validated environment variables at startup
5. ✅ Graceful shutdown (SIGTERM/SIGINT)
6. ✅ Request ID tracking
7. ✅ JWT re-verification from database on every request
8. ✅ Refresh token rotation with hashed storage
9. ✅ Stripe webhook signature verification
10. ✅ Multer file-type whitelist + size limits
11. ✅ No `any` types or `@ts-ignore` in codebase
12. ✅ Strict TypeScript configuration
13. ✅ All controllers delegate to services (no business logic in controllers)
14. ✅ Transaction usage for atomic operations
15. ✅ Rate limiting on auth endpoints

---

## 29. Confirmed Backend Gaps

1. ❌ Zero tests
2. ❌ No CI/CD pipeline
3. ❌ No API documentation
4. ❌ Password reset token logged in production
5. ❌ Backend lint script broken (no ESLint dependency)
6. ❌ No `trust proxy` configuration
7. ❌ No path parameter validation
8. ❌ No page size limits
9. ❌ In-memory rate limiter/dedup not scalable
10. ❌ No structured logging or monitoring
11. ❌ No uncaught exception handlers
12. ❌ Prisma migrations not automated in deployment
13. ❌ Health check doesn't verify database
14. ❌ Rollback process not documented
15. ❌ Frontend/backend types can drift independently

---

## 30. Unknowns Requiring Runtime Verification

1. **Does Render set `X-Forwarded-For` correctly?** Without `trust proxy`, Express may not parse it.
2. **Does the health endpoint get rate-limited in production?** `apiLimiter` is applied before health check in middleware order.
3. **What happens when two simultaneous refresh requests use the same token?** Race condition on token deletion.
4. **Does `npm run lint` fail on backend?** ESLint not in dependencies — may be globally installed.
5. **Are Stripe webhook errors logged with sensitive data?** Error message may include Stripe object details.

---

## 31. Recommended Architecture-Pass Inputs

1. **Test infrastructure** — Add Jest/Vitest + Supertest for API testing
2. **Structured logging** — Replace console.log with Winston/Pino
3. **Trust proxy** — Configure for Render reverse proxy
4. **Path parameter validation** — Add UUID validation middleware
5. **Page size limits** — Add max limit validation to query schemas
6. **Shared rate limiter** — Move to Redis-backed store for multi-instance
7. **Health check** — Add database connectivity verification
8. **API documentation** — Add OpenAPI/Swagger specification
9. **CI/CD pipeline** — GitHub Actions for lint, type-check, test, build
10. **Type sharing** — Consider shared types package or OpenAPI codegen
