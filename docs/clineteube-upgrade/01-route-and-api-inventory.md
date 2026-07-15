# CineTube Route and API Inventory

> **Discovery date:** 2026-07-13  
> **Branch:** `main`  
> **Baseline reference:** `docs/clineteube-upgrade/00-project-baseline.md`

---

## 1. Executive Summary

CineTube has **15 frontend routes** across three route groups (public, auth, dashboard) and **30 backend API endpoints** across 10 route files. The frontend is entirely client-rendered (`"use client"`) with TanStack Query for data fetching. Authentication is enforced client-side in the admin layout and via JWT middleware on the backend. The Next.js middleware is a pass-through — all route protection is client-side or backend-only. Several Gladiator-required pages (About, Contact, Blog, Help, Privacy, Terms) are completely missing.

---

## 2. Frontend Route Map

| URL Path | Route Group | Source File | Page Purpose | Access | Role Required | Main Components | API Dependencies | Data Loading | Loading State | Error State | Empty State | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` | `(public)` | `frontend/src/app/(public)/page.tsx` | Home — hero carousel, trending media, featured sections | Public | — | HeroCarousel, MediaCards, FAQ Accordion, Pricing CTA | `GET /media` | useQuery (TanStack) | No skeleton | No error boundary | N/A | Partial |
| `/browse` | `(public)` | `frontend/src/app/(public)/browse/page.tsx` | Media listing — search, filter, sort, paginate | Public | — | SearchInput, FilterSelects, MediaCard grid, Pagination | `GET /media` | useQuery with URL params | Spinner | No error boundary | "No results" message | Complete |
| `/browse/[slug]` | `(public)` | `frontend/src/app/(public)/browse/[slug]/page.tsx` | Media detail — info, reviews, comments, watchlist | Public | — | MediaDetail, ReviewForm, ReviewList, MyReviewPanel, CommentSection | `GET /media/:slug`, `GET /reviews/media/:slug`, `GET /reviews/media/:slug/mine`, `GET /watchlist`, `GET /payments/subscription`, `GET /reviews/:id/comments` | Multiple useQuery | Spinner | Error alert | N/A | Complete |
| `/pricing` | `(public)` | `frontend/src/app/(public)/pricing/page.tsx` | Subscription plans — Monthly/Yearly pricing, FAQ | Public | — | PricingCards, FAQ Accordion, CheckoutButton | `GET /payments/subscription`, `POST /payments/checkout` | useQuery (subscription) | Auth loading spinner | No error boundary | N/A | Complete |
| `/profile` | `(public)` | `frontend/src/app/(public)/profile/page.tsx` | User profile — view/edit profile, subscription status | Protected (client) | USER/ADMIN | ProfileForm, SubscriptionCard, SocialLinks | `GET /profile`, `PUT /profile`, `GET /payments/subscription` | useQuery + useMutation | Spinner | Error alert | Sign-in prompt | Complete |
| `/watchlist` | `(public)` | `frontend/src/app/(public)/watchlist/page.tsx` | User watchlist — saved media, remove items | Protected (client) | USER/ADMIN | WatchlistGrid, RemoveButton | `GET /watchlist`, `DELETE /watchlist/:mediaId` | useQuery + useMutation | Spinner | No error boundary | Sign-in prompt / Empty watchlist | Complete |
| `/login` | `(auth)` | `frontend/src/app/(auth)/login/page.tsx` | Login form | Public | — | LoginForm (react-hook-form + zod) | `POST /auth/login` | useMutation | Submit spinner | Error alert | N/A | Complete |
| `/register` | `(auth)` | `frontend/src/app/(auth)/register/page.tsx` | Registration form | Public | — | RegisterForm (react-hook-form + zod) | `POST /auth/register` | useMutation | Submit spinner | Error alert | N/A | Complete |
| `/forgot-password` | `(auth)` | `frontend/src/app/(auth)/forgot-password/page.tsx` | Request password reset | Public | — | ForgotPasswordForm | `POST /auth/forgot-password` | useMutation | Submit spinner | Error alert | Success message | Complete |
| `/reset-password` | `(auth)` | `frontend/src/app/(auth)/reset-password/page.tsx` | Reset password with token | Public | — | ResetPasswordForm (token from URL query) | `POST /auth/reset-password` | useMutation | Submit spinner | Error alert | Success + redirect | Complete |
| `/admin` | `(dashboard)` | `frontend/src/app/(dashboard)/admin/page.tsx` | Admin dashboard — KPIs | Protected (client) | ADMIN | KPICards, QuickLinks | `GET /admin/dashboard` | useQuery | Spinner | No error boundary | N/A | Complete |
| `/admin/media` | `(dashboard)` | `frontend/src/app/(dashboard)/admin/media/page.tsx` | Admin media list — search, paginate, delete | Protected (client) | ADMIN | MediaTable, SearchInput, Pagination, DeleteButton | `GET /media`, `DELETE /media/:id` | useQuery + useMutation | Spinner | No error boundary | "No media" message | Complete |
| `/admin/media/create` | `(dashboard)` | `frontend/src/app/(dashboard)/admin/media/create/page.tsx` | Create new media entry | Protected (client) | ADMIN | MediaForm, ImageUpload | `GET /media/genres`, `POST /media` (multipart) | useQuery (genres) + useMutation | No skeleton | Error alert | N/A | Complete |
| `/admin/media/[id]/edit` | `(dashboard)` | `frontend/src/app/(dashboard)/admin/media/[id]/edit/page.tsx` | Edit existing media entry | Protected (client) | ADMIN | MediaForm, ImageUpload | `GET /media/by-id/:id`, `GET /media/genres`, `PUT /media/:id` (multipart) | useQuery + useMutation | Spinner | Error alert | N/A | Complete |
| `/admin/reviews` | `(dashboard)` | `frontend/src/app/(dashboard)/admin/reviews/page.tsx` | Review moderation — approve/reject pending reviews | Protected (client) | ADMIN | ReviewTable, ApproveButton, RejectButton, FilterTabs | `GET /reviews/pending`, `GET /reviews/mine`, `POST /reviews/:id/approve`, `POST /reviews/:id/reject` | useQuery + useMutation | Spinner | No error boundary | "No reviews" message | Complete |

### Global Application Files

| File | Purpose |
|---|---|
| `frontend/src/app/layout.tsx` | Root layout — fonts, metadata, `<Providers>` wrapper |
| `frontend/src/app/loading.tsx` | Global loading spinner (Suspense boundary) |
| `frontend/src/app/error.tsx` | Global error boundary with retry button |
| `frontend/src/app/not-found.tsx` | 404 page with "Go Home" link |
| `frontend/src/app/(public)/layout.tsx` | Public layout — Navbar + Footer wrapper |

### Route Group Summary

| Route Group | Routes | Purpose |
|---|---|---|
| `(public)` | 6 | Public-facing pages with Navbar + Footer |
| `(auth)` | 4 | Authentication pages (standalone layout, no Navbar/Footer) |
| `(dashboard)` | 4 | Admin dashboard with sidebar layout |

---

## 3. Route Groups and Layouts

### `(public)` Layout
**File:** `frontend/src/app/(public)/layout.tsx`  
**Structure:** Navbar → `<main>{children}</main>` → Footer  
**Protection:** None — all pages in this group are publicly accessible at the layout level. Client-side checks exist in individual pages (profile, watchlist).

### `(auth)` Layout
**File:** No dedicated layout file found. Each auth page is a standalone full-screen layout.  
**Structure:** Split-screen design (left: branding/backdrop, right: form)  
**Protection:** None — auth pages are public by nature.

### `(dashboard)` Layout
**File:** `frontend/src/app/(dashboard)/admin/layout.tsx`  
**Structure:** Admin sidebar (Overview, Manage Media, Moderate Reviews) + main content area  
**Protection:** Client-side — checks `isAuthenticated` and `user.role === "ADMIN"` in `useEffect`. Redirects to `/login?redirect=...` if unauthorized. Shows loading spinner during check.

### Root Layout
**File:** `frontend/src/app/layout.tsx`  
**Structure:** `<html>` → `<body>` → `<Providers>` → children  
**Wraps:** All routes globally.

---

## 4. Public Navigation

**Component:** `frontend/src/components/navbar.tsx`

### Links shown to logged-out users:
| Link | Target | Corresponds to real route |
|---|---|---|
| CineTube logo | `/` | ✅ |
| Home | `/` | ✅ |
| Browse | `/browse` | ✅ |
| Pricing | `/pricing` | ✅ |
| Sign In | `/login` | ✅ |
| Get Started | `/register` | ✅ |

**Count:** 4 navigation routes + 2 auth CTAs = **6 links**

### Search bar:
- Desktop: visible search input in navbar
- Mobile: compact search input
- Both submit to `/browse?search=...`

### Mobile hamburger:
- Present — toggles mobile menu with nav links
- Uses Framer Motion for animation

---

## 5. Authenticated Navigation

**Component:** `frontend/src/components/navbar.tsx` (same component, conditional rendering)

### Additional links shown to logged-in users:
| Link | Target | Corresponds to real route |
|---|---|---|
| Watchlist | `/watchlist` | ✅ |

### Profile dropdown (avatar click):
| Link | Target | Role | Corresponds to real route |
|---|---|---|---|
| My Profile | `/profile` | All authenticated | ✅ |
| Watchlist | `/watchlist` | All authenticated | ✅ |
| Admin Dashboard | `/admin` | ADMIN only | ✅ |
| Sign Out | (logout action) | All authenticated | ✅ |

### Notification bell:
- Present with red dot indicator
- No actual notification functionality — placeholder only

**Total logged-in routes:** Home, Browse, Watchlist, Pricing, Profile = **5 routes** + dropdown

---

## 6. Admin Navigation

**Component:** `frontend/src/app/(dashboard)/admin/layout.tsx` (sidebar)

### Sidebar links:
| Link | Target | Corresponds to real route |
|---|---|---|
| Overview | `/admin` | ✅ |
| Manage Media | `/admin/media` | ✅ |
| Moderate Reviews | `/admin/reviews` | ✅ |

### Additional sidebar elements:
- Brand header with "Admin" badge
- User card showing admin name and "SUPERUSER" label
- Back to Site link (`/`)
- Sign Out button

### Admin pages accessible:
| Route | Purpose |
|---|---|
| `/admin` | Dashboard KPIs |
| `/admin/media` | Media list + CRUD |
| `/admin/media/create` | Create media form |
| `/admin/media/[id]/edit` | Edit media form |
| `/admin/reviews` | Review moderation |

---

## 7. Footer Link Inventory

**Component:** `frontend/src/components/footer.tsx`

### Footer sections:
| Section | Links | Target |
|---|---|---|
| Brand | CineTube logo | `/` |
| Social | Twitter/X | `#` (placeholder) |
| Social | Facebook | `#` (placeholder) |
| Social | GitHub | `#` (placeholder) |
| Social | YouTube | `#` (placeholder) |

