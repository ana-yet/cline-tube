# CineTube Route Access Matrix

> **Discovery date:** 2026-07-13  
> **Reference:** `docs/clineteube-upgrade/01-route-and-api-inventory.md`

This document provides a concise route-by-role matrix for Guest, Authenticated User, Premium Subscriber, and Admin roles, covering both frontend pages and backend API endpoints.

---

## Legend

| Symbol | Meaning |
|---|---|
| ✅ | Access allowed |
| ❌ | Access denied (returns 401/403 or client-side redirect) |
| ⚠️ | Limited access (partial functionality or conditional) |
| 🔒 | Client-side only protection (no server enforcement on frontend page) |

---

## 1. Frontend Page Access Matrix

| Frontend Route | Guest | Authenticated User | Premium Subscriber | Admin | Protection Source |
|---|---|---|---|---|---|
| `/` (Home) | ✅ | ✅ | ✅ | ✅ | None — public |
| `/browse` (Listing) | ✅ | ✅ | ✅ | ✅ | None — public |
| `/browse/[slug]` (Detail) | ✅ | ✅ | ✅ (full access) | ✅ | `optionalAuthenticate` on API; premium content gated by subscription tier |
| `/pricing` | ✅ | ✅ | ✅ | ✅ | None — public |
| `/profile` | 🔒❌ | ✅ | ✅ | ✅ | Client-side: shows sign-in prompt for guests |
| `/watchlist` | 🔒❌ | ✅ | ✅ | ✅ | Client-side: shows sign-in prompt for guests |
| `/login` | ✅ | ✅ (redirects to `/`) | ✅ (redirects to `/`) | ✅ (redirects to `/`) | None — public |
| `/register` | ✅ | ✅ (redirects to `/`) | ✅ (redirects to `/`) | ✅ (redirects to `/`) | None — public |
| `/forgot-password` | ✅ | ✅ | ✅ | ✅ | None — public |
| `/reset-password` | ✅ | ✅ | ✅ | ✅ | None — public |
| `/admin` | 🔒❌ | 🔒❌ | 🔒❌ | ✅ | Client-side: admin layout checks `user.role === "ADMIN"` |
| `/admin/media` | 🔒❌ | 🔒❌ | 🔒❌ | ✅ | Client-side: inherits admin layout |
| `/admin/media/create` | 🔒❌ | 🔒❌ | 🔒❌ | ✅ | Client-side: inherits admin layout |
| `/admin/media/[id]/edit` | 🔒❌ | 🔒❌ | 🔒❌ | ✅ | Client-side: inherits admin layout |
| `/admin/reviews` | 🔒❌ | 🔒❌ | 🔒❌ | ✅ | Client-side: inherits admin layout |

**Key observations:**
- `/profile` and `/watchlist` have no server-side enforcement — a direct API call with no token would fail, but the page itself renders briefly before client-side redirect.
- Admin routes are protected only by client-side role check in the layout. Direct URL access by a non-admin user will show a spinner then redirect, but no server-side middleware prevents API calls.
- Login/Register pages do not redirect authenticated users (no client-side check).

---

## 2. Backend API Access Matrix

### Auth Endpoints

| Endpoint | Guest | Authenticated User | Premium Subscriber | Admin | Notes |
|---|---|---|---|---|---|
| `POST /api/auth/register` | ✅ | ✅ | ✅ | ✅ | Rate-limited (10/15min dev, 10/15min prod) |
| `POST /api/auth/login` | ✅ | ✅ | ✅ | ✅ | Rate-limited |
| `POST /api/auth/logout` | ✅ (cookie) | ✅ | ✅ | ✅ | Uses refresh token cookie |
| `POST /api/auth/refresh` | ✅ (cookie) | ✅ | ✅ | ✅ | Uses refresh token cookie |
| `GET /api/auth/me` | ❌ 401 | ✅ | ✅ | ✅ | Requires Bearer token |
| `POST /api/auth/forgot-password` | ✅ | ✅ | ✅ | ✅ | Rate-limited |
| `POST /api/auth/reset-password` | ✅ | ✅ | ✅ | ✅ | Rate-limited |

### Media Endpoints

