# Clineteube Project Baseline

> **Discovery date:** 2026-07-13
> **Branch:** `main`
> **Working tree at discovery start:** Clean (no uncommitted changes)

---

## 1. Executive Summary

CineTube is a full-stack movie and series rating portal. Users can browse media, write reviews, manage watchlists, and subscribe to premium tiers for exclusive content. Administrators manage media, reviews, and users through a dedicated dashboard. The backend is an Express REST API backed by PostgreSQL via Prisma. The frontend is a Next.js application using Tailwind CSS and shadcn/ui. Payments are processed through Stripe, and media assets are stored on Cloudinary. Authentication uses in-memory JWT access tokens with HttpOnly refresh-cookie rotation.

---

## 2. Repository Type

| Attribute | Value |
|---|---|
| Structure | **Monorepo** — single Git repository containing `frontend/` and `backend/` directories plus a shared `prisma/` directory at the root |
| Frontend location | `frontend/` |
| Backend location | `backend/` |
| Shared code | `prisma/schema.prisma` (Prisma client output targets `backend/node_modules/.prisma/client`) |
| Public/static assets | `frontend/public/` |
| Documentation | `README.md` at root; `docs/clineteube-upgrade/` (created during this pass) |
| Test directories | **Not Found** — no `__tests__/`, `test/`, `spec/`, or `*.test.*` / `*.spec.*` files exist |
| Deployment files | `render.yaml` at root; `frontend/vercel.json` |

**Evidence:**
- Root listing: `backend/`, `frontend/`, `prisma/`, `render.yaml`, `README.md`
- `prisma/schema.prisma` — generator output path: `../backend/node_modules/.prisma/client`
- `frontend/vercel.json`
- `render.yaml`

---

## 3. Technology Stack

### Frontend

| Category | Technology | Version | Evidence | Confidence |
|---|---|---|---|---|
| Framework | Next.js | 16.2.9 | `frontend/package.json` | Confirmed |
| Language | TypeScript | ^5 | `frontend/package.json` devDependencies | Confirmed |
| React | React | 19.2.4 | `frontend/package.json` | Confirmed |
| Routing system | Next.js App Router (route groups: `(auth)`, `(dashboard)`, `(public)`) | — | `frontend/src/app/` directory structure | Confirmed |
| Styling | Tailwind CSS v4 + `tw-animate-css` | ^4 | `frontend/package.json`, `postcss.config.mjs` | Confirmed |
| UI components | shadcn/ui (base-nova style) + lucide-react icons | shadcn ^4.11.0 | `frontend/components.json`, `frontend/src/components/ui/` | Confirmed |
| Form library | react-hook-form + @hookform/resolvers | ^7.79.0 | `frontend/package.json` | Confirmed |
| Validation | Zod | ^4.4.3 | `frontend/package.json`, `frontend/src/lib/validations.ts` | Confirmed |
| State management | React Context (`AuthProvider`) + TanStack Query | @tanstack/react-query ^5.101.0 | `frontend/src/providers/auth-provider.tsx`, `frontend/package.json` | Confirmed |
| API client | Axios (with interceptors for token refresh) | ^1.18.0 | `frontend/src/lib/api.ts`, `frontend/package.json` | Confirmed |
| Animation | Framer Motion | ^12.40.0 | `frontend/package.json` | Confirmed |
| Image handling | Next.js `<Image>` with Cloudinary remote patterns | — | `frontend/next.config.ts` `images.remotePatterns` | Confirmed |
| Chart libraries | — | — | — | Not Found |
| Testing tools | — | — | — | Not Found |

### Backend