**Note:** Footer was only partially read (first 80 lines). The footer likely contains additional link columns (Browse, Company, Legal, etc.) but could not be fully confirmed. Social links all point to `#` — non-functional placeholders.

---

## 8. Backend Router Mounting

**File:** `backend/src/app.ts`

| Base Path | Router File | Global Middleware | Notes |
|---|---|---|---|
| `/api/webhooks` | `webhook.routes.ts` | `express.raw({ type: "application/json" })` | Mounted BEFORE `express.json()` — raw body for Stripe signature verification |
| `/api` | (JSON body parser) | `express.json({ limit: "10mb" })`, `express.urlencoded({ extended: true, limit: "10mb" })`, `cookieParser()` | — |
| `/api` | (rate limiter) | `apiLimiter` (500 req/15min prod, skipped in dev) | — |
| `/api/health` | (inline) | None | Health check endpoint |
| `/api/auth` | `auth.routes.ts` | None (per-route rate limiting) | Auth endpoints |
| `/api/media` | `media.routes.ts` | None | Media CRUD + public listing |
| `/api/reviews` | `review.routes.ts` | None | Reviews + comments |
| `/api/upload` | `upload.routes.ts` | None | Image upload (admin) |
| `/api/watchlist` | `watchlist.routes.ts` | None | Watchlist management |
| `/api/profile` | `profile.routes.ts` | None | Profile CRUD |
| `/api/admin` | `admin.routes.ts` | None | Admin dashboard |
| `/api/payments` | `payment.routes.ts` | None | Stripe payments |
| (404) | (inline) | None | "Route not found" JSON response |
| (error) | `errorHandler.ts` | None | Global error handler |