| Endpoint | Guest | Authenticated User | Premium Subscriber | Admin | Notes |
|---|---|---|---|---|---|
| `GET /api/media` | ✅ | ✅ | ✅ | ✅ | Public listing with filters |
| `GET /api/media/genres` | ✅ | ✅ | ✅ | ✅ | Public genre list |
| `GET /api/media/:slug` | ✅ | ✅ | ✅ | ✅ | Public; optional auth for premium awareness |
| `GET /api/media/:slug/stream` | ❌ 401 | ✅ | ✅ | ✅ | Requires authentication |
| `POST /api/media/:slug/view` | ✅ | ✅ | ✅ | ✅ | No auth — increments view count |
| `POST /api/media` | ❌ 401 | ❌ 403 | ❌ 403 | ✅ | Admin only + multipart upload |
| `GET /api/media/by-id/:id` | ❌ 401 | ❌ 403 | ❌ 403 | ✅ | Admin only |
| `PUT /api/media/:id` | ❌ 401 | ❌ 403 | ❌ 403 | ✅ | Admin only + multipart upload |
| `DELETE /api/media/:id` | ❌ 401 | ❌ 403 | ❌ 403 | ✅ | Admin only |

### Review Endpoints

| Endpoint | Guest | Authenticated User | Premium Subscriber | Admin | Notes |
|---|---|---|---|---|---|
| `GET /api/reviews/media/:slug` | ✅ | ✅ | ✅ | ✅ | Public approved reviews |
| `GET /api/reviews/media/:slug/mine` | ❌ 401 | ✅ | ✅ | ✅ | Authenticated only |
| `POST /api/reviews` | ❌ 401 | ✅ | ✅ | ✅ | Authenticated + validated |
| `PUT /api/reviews/:id` | ❌ 401 | ✅ (own) | ✅ (own) | ✅ | Ownership check (in controller) |
| `DELETE /api/reviews/:id` | ❌ 401 | ✅ (own) | ✅ (own) | ✅ | Ownership check (in controller) |
| `GET /api/reviews/mine` | ❌ 401 | ✅ | ✅ | ✅ | Authenticated only |
| `GET /api/reviews/:id/comments` | ✅ | ✅ | ✅ | ✅ | Public comments |
| `POST /api/reviews/:id/comments` | ❌ 401 | ✅ | ✅ | ✅ | Authenticated + validated |
| `DELETE /api/reviews/:id/comments/:commentId` | ❌ 401 | ✅ (own) | ✅ (own) | ✅ | Ownership check (in controller) |
| `POST /api/reviews/:id/like` | ❌ 401 | ✅ | ✅ | ✅ | Authenticated — toggle |
| `GET /api/reviews/pending` | ❌ 401 | ❌ 403 | ❌ 403 | ✅ | Admin only |
| `POST /api/reviews/:id/approve` | ❌ 401 | ❌ 403 | ❌ 403 | ✅ | Admin only |
| `POST /api/reviews/:id/reject` | ❌ 401 | ❌ 403 | ❌ 403 | ✅ | Admin only |

### Watchlist Endpoints

| Endpoint | Guest | Authenticated User | Premium Subscriber | Admin | Notes |
|---|---|---|---|---|---|
| `GET /api/watchlist` | ❌ 401 | ✅ | ✅ | ✅ | Returns user's watchlist |
| `POST /api/watchlist` | ❌ 401 | ✅ | ✅ | ✅ | Add to watchlist |
| `DELETE /api/watchlist/:mediaId` | ❌ 401 | ✅ | ✅ | ✅ | Remove from watchlist |

### Profile Endpoints

| Endpoint | Guest | Authenticated User | Premium Subscriber | Admin | Notes |
|---|---|---|---|---|---|
| `GET /api/profile` | ❌ 401 | ✅ | ✅ | ✅ | Returns user profile + counts |
| `PUT /api/profile` | ❌ 401 | ✅ | ✅ | ✅ | Update profile fields |

### Admin Endpoints

| Endpoint | Guest | Authenticated User | Premium Subscriber | Admin | Notes |
|---|---|---|---|---|---|
| `GET /api/admin/dashboard` | ❌ 401 | ❌ 403 | ❌ 403 | ✅ | KPI data |

### Payment Endpoints

| Endpoint | Guest | Authenticated User | Premium Subscriber | Admin | Notes |
|---|---|---|---|---|---|
| `POST /api/payments/checkout` | ❌ 401 | ✅ | ✅ | ✅ | Creates Stripe checkout session |
| `GET /api/payments/subscription` | ❌ 401 | ✅ | ✅ | ✅ | Returns current subscription tier |
| `POST /api/payments/cancel` | ❌ 401 | ✅ | ✅ | ✅ | Cancels at period end |

### Upload Endpoints

| Endpoint | Guest | Authenticated User | Premium Subscriber | Admin | Notes |
|---|---|---|---|---|---|
| `POST /api/upload/image` | ❌ 401 | ❌ 403 | ❌ 403 | ✅ | Cloudinary upload |
| `DELETE /api/upload/:publicId(*)` | ❌ 401 | ❌ 403 | ❌ 403 | ✅ | Cloudinary delete |