| Category | Technology | Version | Evidence | Confidence |
|---|---|---|---|---|
| Runtime | Node.js | >=20 | `backend/package.json` engines | Confirmed |
| Framework | Express | ^4.21.0 | `backend/package.json` | Confirmed |
| Language | TypeScript | 5.9.3 | `backend/package.json` devDependencies | Confirmed |
| Database | PostgreSQL | — | Prisma schema datasource `provider = "postgresql"` | Confirmed |
| ORM | Prisma | ^5.22.0 | `backend/package.json`, `prisma/schema.prisma` | Confirmed |
| Authentication | JWT (jsonwebtoken) + bcrypt password hashing | jsonwebtoken ^9.0.2, bcrypt ^5.1.1 | `backend/package.json`, `backend/src/middlewares/auth.ts` | Confirmed |
| Validation | Zod | ^3.23.8 | `backend/package.json`, `backend/src/config/env.ts`, `backend/src/validations/` | Confirmed |
| File uploads | Multer + Cloudinary | multer ^2.2.0, cloudinary ^2.10.0 | `backend/package.json`, `backend/src/services/cloudinary.service.ts` | Confirmed |
| Payment provider | Stripe | ^22.2.2 | `backend/package.json`, `backend/src/services/payment.service.ts` | Confirmed |
| Email provider | — | — | — | Not Found |
| Real-time communication | — | — | — | Not Found |
| Logging | Morgan (HTTP request logging) | ^1.10.0 | `backend/package.json`, `backend/src/app.ts` | Confirmed |
| Security | Helmet, CORS, express-rate-limit, compression | — | `backend/package.json`, `backend/src/app.ts` | Confirmed |
| Testing tools | — | — | — | Not Found |

### Infrastructure

| Category | Technology | Evidence | Confidence |
|---|---|---|---|
| Frontend hosting | Vercel | `frontend/vercel.json`, `README.md` deploy instructions | Confirmed |
| Backend hosting | Render | `render.yaml` at root | Confirmed |
| Cloud storage | Cloudinary | `backend/src/services/cloudinary.service.ts`, env vars | Confirmed |
| Docker | — | No Dockerfile found | Not Found |
| CI/CD workflows | — | No `.github/` directory found | Not Found |
| CDN | Cloudinary (serves images) | `frontend/next.config.ts` remotePatterns: `res.cloudinary.com` | Probable |
| Environment configuration | `.env` files (backend), Zod-validated at startup | `backend/src/config/env.ts` | Confirmed |
| Production build | TypeScript compilation (`tsc`) for backend; `next build` for frontend | `backend/package.json` scripts, `frontend/package.json` scripts | Confirmed |

---

## 4. Application Entry Points

| Application | Directory | Entry Point | Dev Command | Build Command | Start Command |
|---|---|---|---|---|---|
| Backend API | `backend/` | `src/server.ts` → compiles to `dist/server.js` | `npm run dev` (ts-node-dev) | `npm run build` (tsc) | `npm start` (`node dist/server.js`) |
| Frontend | `frontend/` | Next.js App Router (`src/app/layout.tsx`) | `npm run dev` (next dev) | `npm run build` (next build) | `npm start` (next start) |

**Additional backend scripts (from `package.json`):**
- `prisma:generate` — `prisma generate --schema=../prisma/schema.prisma`
- `prisma:migrate` — `prisma migrate dev --schema=../prisma/schema.prisma`
- `prisma:studio` — `prisma studio --schema=../prisma/schema.prisma`
- `prisma:seed` — `ts-node --transpile-only prisma/seed.ts`
- `build:render` — `prisma generate --schema=../prisma/schema.prisma && tsc`
- `lint` — `eslint src/ --ext .ts`

**Default ports:**
- Backend: **5000** (from `backend/src/config/env.ts` default)
- Frontend: **3000** (Next.js default)

---

## 5. Root Repository Map