### Middleware stack order:
1. `requestId` — adds X-Request-ID
2. `helmet()` — security headers
3. `cors(corsOptions)` — CORS with credentials
4. `compression()` — gzip
5. `morgan()` — HTTP logging (non-test)
6. `/api/webhooks` — Stripe raw body (before JSON parser)
7. `express.json()` — JSON body parser
8. `cookieParser()` — cookie parsing
9. `/api` — rate limiter
10. `/api/health` — health check
11. `/api` — API router
12. 404 handler
13. Error handler

---

## 9. Complete API Endpoint Inventory

### Auth Routes (`backend/src/routes/auth.routes.ts`)

| Method | Endpoint | Controller | Validation | Auth | Role/Plan | Pagination | Status |
|---|---|---|---|---|---|---|---|
| POST | `/api/auth/register` | `authController.register` | `registerSchema` | None (rate-limited) | — | No | Connected |
| POST | `/api/auth/login` | `authController.login` | `loginSchema` | None (rate-limited) | — | No | Connected |
| POST | `/api/auth/logout` | `authController.logout` | None | None (uses cookie) | — | No | Connected |
| POST | `/api/auth/refresh` | `authController.refresh` | None | None (uses cookie) | — | No | Connected |
| GET | `/api/auth/me` | `authController.me` | None | `authenticate` | Any authenticated | No | Connected |
| POST | `/api/auth/forgot-password` | `authController.forgotPassword` | `forgotPasswordSchema` | None (rate-limited) | — | No | Connected |
| POST | `/api/auth/reset-password` | `authController.resetPassword` | `resetPasswordSchema` | None (rate-limited) | — | No | Connected |

### Media Routes (`backend/src/routes/media.routes.ts`)

| Method | Endpoint | Controller | Validation | Auth | Role/Plan | Pagination | Status |
|---|---|---|---|---|---|---|---|
| GET | `/api/media` | `mediaController.list` | `mediaQuerySchema` (query) | None | — | Yes (`page`, `limit`) | Connected |
| GET | `/api/media/genres` | `mediaController.genres` | None | None | — | No | Connected |
| GET | `/api/media/:slug` | `mediaController.getBySlug` | None | `optionalAuthenticate` | — | No | Connected |
| GET | `/api/media/:slug/stream` | `mediaController.getStream` | None | `authenticate` | Any authenticated | No | Connected |
| POST | `/api/media/:slug/view` | `mediaController.recordView` | None | None | — | No | Connected |
| POST | `/api/media` | `mediaController.create` | `createMediaSchema` | `authenticate` + `authorize` | ADMIN | No | Connected |
| GET | `/api/media/by-id/:id` | `mediaController.getById` | None | `authenticate` + `authorize` | ADMIN | No | Connected |
| PUT | `/api/media/:id` | `mediaController.update` | `updateMediaSchema` | `authenticate` + `authorize` | ADMIN | No | Connected |
| DELETE | `/api/media/:id` | `mediaController.remove` | None | `authenticate` + `authorize` | ADMIN | No | Connected |