### Webhook & Health Endpoints

| Endpoint | Guest | Authenticated User | Premium Subscriber | Admin | Notes |
|---|---|---|---|---|---|
| `POST /api/webhooks/stripe` | N/A | N/A | N/A | N/A | Stripe signature verified |
| `GET /api/health` | ✅ | ✅ | ✅ | ✅ | Public health check |

---

## 3. Access Control Summary Counts

### Frontend Pages

| Role | Accessible Pages | Total Pages |
|---|---|---|
| Guest | 8 (`/`, `/browse`, `/browse/[slug]`, `/pricing`, `/login`, `/register`, `/forgot-password`, `/reset-password`) | 15 |
| Authenticated User | 10 (+ `/profile`, `/watchlist`) | 15 |
| Premium Subscriber | 10 (same as authenticated) | 15 |
| Admin | 15 (all pages) | 15 |

### Backend Endpoints

| Role | Accessible Endpoints | Total Endpoints |
|---|---|---|
| Guest | 16 (public + auth + health) | 37 |
| Authenticated User | 27 | 37 |
| Premium Subscriber | 27 (same as authenticated — no premium-restricted endpoints) | 37 |
| Admin | 37 (all endpoints) | 37 |

### By Protection Level

| Level | Count |
|---|---|
| Public (no auth) | 16 endpoints |
| Authenticated (any role) | 11 endpoints |
| Premium-restricted | 0 endpoints |
| Admin-only | 10 endpoints |
| Total | 37 endpoints |

---

## 4. Access Control Concerns

1. **No server-side frontend route protection** — The Next.js middleware is a pass-through. All frontend protection is client-side, meaning:
   - Direct URL access to `/admin` by a non-admin user will briefly render the page before redirect.
   - API calls from browser dev tools are not blocked by the frontend.
   - Security depends entirely on backend endpoint protection.

2. **No premium-restricted backend endpoints** — The `authorize({ subscription: "PREMIUM" })` middleware exists but is not applied to any route. Premium content access appears to be controlled at the data level (returning `accessRestricted: true` in the response) rather than at the route level.

3. **`POST /api/media/:slug/view` is unauthenticated** — Anyone can inflate view counts by repeatedly calling this endpoint.

4. **Ownership checks are inferred, not confirmed** — Routes like `PUT /api/reviews/:id` only have `authenticate` middleware. Whether the controller checks `req.user.id === review.userId` requires reading the controller code.

5. **Login/Register pages don't redirect authenticated users** — A logged-in user visiting `/login` or `/register` will see the form (though submitting may fail or create duplicate sessions).

---

## 5. Role Capability Summary

| Capability | Guest | User | Premium | Admin |
|---|---|---|---|---|
| Browse media | ✅ | ✅ | ✅ | ✅ |
| Search/filter media | ✅ | ✅ | ✅ | ✅ |
| View media details | ✅ | ✅ | ✅ | ✅ |
| View reviews | ✅ | ✅ | ✅ | ✅ |
| View comments | ✅ | ✅ | ✅ | ✅ |
| Create account | ✅ | — | — | — |
| Log in | ✅ | — | — | — |
| Write reviews | ❌ | ✅ | ✅ | ✅ |
| Edit own reviews | ❌ | ✅ | ✅ | ✅ |
| Delete own reviews | ❌ | ✅ | ✅ | ✅ |
| Like reviews | ❌ | ✅ | ✅ | ✅ |
| Post comments | ❌ | ✅ | ✅ | ✅ |
| Delete own comments | ❌ | ✅ | ✅ | ✅ |
| Manage watchlist | ❌ | ✅ | ✅ | ✅ |
| Edit profile | ❌ | ✅ | ✅ | ✅ |
| View own subscription | ❌ | ✅ | ✅ | ✅ |
| Subscribe to premium | ❌ | ✅ | ✅ | ✅ |
| Cancel subscription | ❌ | ✅ | ✅ | ✅ |
| Access premium content | ❌ | ❌ | ✅ | ✅ |
| Stream media | ❌ | ✅ | ✅ | ✅ |
| Create media | ❌ | ❌ | ❌ | ✅ |
| Edit media | ❌ | ❌ | ❌ | ✅ |
| Delete media | ❌ | ❌ | ❌ | ✅ |
| Approve/reject reviews | ❌ | ❌ | ❌ | ✅ |
| View admin dashboard | ❌ | ❌ | ❌ | ✅ |
| Upload images | ❌ | ❌ | ❌ | ✅ |
| Delete images | ❌ | ❌ | ❌ | ✅ |
| View pending reviews | ❌ | ❌ | ❌ | ✅ |