```
cline-tube/
├── AGENTS.md
├── README.md
├── render.yaml                       # Render deployment blueprint
├── .gitignore
├── prisma/
│   ├── schema.prisma                 # Shared Prisma schema (PostgreSQL)
│   ├── migrations/                   # Prisma migration history
│   └── ...
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── prisma/
│   │   └── seed.ts                   # Database seed script
│   └── src/
│       ├── server.ts                 # Application entry point
│       ├── app.ts                    # Express app setup
│       ├── config/
│       │   ├── cors.ts
│       │   ├── env.ts                # Zod-validated env config
│       │   └── prisma.ts             # Prisma client singleton
│       ├── controllers/              # Request handlers (8 controllers)
│       ├── middlewares/
│       │   ├── auth.ts               # JWT authentication
│       │   ├── authorize.ts          # Role + subscription authorization
│       │   ├── errorHandler.ts
│       │   ├── rateLimiter.ts
│       │   ├── requestId.ts
│       │   ├── upload.ts             # Multer config
│       │   └── validate.ts           # Zod schema validation middleware
│       ├── routes/                   # Route definitions (10 route files)
│       ├── services/                 # Business logic (9 service files)
│       ├── types/                    # TypeScript types + Express augmentation
│       ├── utils/                    # Error classes, JWT helpers, response helpers
│       └── validations/              # Zod validation schemas
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── next.config.ts
    ├── vercel.json
    ├── eslint.config.mjs
    ├── components.json               # shadcn/ui config
    ├── postcss.config.mjs
    └── src/
        ├── middleware.ts              # Next.js middleware (pass-through)
        ├── config/
        │   └── env.ts                # Client env validation
        ├── app/
        │   ├── layout.tsx            # Root layout
        │   ├── globals.css
        │   ├── error.tsx
        │   ├── loading.tsx
        │   ├── not-found.tsx
        │   ├── (auth)/               # Auth route group
        │   ├── (dashboard)/          # Admin dashboard route group
        │   └── (public)/             # Public-facing route group
        ├── components/               # Shared components + ui/
        ├── hooks/                    # (empty)
        ├── lib/                      # API client, auth, validations, utils
        ├── providers/                # React context providers
        └── types/                    # Frontend TypeScript types
```

---

## 6. High-Level Domain Locations

| Domain | Frontend Evidence | Backend Evidence | Status | Confidence |
|---|---|---|---|---|
| Authentication | `src/app/(auth)/login/`, `register/`, `forgot-password/`, `reset-password/`; `src/providers/auth-provider.tsx`; `src/lib/api.ts` (token refresh interceptor) | `src/controllers/auth.controller.ts`; `src/services/auth.service.ts`; `src/routes/auth.routes.ts`; `src/middlewares/auth.ts` | Exists | Confirmed |
| Users/patients | `src/types/index.ts` (User, UserProfile types) | `prisma/schema.prisma` (User, UserProfile models); `src/services/profile.service.ts` | Exists | Confirmed |
| Clinicians | — | — | — | Not Found |
| Admin | `src/app/(dashboard)/admin/` (media CRUD, review moderation, dashboard) | `src/controllers/admin.controller.ts`; `src/services/admin.service.ts`; `src/routes/admin.routes.ts` | Exists | Confirmed |
| Appointments | — | — | — | Not Found |
| Scheduling | — | — | — | Not Found |
| Consultations | — | — | — | Not Found |
| Join/meeting | — | — | — | Not Found |
| Prescriptions | — | — | — | Not Found |
| Inventory | — | — | — | Not Found |
| Orders | — | — | — | Not Found |
| Payments | `src/lib/checkout.ts` (Stripe checkout); `src/app/(public)/pricing/` | `src/controllers/payment.controller.ts`; `src/controllers/stripe-webhook.controller.ts`; `src/services/payment.service.ts`; `src/routes/payment.routes.ts`; `src/routes/webhook.routes.ts` | Exists | Confirmed |
| Reviews | `src/components/review-form.tsx`, `review-list.tsx`, `my-review-panel.tsx`; `src/app/(dashboard)/admin/reviews/` | `src/controllers/review.controller.ts`; `src/services/review.service.ts`; `src/routes/review.routes.ts` | Exists | Confirmed |
| Notifications | — | — | — | Not Found |
| Contact | — | — | — | Not Found |
| Analytics | — | — | — | Not Found |
| Profiles | `src/app/(public)/profile/` | `src/controllers/profile.controller.ts`; `src/services/profile.service.ts`; `src/routes/profile.routes.ts` | Exists | Confirmed |
| Uploads | `src/components/image-upload.tsx` | `src/controllers/upload.controller.ts`; `src/services/cloudinary.service.ts`; `src/routes/upload.routes.ts`; `src/middlewares/upload.ts` | Exists | Confirmed |
| Blog/content | — | — | — | Not Found |
| Watchlist | `src/app/(public)/watchlist/` | `src/controllers/watchlist.controller.ts`; `src/services/watchlist.service.ts`; `src/routes/watchlist.routes.ts`; `prisma/schema.prisma` (Watchlist model) | Exists | Confirmed |
| Media (Movies/Series) | `src/app/(public)/browse/`, `browse/[slug]/`; `src/app/(dashboard)/admin/media/` | `src/controllers/media.controller.ts`; `src/services/media.service.ts`; `src/routes/media.routes.ts`; `prisma/schema.prisma` (Media, Genre, MediaGenre models) | Exists | Confirmed |
| Comments | `src/components/comment-section.tsx` | `src/controllers/comment.controller.ts`; `src/services/comment.service.ts` | Exists | Confirmed |
| Subscriptions | `src/app/(public)/pricing/` | `prisma/schema.prisma` (Subscription, Transaction models) | Exists | Confirmed |