### Review Routes (`backend/src/routes/review.routes.ts`)

| Method | Endpoint | Controller | Validation | Auth | Role/Plan | Pagination | Status |
|---|---|---|---|---|---|---|---|
| GET | `/api/reviews/media/:slug` | `reviewController.getByMedia` | `reviewQuerySchema` (query) | None | — | Yes | Connected |
| GET | `/api/reviews/media/:slug/mine` | `reviewController.getMyReviewForMedia` | None | `authenticate` | Any authenticated | No | Connected |
| POST | `/api/reviews` | `reviewController.create` | `createReviewSchema` | `authenticate` | Any authenticated | No | Connected |
| PUT | `/api/reviews/:id` | `reviewController.update` | `updateReviewSchema` | `authenticate` | Any authenticated (ownership) | No | Connected |
| DELETE | `/api/reviews/:id` | `reviewController.remove` | None | `authenticate` | Any authenticated (ownership) | No | Connected |
| GET | `/api/reviews/mine` | `reviewController.getMine` | `reviewQuerySchema` (query) | `authenticate` | Any authenticated | Yes | Connected |
| GET | `/api/reviews/:id/comments` | `commentController.list` | None | None | — | No | Connected |
| POST | `/api/reviews/:id/comments` | `commentController.create` | `createCommentSchema` | `authenticate` | Any authenticated | No | Connected |
| DELETE | `/api/reviews/:id/comments/:commentId` | `commentController.remove` | None | `authenticate` | Any authenticated (ownership) | No | Connected |
| POST | `/api/reviews/:id/like` | `reviewController.toggleLike` | None | `authenticate` | Any authenticated | No | Connected |
| GET | `/api/reviews/pending` | `reviewController.getPending` | `reviewQuerySchema` (query) | `authenticate` + `authorize` | ADMIN | Yes | Connected |
| POST | `/api/reviews/:id/approve` | `reviewController.approve` | None | `authenticate` + `authorize` | ADMIN | No | Connected |
| POST | `/api/reviews/:id/reject` | `reviewController.reject` | None | `authenticate` + `authorize` | ADMIN | No | Connected |

### Watchlist Routes (`backend/src/routes/watchlist.routes.ts`)

| Method | Endpoint | Controller | Validation | Auth | Role/Plan | Pagination | Status |
|---|---|---|---|---|---|---|---|
| POST | `/api/watchlist` | `watchlistController.add` | None | `authenticate` | Any authenticated | No | Connected |
| DELETE | `/api/watchlist/:mediaId` | `watchlistController.remove` | None | `authenticate` | Any authenticated | No | Connected |
| GET | `/api/watchlist` | `watchlistController.list` | None | `authenticate` | Any authenticated | No | Connected |

### Profile Routes (`backend/src/routes/profile.routes.ts`)

| Method | Endpoint | Controller | Validation | Auth | Role/Plan | Pagination | Status |
|---|---|---|---|---|---|---|---|
| GET | `/api/profile` | `profileController.get` | None | `authenticate` | Any authenticated | No | Connected |
| PUT | `/api/profile` | `profileController.update` | `updateProfileSchema` (inline) | `authenticate` | Any authenticated | No | Connected |

### Admin Routes (`backend/src/routes/admin.routes.ts`)

| Method | Endpoint | Controller | Validation | Auth | Role/Plan | Pagination | Status |
|---|---|---|---|---|---|---|---|
| GET | `/api/admin/dashboard` | `adminController.dashboard` | None | `authenticate` + `authorize` | ADMIN | No | Connected |

### Payment Routes (`backend/src/routes/payment.routes.ts`)

| Method | Endpoint | Controller | Validation | Auth | Role/Plan | Pagination | Status |
|---|---|---|---|---|---|---|---|
| POST | `/api/payments/checkout` | `paymentController.checkout` | None | `authenticate` | Any authenticated | No | Connected |
| GET | `/api/payments/subscription` | `paymentController.getSubscription` | None | `authenticate` | Any authenticated | No | Connected |
| POST | `/api/payments/cancel` | `paymentController.cancel` | None | `authenticate` | Any authenticated | No | Connected |

### Upload Routes (`backend/src/routes/upload.routes.ts`)

| Method | Endpoint | Controller | Validation | Auth | Role/Plan | Pagination | Status |
|---|---|---|---|---|---|---|---|
| POST | `/api/upload/image` | `uploadController.uploadImage` | None | `authenticate` + `authorize` | ADMIN | No | Connected |
| DELETE | `/api/upload/:publicId(*)` | `uploadController.deleteImage` | None | `authenticate` + `authorize` | ADMIN | No | Connected |

### Webhook Routes (`backend/src/routes/webhook.routes.ts`)

| Method | Endpoint | Controller | Validation | Auth | Role/Plan | Pagination | Status |
|---|---|---|---|---|---|---|---|
| POST | `/api/webhooks/stripe` | `handleWebhook` | None (raw body) | Stripe signature | — | No | Connected |

### Inline Health Endpoint (`backend/src/app.ts`)

| Method | Endpoint | Controller | Validation | Auth | Role/Plan | Pagination | Status |
|---|---|---|---|---|---|---|---|
| GET | `/api/health` | (inline lambda) | None | None | — | No | Connected |

**Total endpoints: 37**

---

## 10. Frontend-to-Backend Connectivity

| Frontend Surface | Frontend API Call | Backend Endpoint | Connectivity Status | Evidence |
|---|---|---|---|---|
| Home page | `GET /media` | `GET /api/media` | Connected | `(public)/page.tsx` → `mediaController.list` |
| Browse page | `GET /media` (with query params) | `GET /api/media` | Connected | `(public)/browse/page.tsx` → `mediaController.list` |
| Media detail | `GET /media/:slug` | `GET /api/media/:slug` | Connected | `(public)/browse/[slug]/page.tsx` → `mediaController.getBySlug` |
| Media detail (reviews) | `GET /reviews/media/:slug` | `GET /api/reviews/media/:slug` | Connected | `review-list.tsx` → `reviewController.getByMedia` |
| Media detail (my review) | `GET /reviews/media/:slug/mine` | `GET /api/reviews/media/:slug/mine` | Connected | `my-review-panel.tsx` → `reviewController.getMyReviewForMedia` |
| Review form | `POST /reviews` | `POST /api/reviews` | Connected | `review-form.tsx` → `reviewController.create` |
| Review form (edit) | `PUT /reviews/:id` | `PUT /api/reviews/:id` | Connected | `review-form.tsx` → `reviewController.update` |
| Review list (delete) | `DELETE /reviews/:id` | `DELETE /api/reviews/:id` | Connected | `review-list.tsx` → `reviewController.remove` |
| Review list (like) | `POST /reviews/:id/like` | `POST /api/reviews/:id/like` | Connected | `review-list.tsx` → `reviewController.toggleLike` |
| Comment section | `GET /reviews/:id/comments` | `GET /api/reviews/:id/comments` | Connected | `comment-section.tsx` → `commentController.list` |
| Comment section | `POST /reviews/:id/comments` | `POST /api/reviews/:id/comments` | Connected | `comment-section.tsx` → `commentController.create` |
| Comment section | `DELETE /reviews/:id/comments/:commentId` | `DELETE /api/reviews/:id/comments/:commentId` | Connected | `comment-section.tsx` → `commentController.remove` |
| Watchlist page | `GET /watchlist` | `GET /api/watchlist` | Connected | `(public)/watchlist/page.tsx` → `watchlistController.list` |
| Watchlist page | `DELETE /watchlist/:mediaId` | `DELETE /api/watchlist/:mediaId` | Connected | `(public)/watchlist/page.tsx` → `watchlistController.remove` |
| Media detail (watchlist) | `POST /watchlist` | `POST /api/watchlist` | Connected | `(public)/browse/[slug]/page.tsx` → `watchlistController.add` |
| Profile page | `GET /profile` | `GET /api/profile` | Connected | `(public)/profile/page.tsx` → `profileController.get` |
| Profile page | `PUT /profile` | `PUT /api/profile` | Connected | `(public)/profile/page.tsx` → `profileController.update` |
| Pricing page | `GET /payments/subscription` | `GET /api/payments/subscription` | Connected | `(public)/pricing/page.tsx` → `paymentController.getSubscription` |
| Pricing page | `POST /payments/checkout` | `POST /api/payments/checkout` | Connected | `checkout.ts` → `paymentController.checkout` |
| Login page | `POST /auth/login` | `POST /api/auth/login` | Connected | `(auth)/login/page.tsx` → `authController.login` |
| Register page | `POST /auth/register` | `POST /api/auth/register` | Connected | `(auth)/register/page.tsx` → `authController.register` |
| Forgot password | `POST /auth/forgot-password` | `POST /api/auth/forgot-password` | Connected | `(auth)/forgot-password/page.tsx` → `authController.forgotPassword` |
| Reset password | `POST /auth/reset-password` | `POST /api/auth/reset-password` | Connected | `(auth)/reset-password/page.tsx` → `authController.resetPassword` |
| Auth provider | `POST /auth/refresh` | `POST /api/auth/refresh` | Connected | `auth-provider.tsx` → `authController.refresh` |
| Auth provider | `POST /auth/logout` | `POST /api/auth/logout` | Connected | `auth-provider.tsx` → `authController.logout` |
| Auth provider | `GET /auth/me` | `GET /api/auth/me` | Connected | `auth-provider.tsx` → `authController.me` |
| Admin dashboard | `GET /admin/dashboard` | `GET /api/admin/dashboard` | Connected | `(dashboard)/admin/page.tsx` → `adminController.dashboard` |
| Admin media list | `GET /media` | `GET /api/media` | Connected | `(dashboard)/admin/media/page.tsx` → `mediaController.list` |
| Admin media delete | `DELETE /media/:id` | `DELETE /api/media/:id` | Connected | `(dashboard)/admin/media/page.tsx` → `mediaController.remove` |
| Admin media create | `POST /media` (multipart) | `POST /api/media` | Connected | `(dashboard)/admin/media/create/page.tsx` → `mediaController.create` |
| Admin media create | `GET /media/genres` | `GET /api/media/genres` | Connected | `(dashboard)/admin/media/create/page.tsx` → `mediaController.genres` |
| Admin media edit | `GET /media/by-id/:id` | `GET /api/media/by-id/:id` | Connected | `(dashboard)/admin/media/[id]/edit/page.tsx` → `mediaController.getById` |
| Admin media edit | `PUT /media/:id` (multipart) | `PUT /api/media/:id` | Connected | `(dashboard)/admin/media/[id]/edit/page.tsx` → `mediaController.update` |
| Admin reviews | `GET /reviews/pending` | `GET /api/reviews/pending` | Connected | `(dashboard)/admin/reviews/page.tsx` → `reviewController.getPending` |
| Admin reviews | `POST /reviews/:id/approve` | `POST /api/reviews/:id/approve` | Connected | `(dashboard)/admin/reviews/page.tsx` → `reviewController.approve` |
| Admin reviews | `POST /reviews/:id/reject` | `POST /api/reviews/:id/reject` | Connected | `(dashboard)/admin/reviews/page.tsx` → `reviewController.reject` |
| Media detail (stream) | Not called from frontend | `GET /api/media/:slug/stream` | **Frontend call not found** | Backend endpoint exists but no frontend usage found |
| Media detail (view) | Not called from frontend | `POST /api/media/:slug/view` | **Frontend call not found** | Backend endpoint exists but no frontend usage found |
| Stripe webhook | N/A (Stripe server) | `POST /api/webhooks/stripe` | Connected (external) | Stripe calls this directly |
| Upload routes | Used via media create/edit | `POST /api/upload/image` | Indirect (via multipart) | Media form uploads via multipart, not separate upload endpoint |
| Upload delete | Not called from frontend | `DELETE /api/upload/:publicId` | **Frontend call not found** | Backend endpoint exists but no frontend usage found |