---

## 7. Existing Quality and Tooling

| Capability | Present | Configuration Path | Notes |
|---|---|---|---|
| ESLint | Yes | `frontend/eslint.config.mjs`; backend lint script references `eslint src/ --ext .ts` | Frontend has eslint-config-next; backend lint script exists but no `.eslintrc` found — may use flat config or inline |
| Prettier | **No** | — | No prettier config file found |
| TypeScript | Yes | `backend/tsconfig.json`, `frontend/tsconfig.json` | Both projects are fully TypeScript |
| Unit tests | **No** | — | No test files, no test framework in dependencies |
| Integration tests | **No** | — | — |
| E2E tests | **No** | — | — |
| Environment example | Yes | `backend/.env.example` | Only backend has an example file; frontend has none |
| Docker | **No** | — | No Dockerfile or docker-compose found |
| CI/CD workflows | **No** | — | No `.github/workflows/` directory |
| Deployment config | Yes | `render.yaml` (backend), `frontend/vercel.json` | Confirmed for Render + Vercel |
| README | Yes | `README.md` | Contains local setup, deploy instructions, admin credentials |
| Database seed | Yes | `backend/prisma/seed.ts` | Seeds 12 genres, 1 admin user, 20 media entries |
| Database migrations | Yes | `prisma/migrations/20260621044807_init/migration.sql` | Single initial migration |
| API documentation | **No** | — | No Swagger/OpenAPI docs found |

---

## 8. Environment Variables

### Backend (`backend/.env.example`)

| Group | Variable Names |
|---|---|
| Database | `DATABASE_URL` |
| Authentication | `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY` |
| Payments | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Storage | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| Application | `FRONTEND_URL`, `PORT`, `NODE_ENV` |

### Frontend

| Group | Variable Names |
|---|---|
| API | `NEXT_PUBLIC_API_URL` |

### Render deployment (`render.yaml`)

All backend env vars listed above, plus `NODE_ENV=production` (hardcoded).

**Note:** No `.env.example` exists for the frontend. No email-provider env vars found.

---

## 9. Deployment Indicators

| Platform | Evidence | Confidence |
|---|---|---|
| Vercel (frontend) | `frontend/vercel.json`; README deploy instructions | Confirmed |
| Render (backend) | `render.yaml` at root; README deploy instructions | Confirmed |
| Docker | — | Not Found |
| Railway | — | Not Found |
| Netlify | — | Not Found |
| VPS | — | Not Found |

**No evidence that the application is currently deployed.** Deployment configurations exist but no deployment URLs or status indicators were found.

---

## 10. Initial Observations

1. **Clean monorepo structure.** Two well-separated applications (`frontend/`, `backend/`) with a shared Prisma schema at the repository root. No duplicate or legacy directories.

2. **No testing infrastructure.** Zero test files, zero test dependencies, zero test scripts. This applies to both frontend and backend.

3. **No CI/CD pipeline.** No `.github/workflows/`, no Dockerfile, no automated quality gates.

4. **Single Prisma migration.** Only one migration (`20260621044807_init`) exists, suggesting the project is relatively young or was developed against a single schema version.

5. **In-memory JWT access tokens with HttpOnly refresh cookies.** The frontend stores access tokens in a module-level variable (not localStorage). Refresh tokens are managed via cross-origin cookies with `SameSite=None` for Vercel→Render.

6. **Zod validation on both sides.** Backend uses Zod v3 for env validation and request validation. Frontend uses Zod v4 for form validation. Version mismatch (v3 vs v4) exists but both are functional.