---

## 11. Authorization Matrix

### Frontend Protection

| Surface | Protection Mechanism | Type | Evidence |
|---|---|---|---|
| `/` (Home) | None | Public | `page.tsx` — no auth check |
| `/browse` | None | Public | `page.tsx` — no auth check |
| `/browse/[slug]` | None (optional auth for premium content) | Public | `page.tsx` — checks `isAuthenticated` for subscription status only |
| `/pricing` | None | Public | `page.tsx` — shows sign-in prompt for checkout only |
| `/profile` | Client-side redirect | Client-only | `page.tsx` — shows sign-in prompt if `!isAuthenticated` |
| `/watchlist` | Client-side redirect | Client-only | `page.tsx` — shows sign-in prompt if `!isAuthenticated` |
| `/login` | None | Public | `page.tsx` — no auth check |
| `/register` | None | Public | `page.tsx` — no auth check |
| `/forgot-password` | None | Public | `page.tsx` — no auth check |
| `/reset-password` | None | Public | `page.tsx` — no auth check |
| `/admin` | Client-side redirect | Client-only | `layout.tsx` — redirects to `/login` if not ADMIN |
| `/admin/media` | Client-side redirect | Client-only | (inherits admin layout) |
| `/admin/media/create` | Client-side redirect | Client-only | (inherits admin layout) |
| `/admin/media/[id]/edit` | Client-side redirect | Client-only | (inherits admin layout) |
| `/admin/reviews` | Client-side redirect | Client-only | (inherits admin layout) |

**Key finding:** The Next.js middleware (`frontend/src/middleware.ts`) is a pass-through — it calls `NextResponse.next()` unconditionally. All frontend route protection is client-side only.

### Backend Protection

| Endpoint | Middleware | Auth Required | Role Check | Subscription Check | Ownership Check |
|---|---|---|---|---|---|
| `POST /api/auth/register` | `authLimiter`, `validate` | No | — | — | — |
| `POST /api/auth/login` | `authLimiter`, `validate` | No | — | — | — |
| `POST /api/auth/logout` | None | No (cookie) | — | — | — |
| `POST /api/auth/refresh` | None | No (cookie) | — | — | — |
| `GET /api/auth/me` | `authenticate` | Yes | — | — | — |
| `POST /api/auth/forgot-password` | `authLimiter`, `validate` | No | — | — | — |
| `POST /api/auth/reset-password` | `authLimiter`, `validate` | No | — | — | — |
| `GET /api/media` | `validate` (query) | No | — | — | — |
| `GET /api/media/genres` | None | No | — | — | — |
| `GET /api/media/:slug` | `optionalAuthenticate` | Optional | — | — | — |
| `GET /api/media/:slug/stream` | `authenticate` | Yes | — | — | — |
| `POST /api/media/:slug/view` | None | No | — | — | — |
| `POST /api/media` | `authenticate`, `authorize`, `uploadImage`, `validate` | Yes | ADMIN | — | — |
| `GET /api/media/by-id/:id` | `authenticate`, `authorize` | Yes | ADMIN | — | — |
| `PUT /api/media/:id` | `authenticate`, `authorize`, `uploadImage`, `validate` | Yes | ADMIN | — | — |
| `DELETE /api/media/:id` | `authenticate`, `authorize` | Yes | ADMIN | — | — |
| `GET /api/reviews/media/:slug` | `validate` (query) | No | — | — | — |
| `GET /api/reviews/media/:slug/mine` | `authenticate` | Yes | — | — | — |
| `POST /api/reviews` | `authenticate`, `validate` | Yes | — | — | — |
| `PUT /api/reviews/:id` | `authenticate`, `validate` | Yes | — | — | Ownership (inferred) |
| `DELETE /api/reviews/:id` | `authenticate` | Yes | — | — | Ownership (inferred) |
| `GET /api/reviews/mine` | `authenticate`, `validate` (query) | Yes | — | — | — |
| `GET /api/reviews/:id/comments` | None | No | — | — | — |
| `POST /api/reviews/:id/comments` | `authenticate`, `validate` | Yes | — | — | — |
| `DELETE /api/reviews/:id/comments/:commentId` | `authenticate` | Yes | — | — | Ownership (inferred) |
| `POST /api/reviews/:id/like` | `authenticate` | Yes | — | — | — |
| `GET /api/reviews/pending` | `authenticate`, `authorize`, `validate` (query) | Yes | ADMIN | — | — |
| `POST /api/reviews/:id/approve` | `authenticate`, `authorize` | Yes | ADMIN | — | — |
| `POST /api/reviews/:id/reject` | `authenticate`, `authorize` | Yes | ADMIN | — | — |
| `POST /api/watchlist` | `authenticate` | Yes | — | — | — |
| `DELETE /api/watchlist/:mediaId` | `authenticate` | Yes | — | — | — |
| `GET /api/watchlist` | `authenticate` | Yes | — | — | — |
| `GET /api/profile` | `authenticate` | Yes | — | — | — |
| `PUT /api/profile` | `authenticate`, `validate` | Yes | — | — | — |
| `GET /api/admin/dashboard` | `authenticate`, `authorize` | Yes | ADMIN | — | — |
| `POST /api/payments/checkout` | `authenticate` | Yes | — | — | — |
| `GET /api/payments/subscription` | `authenticate` | Yes | — | — | — |
| `POST /api/payments/cancel` | `authenticate` | Yes | — | — | — |
| `POST /api/upload/image` | `authenticate`, `authorize`, `uploadImage` | Yes | ADMIN | — | — |
| `DELETE /api/upload/:publicId(*)` | `authenticate`, `authorize` | Yes | ADMIN | — | — |
| `POST /api/webhooks/stripe` | `express.raw` | Stripe signature | — | — | — |
| `GET /api/health` | None | No | — | — | — |

---

## 12. Listing Page Capability Matrix

**Page:** `/browse` — Media listing