7. **Healthcare domain is absent.** The project is a movie/series rating portal (entertainment domain), not a healthcare application. There are no clinicians, appointments, prescriptions, or medical entities.

8. **Frontend middleware is a pass-through.** `frontend/src/middleware.ts` calls `NextResponse.next()` unconditionally — it performs no auth checks or redirects at the middleware level.

9. **No email provider.** Password reset flow exists (routes, tokens in DB) but no email-sending service was found. The reset token may be returned directly in the API response for development purposes.

10. **`hooks/` directory is empty.** The frontend has a `src/hooks/` directory but it contains no files.

---

## 11. Unknowns Requiring Later Investigation

1. **How does the password reset flow actually deliver tokens?** No email service (Nodemailer, SendGrid, etc.) is in the dependencies. Does the API return the token directly in the response?

2. **Is the frontend ESLint config functional?** `eslint.config.mjs` exists but no `.eslintrc` was found for the backend — does `npm run lint` work in the backend?

3. **Are the Stripe webhook handlers complete and tested?** The webhook route exists (`/api/webhooks/stripe`) but no manual verification was done.

4. **What is the actual Prisma migration state?** Only one migration exists. Has it been applied to any database, or is the project always started from scratch?

5. **Does the admin dashboard have full CRUD for all entities?** The directory structure suggests media and review management, but user management capabilities are unclear.

6. **Is the `Account` model (OAuth) used anywhere?** The Prisma schema defines an `Account` model with `provider`/`providerAccountId` fields, but no OAuth provider (NextAuth, etc.) was found in the dependencies.

7. **What does the seed script fully contain?** Only the first 50 lines were read. The full media seed data and any additional seed logic need inspection.

8. **Are there any frontend `.env.local` files?** The file search found none, but they may be gitignored and not present in the repo.

9. **What does the `validate.ts` middleware do exactly?** It exists in the middleware directory but was not inspected in detail.

10. **Is the `@base-ui/react` package actually used?** It's in the frontend dependencies but no imports were verified.

---

## 12. Recommended Next Discovery Pass

The following areas warrant deeper investigation in subsequent passes:

1. **Route inventory** — Read every route file to catalog all API endpoints, HTTP methods, middleware chains, and controller actions.

2. **Authentication trace** — Trace the full auth lifecycle: registration → login → token issuance → refresh → logout → password reset. Verify cookie settings, token expiry, and error handling.

3. **Database model inventory** — Complete analysis of all Prisma models, relations, indexes, and constraints. Map models to API endpoints.

4. **Payment workflow** — Trace Stripe checkout session creation → webhook handling → subscription tier update → access control enforcement.

5. **Media access control** — How does the system enforce FREE vs PREMIUM content access? How does the frontend handle restricted content?

6. **Admin workflow** — What can administrators do? Map all admin endpoints and their authorization requirements.

7. **UI component system** — Inventory all shadcn/ui components in use, shared components, and page-level components. Identify any unused or duplicate components.

---

## Appendix: Database Models (from `prisma/schema.prisma`)

| Model | Purpose |
|---|---|
| `User` | User accounts with soft-delete support |
| `UserProfile` | Extended profile (bio, social links, favorite genres) |
| `Account` | OAuth provider accounts (appears unused — no OAuth library found) |
| `RefreshToken` | JWT refresh token storage |
| `PasswordResetToken` | Password reset tokens |
| `Media` | Movies and series with metadata, ratings, view counts |
| `Genre` | Genre taxonomy |
| `MediaGenre` | Many-to-many media↔genre relation |
| `Review` | User reviews with moderation status (PENDING/APPROVED/REJECTED) |
| `ReviewLike` | Review likes |
| `ReviewReport` | Review reports (spam, spoiler, harassment, etc.) |
| `Comment` | Nested comments on reviews |
| `Watchlist` | User watchlists |
| `Subscription` | Stripe subscription tracking (FREE/MONTHLY/YEARLY) |
| `Transaction` | Payment transaction records |

**Enums:** `Role`, `MediaType`, `PricingType`, `ReviewStatus`, `SubscriptionTier`, `SubscriptionStatus`, `TransactionStatus`, `ReportReason`, `ReportStatus`