| Capability | Supported | Evidence |
|---|---|---|
| Search | ✅ Yes | Search input synced to URL `?search=...`, passed as `params.search` to `GET /media` |
| Media type filtering | ✅ Yes | Select dropdown (All/Movie/Series), synced to `?type=...` |
| Genre filtering | ✅ Yes | Select dropdown with hardcoded genre list, synced to `?genre=...` |
| Pricing filtering | ✅ Yes | Select dropdown (All/Free/Premium), synced to `?pricingType=...` |
| Rating filtering | ❌ No | No rating filter UI found |
| Sorting | ✅ Yes | Select dropdown (Latest/Popular/Top Rated/Year), synced to `?sortBy=...` |
| Pagination | ✅ Yes | Page navigation with prev/next, synced to `?page=...`, `limit: 12` |
| Backend-powered query params | ✅ Yes | All filters sent as query params to `GET /media` |
| Skeleton loading | ❌ No | Uses a simple spinner, not skeleton cards |
| Empty state | ✅ Yes | "No results found" message with reset button |
| Error state | ❌ No | No error boundary or error message for failed requests |
| Responsive grid | ✅ Yes | Grid classes: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` |
| Four cards per desktop row | ✅ Yes | `xl:grid-cols-4` |
| Consistent card heights | ⚠️ Partial | Cards use `aspect-[2/3]` for posters but content area varies |
| Backend data | ✅ Yes | All data from `GET /media` API |

---

## 13. Details Page Capability Matrix

**Page:** `/browse/[slug]` — Media detail

| Capability | Supported | Evidence |
|---|---|---|
| Public access | ✅ Yes | `optionalAuthenticate` middleware — renders for all users |
| Multiple images | ⚠️ Partial | Poster + backdrop only (2 images) |
| Description | ✅ Yes | Synopsis displayed |
| Metadata | ✅ Yes | Release year, director, cast, type, view count |
| Genres | ✅ Yes | Genre badges displayed |
| Ratings | ✅ Yes | Average rating with star display |
| Reviews | ✅ Yes | Review list with `ReviewList` component |
| Comments | ✅ Yes | `CommentSection` component on each review |
| Related media | ❌ No | No "related" or "similar" section found |
| Watchlist action | ✅ Yes | Toggle watchlist button with optimistic updates |
| Premium access state | ✅ Yes | Shows lock icon + upgrade CTA for premium content when user is free tier |
| Loading state | ✅ Yes | Spinner during data fetch |
| Error state | ✅ Yes | Error alert displayed |

---

## 14. Gladiator Page Coverage

| Required Page | Status | Route | Notes |
|---|---|---|---|
| Home page | **Complete** | `/` | Hero carousel, trending media, pricing CTA, FAQ |
| Explore/listing page | **Complete** | `/browse` | Full search, filter, sort, pagination |
| Public details page | **Complete** | `/browse/[slug]` | Media detail with reviews and comments |
| Login | **Complete** | `/login` | Form with validation |
| Registration | **Complete** | `/register` | Form with password strength indicator |
| Profile | **Complete** | `/profile` | View/edit profile, subscription status |
| Admin dashboard | **Complete** | `/admin` | KPIs, media management, review moderation |
| User dashboard | **Missing** | — | No dedicated user dashboard; profile page exists but no activity/history dashboard |
| About | **Missing** | — | No `/about` route |
| Contact | **Missing** | — | No `/contact` route |
| Blog | **Missing** | — | No `/blog` route |
| Help/support | **Missing** | — | No `/help` or `/support` route |
| Privacy policy | **Missing** | — | No `/privacy` route |
| Terms and conditions | **Missing** | — | No `/terms` route |

**Coverage:** 7/14 complete, 0 partial, 7 missing

---

## 15. Missing or Disconnected Routes

### Backend endpoints with no frontend caller:
1. **`GET /api/media/:slug/stream`** — Streaming endpoint exists but frontend media detail page does not call it. The page uses `streamingLink` from the media object directly.
2. **`POST /api/media/:slug/view`** — View count increment endpoint exists but no frontend code calls it.
3. **`DELETE /api/upload/:publicId(*)`** — Image deletion endpoint exists but no frontend admin UI calls it (orphaned images may accumulate).

### Frontend pages with no backend support:
1. **Notification bell** — Navbar has a notification bell with red dot, but no notification API or data model exists.

### Missing Gladiator pages:
1. `/about` — About page
2. `/contact` — Contact form
3. `/blog` — Blog/content listing
4. `/help` — Help/support page
5. `/privacy` — Privacy policy
6. `/terms` — Terms and conditions
7. `/dashboard` — User dashboard (activity, history)

---

## 16. Potential Route and Contract Mismatches

1. **Admin reviews page calls wrong endpoint for "all" filter:** When `filter === "all"`, the admin reviews page calls `GET /reviews/mine` instead of a general "all reviews" endpoint. This returns only the current user's reviews, not all reviews across the platform.
   - Evidence: `frontend/src/app/(dashboard)/admin/reviews/page.tsx` line ~30: `const endpoint = filter === "pending" ? "/reviews/pending" : "/reviews/mine"`

2. **No Zod validation on several endpoints:** The following endpoints have no request validation middleware:
   - `POST /api/watchlist` — no validation on `mediaId`
   - `DELETE /api/watchlist/:mediaId` — no validation on param
   - `GET /api/admin/dashboard` — no validation (acceptable for GET)
   - `POST /api/reviews/:id/like` — no validation on param
   - `POST /api/payments/checkout` — no validation on request body
   - `POST /api/payments/cancel` — no validation

3. **`POST /api/media/:slug/view` has no authentication but increments view count** — Could be abused for view count inflation.

4. **Comment deletion has no ownership verification in route definition** — `DELETE /api/reviews/:id/comments/:commentId` only checks `authenticate`, ownership check may be in the controller (requires deeper investigation).

5. **Upload routes vs. media creation** — Media creation uses `uploadImage` middleware directly on the media route, while a separate `/api/upload/image` endpoint also exists. The frontend uses the media route's multipart upload, making the standalone upload endpoint potentially unused.

---

## 17. Findings Requiring Deeper Investigation

1. **Ownership enforcement in controllers** — Routes like `PUT /api/reviews/:id` and `DELETE /api/reviews/:id` only have `authenticate` middleware. Ownership checks may exist in the controller/service layer but cannot be confirmed without reading those files.

2. **Premium content access control** — The `authorize({ subscription: "PREMIUM" })` middleware exists in `authorize.ts` but is not used on any route. Premium content restriction appears to be handled at the response level (returning `accessRestricted: true`).

3. **Password reset email delivery** — No email service exists. The `forgotPassword` controller may return the reset token directly in the API response.

4. **`GET /api/reviews/media/:slug/mine` vs `GET /api/reviews/mine`** — Two different "my reviews" endpoints exist. The first is per-media, the second is all reviews by the current user. The admin reviews page uses the second one incorrectly for the "all" filter.

5. **Footer content** — Only the first 80 lines of the footer were read. Additional link columns may exist.

6. **Home page data sources** — The home page has hardcoded hero carousel data (TMDB image URLs) mixed with API-fetched media. The relationship between hardcoded and dynamic content needs clarification.

7. **Streaming functionality** — `GET /api/media/:slug/stream` exists but no frontend streaming player was found. The `streamingLink` field in the media model stores a URL, but how it's rendered (iframe, video player, external redirect) needs investigation.

---

## 18. Recommended Next Discovery Pass

1. **Controller and service layer deep-dive** — Read all controllers and services to verify ownership checks, error handling, and response shapes.

2. **Authentication lifecycle trace** — Full trace from registration through login, token refresh, logout, and password reset. Verify cookie settings and token expiry handling.

3. **Database model inventory** — Map all Prisma models to API endpoints. Verify which models are actually queried and which are unused.

4. **Payment workflow trace** — Trace Stripe checkout → webhook → subscription update → access control enforcement.

5. **Home page content audit** — Determine what content is hardcoded vs. API-driven. Identify placeholder content.

6. **Streaming functionality** — Investigate how streaming links are displayed and whether a video player exists.

7. **Notification system** — Determine if the notification bell is purely decorative or if there's hidden functionality.
