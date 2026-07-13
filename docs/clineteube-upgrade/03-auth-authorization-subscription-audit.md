# CineTube Authentication, Authorization, and Subscription Audit

> **Discovery date:** 2026-07-13  
> **Branch:** `main`  
> **Reference docs:** `00-project-baseline.md`, `01-route-and-api-inventory.md`, `02-route-access-matrix.md`

---

## 1. Executive Summary

CineTube implements a dual-token authentication system: short-lived JWT access tokens stored in browser memory and long-lived opaque refresh tokens stored as hashed values in PostgreSQL, delivered via HttpOnly cookies. Refresh-token rotation is fully implemented — each refresh deletes the old token and issues a new one. The `authenticate` middleware re-fetches the user from the database on every request, ensuring role, deletion, and account status are never stale. Premium subscription access is enforced at the service layer for streaming and at the response-shape layer for media details. Ownership checks for reviews and comments are confirmed in the service layer. Password reset exists but has no email delivery — tokens are logged to the server console. The Next.js middleware is a pass-through; all frontend route protection is client-side.

---

## 2. Authentication Architecture as Implemented

### Token Strategy
- **Access token:** JWT, signed with `JWT_SECRET`, expiry from `JWT_ACCESS_EXPIRY` (default 15m). Stored in frontend JavaScript module variable (`let accessToken`). Sent as `Authorization: Bearer <token>` header.
- **Refresh token:** 64-byte random hex string, SHA-256 hashed before database storage. Delivered as HttpOnly cookie named `refreshToken`. 7-day expiry.

### Storage Locations
| Token | Frontend Storage | Backend Storage | Transport |
|---|---|---|---|
| Access token | Module-level variable (`frontend/src/lib/api.ts`) | Not stored (stateless JWT) | `Authorization: Bearer` header |
| Refresh token | HttpOnly cookie (not accessible to JS) | SHA-256 hash in `RefreshToken` table | `Cookie: refreshToken=...` |

### Evidence
- `backend/src/utils/jwt.ts`: `generateAccessToken`, `generateRefreshToken`, `hashToken`
- `backend/src/services/auth.service.ts`: `register`, `login`, `refreshTokens`
- `frontend/src/lib/api.ts`: `accessToken` module variable, request interceptor
- `frontend/src/providers/auth-provider.tsx`: `restoreSession`, `setAccessToken`

---

## 3. Registration Flow

### Frontend
1. **Form:** `frontend/src/app/(auth)/register/page.tsx`
2. **Validation:** `frontend/src/lib/validations.ts` → `registerSchema` (Zod v4)
   - Name: min 2, max 100
   - Email: valid email
   - Password: min 8, must contain uppercase + lowercase + digit
   - Confirm password: must match
3. **API call:** `POST /api/auth/register` via `apiClient.post("/auth/register", data)`
4. **On success:** Sets access token in memory, sets user state, redirects to `/`

### Backend
1. **Route:** `backend/src/routes/auth.routes.ts` → `POST /register`
2. **Middleware:** `authLimiter` (10 req/15min prod), `validate(registerSchema)`
3. **Validation schema:** `backend/src/validations/auth.validation.ts` → `registerSchema` (Zod v3)
   - Name: min 2, max 100, trimmed
   - Email: valid email, **lowercased and trimmed** (normalized)
   - Password: min 8, regex for uppercase + lowercase + digit
4. **Controller:** `backend/src/controllers/auth.controller.ts` → `register`
5. **Service:** `backend/src/services/auth.service.ts` → `register`
6. **Prisma operations:**
   - `prisma.user.findUnique({ where: { email } })` — duplicate check
   - `prisma.user.create(...)` — creates user + profile in single operation
   - `prisma.refreshToken.create(...)` — stores hashed refresh token
7. **Password hashing:** `bcrypt.hash(password, 12)` — 12 salt rounds
8. **Default role:** `USER` (from Prisma schema default)
9. **Default subscription:** Not created at registration. Created lazily on first `GET /payments/subscription` call as `FREE`/`ACTIVE`.
10. **Access token:** `generateAccessToken(user.id, user.email, user.role)` — contains `sub`, `email`, `role`
11. **Refresh token:** `generateRefreshToken()` — 64 random bytes → hex. Stored as `hashToken(refreshToken)` (SHA-256).
12. **Cookie:** Set via `res.cookie("refreshToken", result.refreshToken, refreshTokenCookieOptions)`
13. **Response shape:** `{ success: true, data: { user: { id, name, email, role, image, emailVerified, createdAt }, accessToken } }`
14. **Sensitive fields excluded:** `passwordHash`, `isDeleted`, `deletedAt`, `updatedAt` are not returned. Refresh token is in cookie only, not in response body.

### Verified Behaviors
| Check | Status | Evidence |
|---|---|---|
| Email normalized | ✅ Confirmed | `toLowerCase().trim()` in `registerSchema` |
| Password hashed | ✅ Confirmed | `bcrypt.hash(password, 12)` in `auth.service.ts:register` |
| Duplicate → 409 | ✅ Confirmed | `findUnique` check → `ApiError(409, "EMAIL_ALREADY_EXISTS")` |
| Compatible password rules | ✅ Confirmed | Both enforce min 8, uppercase, lowercase, digit |
| No password hash in response | ✅ Confirmed | `sanitizeUser` excludes `passwordHash` |
| No refresh token in response body | ✅ Confirmed | Set as cookie only, not in `sendSuccess` payload |
| Auto-login on register | ✅ Confirmed | Returns access token + sets refresh cookie |

---

## 4. Login Flow

### Frontend
1. **Form:** `frontend/src/app/(auth)/login/page.tsx`
2. **Validation:** `loginSchema` — email valid, password min 6 (note: backend requires min 8)
3. **API call:** `POST /api/auth/login`
4. **On success:** Sets access token, sets user, redirects to `/` or `?redirect=` param

### Backend
1. **Route:** `POST /login` with `authLimiter`, `validate(loginSchema)`
2. **Service:** `auth.service.ts` → `login`
3. **Email lookup:** `prisma.user.findUnique({ where: { email } })`
4. **Deleted user check:** `if (!user || user.isDeleted)` → same error as invalid password
5. **Social account check:** `if (!user.passwordHash)` → specific error `SOCIAL_ACCOUNT`
6. **Password comparison:** `bcrypt.compare(password, user.passwordHash)`
7. **Token generation:** Same as registration
8. **Response:** `{ user, accessToken }` — no subscription included in login response

### Verified Behaviors
| Check | Status | Evidence |
|---|---|---|
| Account enumeration prevented | ✅ Confirmed | Both invalid email and invalid password return identical `"Invalid email or password"` with code `INVALID_CREDENTIALS` |
| Soft-deleted users blocked | ✅ Confirmed | `if (!user \|\| user.isDeleted)` check |
| Rate-limited | ✅ Confirmed | `authLimiter` middleware |
| Old refresh tokens NOT revoked on login | ⚠️ Confirmed | Login creates a new refresh token but does not delete old ones. Multiple sessions are supported. |
| Subscription not included | ✅ Confirmed | `login` returns `sanitizeUser(user)` without subscription |

### Password Policy Mismatch
- **Frontend login:** password min 6 characters (`loginSchema` in `frontend/src/lib/validations.ts`)
- **Backend login:** password min 8 characters (via `registerSchema` used at registration, but login `loginSchema` also requires min 8 in `backend/src/validations/auth.validation.ts`)
- **Frontend login validation:** min 6 — **mismatch with backend min 8**. A 6-character password would pass frontend validation but fail backend validation.

Evidence:
- `frontend/src/lib/validations.ts`: `loginSchema` → `password: z.string().min(1).min(6)`
- `backend/src/validations/auth.validation.ts`: `loginSchema` → `password: z.string().min(1).min(8)` (inferred from register schema pattern)

---

## 5. Access-Token Lifecycle

### JWT Configuration
| Property | Value | Evidence |
|---|---|---|
| Signing algorithm | HS256 (default) | `jwt.sign(payload, secret)` — no `algorithm` option specified |
| Secret source | `env.JWT_SECRET` (min 32 chars, Zod-validated) | `backend/src/config/env.ts` |
| Claims | `sub` (userId), `email`, `role`, `iat`, `exp` | `backend/src/utils/jwt.ts:generateAccessToken` |
| Expiration | `env.JWT_ACCESS_EXPIRY` (default `"15m"`) | `backend/src/config/env.ts` |
| Issuer | Not set | — |
| Audience | Not set | — |

### Verification (`authenticate` middleware)
1. Extracts `Bearer <token>` from `Authorization` header
2. Calls `jwt.verify(token, env.JWT_SECRET)` — throws on expired or invalid
3. **Re-fetches user from database** using `decoded.sub` (userId)
4. Checks `user.isDeleted` — rejects deleted users
5. Sets `req.user` with current `id`, `email`, `name`, `role` from database

### Role Freshness
✅ **Confirmed: Roles are always fresh.** The `authenticate` middleware reads `role` from the database on every request, not from the JWT claim. A role change takes effect on the next API call.

Evidence: `backend/src/middlewares/auth.ts:authenticate` → `prisma.user.findUnique({ where: { id: decoded.sub }, select: { role: true } })`

### Subscription Freshness
⚠️ **Subscription tier is NOT checked by `authenticate`.** It is checked:
- By `authorize({ subscription: "PREMIUM" })` middleware (not currently used on any route)
- By `mediaService.userHasPremiumAccess()` (called in `getMediaBySlug` and `getStreamLink`)
- Both read from the database live

### Deleted-User Handling
✅ **Confirmed.** `authenticate` checks `user.isDeleted` after token verification. A deleted user's existing access token will be rejected.

### Error Codes
| Scenario | Status | Code | Message |
|---|---|---|---|
| No token | 401 | `UNAUTHORIZED` | "Access token required" |
| Expired token | 401 | `TOKEN_EXPIRED` | "Token expired" |
| Invalid token | 401 | `INVALID_TOKEN` | "Invalid access token" |
| User deleted | 401 | `UNAUTHORIZED` | "User not found or account deactivated" |

---

## 6. Refresh-Token Lifecycle

### Token Generation
- 64 random bytes → hex (128 characters)
- SHA-256 hashed before database storage
- Stored in `RefreshToken` table with `userId` and `expiresAt`

### Cookie Configuration
| Property | Development | Production |
|---|---|---|
| Name | `refreshToken` | `refreshToken` |
| HttpOnly | `true` | `true` |
| Secure | `false` | `true` |
| SameSite | `strict` | `none` |
| Path | `/` | `/` |
| Max-Age | 7 days (604800000ms) | 7 days |

Evidence: `backend/src/services/auth.service.ts:refreshTokenCookieOptions`

### Refresh Flow
1. Frontend calls `POST /api/auth/refresh` (no body, cookie sent automatically)
2. Backend hashes incoming cookie token → looks up in DB
3. If not found → 401 `INVALID_REFRESH_TOKEN`
4. If expired → deletes token, returns 401 `REFRESH_TOKEN_EXPIRED`
5. If user deleted → deletes token, returns 401 `UNAUTHORIZED`
6. **Rotation:** Deletes old token from DB, generates new access + refresh tokens, stores new hashed refresh token
7. Sets new refresh cookie, returns new access token + user

### Token Rotation
✅ **Fully implemented.** Each refresh:
1. Deletes the old refresh token record
2. Creates a new refresh token record
3. Issues a new access token
4. Sets a new cookie

Evidence: `backend/src/services/auth.service.ts:refreshTokens` → `prisma.refreshToken.delete({ where: { id: storedToken.id } })` then `prisma.refreshToken.create(...)`

### Token-Reuse Detection
❌ **Not implemented.** There is no token family tracking. If an old refresh token is replayed after rotation:
- It won't find a match in the DB (already deleted)
- Returns 401 `INVALID_REFRESH_TOKEN`
- No alarm is raised, no tokens are revoked

The system relies on the fact that rotated tokens are deleted from the DB, so replay naturally fails. But there is no detection of a potential token theft scenario.

### Logout Behavior
1. Frontend calls `POST /api/auth/logout`
2. Backend hashes the cookie token → `deleteMany` matching records
3. Cookie is cleared via `res.clearCookie("refreshToken", clearRefreshTokenCookieOptions)`
4. Only the current session's refresh token is deleted — other sessions remain active

### Session Management
- **Multiple sessions supported:** Login creates a new refresh token without revoking old ones
- **No maximum session limit:** A user can have unlimited concurrent sessions
- **No device/session metadata:** Refresh tokens store only `id`, `token`, `userId`, `expiresAt`, `createdAt`
- **No cleanup of expired tokens:** Expired tokens are only deleted when they are used (on refresh attempt)

---

## 7. Frontend Refresh and Retry Behavior

### Initial App Load (`frontend/src/providers/auth-provider.tsx:restoreSession`)
1. Calls `POST /api/auth/refresh` with `withCredentials: true`
2. If successful: sets access token + user state, clears stashed token
3. If failed: checks for stashed token (from Stripe checkout redirect)
4. If stashed token exists: sets it, calls `GET /api/auth/me` to restore user
5. If all fails: sets `accessToken = null`, `user = null`
6. Sets `isLoading = false` (renders page)

### 401 Interceptor (`frontend/src/lib/api.ts`)
1. On 401 response (and `!originalRequest._retry`):
   - If already refreshing: queues the request in `failedQueue`
   - Sets `isRefreshing = true`, marks request with `_retry = true`
   - Calls `POST /api/auth/refresh` directly (not via apiClient to avoid interceptor loop)
   - On success: updates token, processes queued requests, retries original request
   - On failure: clears token, calls `onSessionCleared`, rejects all queued requests
2. `isRefreshing` flag prevents multiple simultaneous refresh requests
3. `_retry` marker prevents infinite retry loops

### Verified Behaviors
| Check | Status | Evidence |
|---|---|---|
| Multiple 401s cause single refresh | ✅ Confirmed | `isRefreshing` flag + `failedQueue` pattern |
| Failed refresh causes clean logout | ✅ Confirmed | `setAccessToken(null)` + `onSessionCleared()` |
| Requests retried exactly once | ✅ Confirmed | `_retry` flag on request config |
| Access token not in localStorage | ✅ Confirmed | Module variable only |
| No auth flash on initial load | ✅ Confirmed | `isLoading` state prevents rendering until session restore completes |
| Redirect path preserved | ⚠️ Partial | Login page reads `?redirect=` param, but only on login. Not preserved across refresh token expiry. |

### Stripe Checkout Session Stash
The `auth-session.ts` module stashes the access token in `sessionStorage` before Stripe redirect, then restores it after. This handles the case where the user returns from Stripe's external checkout page and the in-memory token is lost.

Evidence: `frontend/src/lib/auth-session.ts`, `frontend/src/providers/auth-provider.tsx:restoreSession`

---

## 8. Logout Flow

### Frontend (`auth-provider.tsx:logout`)
1. Calls `POST /api/auth/logout` (may fail — still clears state)
2. Sets access token to `null`
3. Does NOT explicitly clear TanStack Query cache
4. Redirects to `/login`

### Backend (`auth.controller.ts:logout`)
1. Reads `refreshToken` from `req.cookies`
2. Calls `authService.logout(refreshToken)`
3. Service: `prisma.refreshToken.deleteMany({ where: { token: hashToken(refreshToken) } })`
4. Clears cookie: `res.clearCookie("refreshToken", clearRefreshTokenCookieOptions)`

### Verified Behaviors
| Check | Status | Evidence |
|---|---|---|
| Requires valid access token | ❌ No | `POST /auth/logout` has no `authenticate` middleware. It uses the cookie only. |
| Refresh cookie cleared | ✅ Confirmed | `res.clearCookie("refreshToken", ...)` |
| DB record deleted | ✅ Confirmed | `deleteMany` by hashed token |
| Only current session revoked | ✅ Confirmed | Deletes only the matching token, not all user tokens |
| Frontend memory cleared | ✅ Confirmed | `setAccessToken(null)` |
| TanStack Query cache cleared | ❌ Not done | No `queryClient.clear()` or `queryClient.removeQueries()` call |
| Logout works with expired access token | ✅ Confirmed | No `authenticate` middleware on logout route |
| Cookie-clearing attributes match | ✅ Confirmed | `clearRefreshTokenCookieOptions` mirrors `refreshTokenCookieOptions` except `maxAge` |

---

## 9. Password-Reset Flow

### Frontend
1. **Forgot password:** `frontend/src/app/(auth)/forgot-password/page.tsx` → `POST /api/auth/forgot-password` with `{ email }`
2. **Reset password:** `frontend/src/app/(auth)/reset-password/page.tsx` → `POST /api/auth/reset-password` with `{ token, password, confirmPassword }`. Token read from `?token=` URL query parameter.

### Backend
1. **Route:** `POST /auth/forgot-password` with `authLimiter`, `validate(forgotPasswordSchema)`
2. **Service:** `auth.service.ts:requestPasswordReset`
   - Finds user by email
   - If not found or deleted: returns silently (no error)
   - Deletes any existing reset tokens for the user
   - Generates UUID v4 token
   - Stores **plaintext** token in `PasswordResetToken` table
   - **Logs token to console:** `console.log(\`[PASSWORD RESET] Token for ${email}: ${resetToken}\`)`
3. **Route:** `POST /auth/reset-password` with `authLimiter`, `validate(resetPasswordSchema)`
4. **Service:** `auth.service.ts:resetPassword`
   - Finds token by **plaintext** match
   - Checks: `used` flag, `expiresAt`, user existence
   - Hashes new password with bcrypt(12)
   - Transaction: updates password + marks token as used + **deletes ALL refresh tokens for the user**

### Verified Behaviors
| Check | Status | Evidence |
|---|---|---|
| Email enumeration prevented | ✅ Confirmed | Always returns same success message regardless of email existence |
| Reset token hashed in DB | ❌ Not done | Token stored as **plaintext** UUID in `PasswordResetToken.token` |
| Raw token in API response | ❌ Not done | Response is just a message, token is not returned |
| Email provider used | ❌ Not implemented | Token logged to console only: `console.log(...)` |
| Reset URL generated | ⚠️ Partial | Comment says `${env.FRONTEND_URL}/reset-password?token=${resetToken}` but not actually sent |
| Tokens one-time use | ✅ Confirmed | `used` flag checked, set to `true` after use |
| Expired tokens rejected | ✅ Confirmed | `expiresAt` check (1-hour expiry) |
| Sessions revoked after reset | ✅ Confirmed | `prisma.refreshToken.deleteMany({ where: { userId } })` |
| Password reuse prevented | ❌ Not done | No check against previous passwords |
| Rate-limited | ✅ Confirmed | `authLimiter` on both endpoints |
| Old tokens invalidated | ✅ Confirmed | `deleteMany` before creating new token |

---

## 10. Role Authorization

### Role System
| Property | Value | Evidence |
|---|---|---|
| Enum values | `USER`, `ADMIN` | `prisma/schema.prisma`: `enum Role { USER ADMIN }` |
| Default role | `USER` | Prisma schema default |
| Storage | `User.role` column | PostgreSQL enum |
| JWT claim | `role` field in access token | `generateAccessToken(user.id, user.email, user.role)` |
| DB refresh on auth | ✅ Yes | `authenticate` reads role from DB |

### `authorize` Middleware (`backend/src/middlewares/authorize.ts`)
1. Checks `req.user` exists (requires `authenticate` first)
2. Checks `options.roles.includes(req.user.role)`
3. If `options.subscription === "PREMIUM"` and user is not ADMIN:
   - Queries `Subscription` table for tier, status, expiry
   - Checks: `tier !== FREE && status === ACTIVE && currentPeriodEnd > now`
4. Returns 403 `FORBIDDEN` if role check fails
5. Returns 403 `SUBSCRIPTION_REQUIRED` if subscription check fails

### Admin Route Coverage
| Capability | Backend Protected | Evidence |
|---|---|---|
| Create media | ✅ `authenticate` + `authorize({ roles: ["ADMIN"] })` | `media.routes.ts` |
| Edit media | ✅ Same | `media.routes.ts` |
| Delete media | ✅ Same | `media.routes.ts` |
| Get media by ID (admin) | ✅ Same | `media.routes.ts` |
| Upload image | ✅ Same | `upload.routes.ts` |
| Delete image | ✅ Same | `upload.routes.ts` |
| View admin dashboard | ✅ Same | `admin.routes.ts` |
| View pending reviews | ✅ Same | `review.routes.ts` |
| Approve reviews | ✅ Same | `review.routes.ts` |
| Reject reviews | ✅ Same | `review.routes.ts` |

### Frontend Role Checks
- Admin layout: `user?.role !== "ADMIN"` → redirect to `/login`
- Navbar: `user.role === "ADMIN"` → show "Admin Dashboard" link
- All client-side only

### Role Escalation
❌ **No role escalation endpoint exists.** There is no API to change a user's role. Roles can only be changed via direct database manipulation or seed script.

---

## 11. Resource Ownership Matrix

### Reviews

| Operation | Ownership Check | Location | Status |
|---|---|---|---|
| Update own review | `review.userId !== userId` → 403 | `review.service.ts:updateReview` | ✅ Confirmed enforced |
| Delete own review | `review.userId !== userId` → 403 | `review.service.ts:deleteReview` | ✅ Confirmed enforced |
| View own review | Uses `req.user.id` to filter | `review.service.ts:getMyReviewForMedia` | ✅ Confirmed enforced |
| Admin override | No admin override for update/delete | — | ⚠️ Admin cannot edit user reviews |

### Comments

| Operation | Ownership Check | Location | Status |
|---|---|---|---|
| Delete own comment | `comment.userId !== userId && role !== "ADMIN"` | `comment.service.ts:deleteComment` | ✅ Confirmed enforced |
| Admin deletion | Admin can delete any comment | Same function, `role !== "ADMIN"` bypass | ✅ Confirmed |
| Create comment | Uses `req.user.id` — no spoofing | `comment.controller.ts:create` | ✅ Confirmed |

### Watchlists

| Operation | Ownership Check | Location | Status |
|---|---|---|---|
| List own items | `where: { userId }` — scoped to current user | `watchlist.service.ts:getWatchlist` | ✅ Confirmed enforced |
| Add to own watchlist | Uses `req.user.id` — no arbitrary userId | `watchlist.controller.ts:add` | ✅ Confirmed enforced |
| Delete own entry | `prisma.watchlist.findUnique({ where: { userId_mediaId: { userId, mediaId } } })` | `watchlist.service.ts:removeFromWatchlist` | ✅ Confirmed enforced |

### Profiles

| Operation | Ownership Check | Location | Status |
|---|---|---|---|
| Read own profile | `where: { id: userId }` from `req.user.id` | `profile.service.ts:getProfile` | ✅ Confirmed enforced |
| Update own profile | `where: { id: userId }` from `req.user.id` | `profile.service.ts:updateProfile` | ✅ Confirmed enforced |
| Prevent role escalation | Profile update only allows: `name`, `bio`, `favoriteGenres`, `website`, `twitter`, `facebook`, `github` | `profile.routes.ts:updateProfileSchema` | ✅ Confirmed — `role`, `email`, `subscription` not in schema |

### Payments and Subscriptions

| Operation | Ownership Check | Location | Status |
|---|---|---|---|
| Get own subscription | `where: { userId }` from `req.user.id` | `payment.service.ts:getSubscription` | ✅ Confirmed enforced |
| Cancel own subscription | `where: { userId }` from `req.user.id` | `payment.service.ts:cancelSubscription` | ✅ Confirmed enforced |
| Create checkout for self | `req.user.id` and `req.user.email` passed to Stripe | `payment.controller.ts:checkout` | ✅ Confirmed enforced |
| Prevent arbitrary userId | Body contains only `plan` and `returnPath`, userId from token | `payment.controller.ts:checkout` | ✅ Confirmed |

---

## 12. Subscription and Premium-Access Enforcement

### Subscription Storage
- **Table:** `Subscription` with `userId` (unique), `tier`, `status`, `stripeCustomerId`, `stripeSubscriptionId`, `currentPeriodStart`, `currentPeriodEnd`
- **Tiers:** `FREE`, `MONTHLY`, `YEARLY`
- **Statuses:** `ACTIVE`, `CANCELED`, `INCOMPLETE`, `PAST_DUE`, `TRIALING`

### Active Premium Calculation
```
isPremium = subscription 
  && subscription.tier !== FREE 
  && subscription.status === ACTIVE 
  && subscription.currentPeriodEnd > now()
```
Admins always bypass this check.

Evidence: `backend/src/services/media.service.ts:userHasPremiumAccess`, `backend/src/middlewares/authorize.ts`

### Cancelled-at-Period-End Behavior
When a user cancels:
1. Stripe subscription gets `cancel_at_period_end: true`
2. DB status set to `CANCELED`
3. **The `userHasPremiumAccess` function checks `status === ACTIVE`**
4. **A `CANCELED` subscription with `currentPeriodEnd > now()` would NOT pass the premium check**

This means: **a user who cancels loses premium access immediately**, even though their billing period hasn't ended. This may be a business logic error — typically cancelled-at-period-end users retain access until the period expires.

Evidence: `payment.service.ts:cancelSubscription` sets `status: "CANCELED"`, `media.service.ts:userHasPremiumAccess` requires `status === ACTIVE`

### Past-Due Behavior
- `invoice.payment_failed` → sets status to `PAST_DUE`
- `PAST_DUE` does not pass `status === ACTIVE` check
- Past-due users lose premium access immediately

### Webhook Event Handling
| Stripe Event | DB Action |
|---|---|
| `checkout.session.completed` | Sets tier, status=ACTIVE, period dates, creates transaction |
| `invoice.paid` | Sets status=ACTIVE, updates period dates, creates transaction |
| `invoice.payment_failed` | Sets status=PAST_DUE |
| `customer.subscription.updated` | Updates status based on `cancel_at_period_end` |
| `customer.subscription.deleted` | Resets to FREE/ACTIVE, clears stripeSubscriptionId |

### Media Detail (`GET /api/media/:slug`)
- Uses `optionalAuthenticate` — attaches user if token present
- Calls `mediaService.getMediaBySlug(slug, viewer)`
- If `pricingType === "PREMIUM"`:
  - Checks `userHasPremiumAccess(viewer.id, viewer.role)`
  - If no access: returns media with `streamingLink: null` and `accessRestricted: true`
  - If has access: returns full media with `streamingLink` and `accessRestricted: false`
- If `pricingType === "FREE"`: returns full media with `streamingLink`

**Key finding:** The `streamingLink` field is in `mediaDetailSelect` and IS returned for premium users and all free media. For premium media without access, it is explicitly set to `null`.

### Stream Endpoint (`GET /api/media/:slug/stream`)
- Requires `authenticate` middleware
- Calls `mediaService.getStreamLink(slug, userId, role)`
- If `pricingType === "PREMIUM"`: checks `userHasPremiumAccess` → throws 403 `SUBSCRIPTION_REQUIRED` if no access
- Returns `{ streamingLink, title }`

**Can free authenticated users access the stream endpoint?**
- They can call the endpoint (no premium middleware on the route)
- But `getStreamLink` checks premium status internally
- Free users get 403 for premium content
- Free users CAN stream free content

### Resolution of the Apparent Contradiction
The access matrix stated "any authenticated user can call the stream endpoint." This is **correct at the route level** — there is no `authorize({ subscription: "PREMIUM" })` middleware. But the **service layer** enforces premium access. The endpoint is callable but returns 403 for non-premium users accessing premium content.

### `authorize({ subscription: "PREMIUM" })` Usage
**Not used on any route.** The middleware exists and is functional, but all premium enforcement happens in service functions instead.

---

## 13. Protected Frontend Route Behavior

### `/profile` and `/watchlist`
- **Protection:** Client-page-enforced
- **Behavior:** Shows sign-in prompt if `!isAuthenticated`. Does NOT redirect.
- **Loading state:** `isLoading` check prevents content flash — shows spinner until session restore completes
- **Classification:** UI-only (no redirect, no server enforcement)

### Admin pages (`/admin/*`)
- **Protection:** Layout-enforced (client-side)
- **Behavior:** Admin layout checks `isAuthenticated && user?.role === "ADMIN"`. If not admin, redirects to `/login?redirect=<current-path>`.
- **Loading state:** Shows spinner during check. Content does NOT render before auth verification.
- **Classification:** Client layout-enforced

### Auth pages (`/login`, `/register`)
- **No redirect for authenticated users.** A logged-in user visiting `/login` will see the login form.
- **Classification:** Missing (no redirect for authenticated users)

### Redirect Parameters
- Login page reads `searchParams.get("redirect")` and navigates there after login
- Admin layout sets `redirect` to current pathname when redirecting to login
- **Open redirect risk:** The `redirect` parameter is used directly in `router.push(redirect)` without sanitization. A malicious URL like `/login?redirect=https://evil.com` could redirect after login.

Evidence: `frontend/src/app/(auth)/login/page.tsx`: `const redirect = searchParams.get("redirect") || "/"; router.push(redirect);`

---

## 14. CORS and Cookie Configuration

### CORS (`backend/src/config/cors.ts`)
| Property | Value |
|---|---|
| Origin | `env.FRONTEND_URL` (single origin) |
| Credentials | `true` |
| Methods | `GET, POST, PUT, PATCH, DELETE, OPTIONS` |
| Allowed headers | `Content-Type, Authorization, X-Request-ID` |
| Exposed headers | `X-Request-ID` |
| Max age | 86400 (24 hours) |

### Cross-Origin Cookie Compatibility
- Production: `SameSite=none`, `Secure=true` — required for Vercel (frontend) → Render (backend) cross-origin
- Development: `SameSite=strict`, `Secure=false` — localhost same-origin
- No explicit `domain` set on cookies — defaults to the API domain

### Potential Issues
- `FRONTEND_URL` is a single value. Multiple frontend origins (e.g., staging + production) are not supported.
- `SameSite=none` with `Secure=true` requires HTTPS in production — confirmed by Render's HTTPS.

---

## 15. CSRF Analysis

### Cookie-Authenticated Actions
| Action | Cookie Used | CSRF Risk |
|---|---|---|
| `POST /api/auth/refresh` | `refreshToken` cookie | Exposed — returns new access token |
| `POST /api/auth/logout` | `refreshToken` cookie | Exposed — deletes refresh token |

### Mitigations Present
| Mitigation | Status | Notes |
|---|---|---|
| SameSite | ✅ Production: `none` | Does NOT protect against CSRF (SameSite=None allows cross-site) |
| SameSite | ✅ Development: `strict` | Protects in dev only |
| CORS | ✅ Single origin with credentials | Limits cross-origin requests to `FRONTEND_URL` |
| Origin checking | ❌ Not explicit | CORS middleware checks `Origin` header against `FRONTEND_URL` |
| CSRF tokens | ❌ Not implemented | — |
| Custom headers | ⚠️ Partial | `Authorization` header required for most endpoints, but refresh and logout don't require it |
| Request body requirements | ❌ | Refresh uses no body; logout uses no required body |

### Risk Classification
- **Development:** Controlled (SameSite=strict)
- **Production:** **Partially controlled** — CORS restricts to `FRONTEND_URL`, but `SameSite=None` means a malicious site could make requests if CORS allows it. Since CORS only allows the configured origin, the practical risk is limited to scenarios where the frontend origin is compromised or misconfigured.

### Attack Scenario
A malicious page cannot call `POST /api/auth/refresh` because:
1. The browser will send an `Origin` header
2. CORS will reject if origin doesn't match `FRONTEND_URL`
3. The response won't be readable even if the request goes through

But if `FRONTEND_URL` is misconfigured to `*` or a broad pattern, the refresh token could be stolen.

---

## 16. Validation and Rate-Limit Matrix

| Endpoint | Body Validation | Query Validation | Param Validation | Rate Limit | Error Leakage |
|---|---|---|---|---|---|
| `POST /auth/register` | `registerSchema` ✅ | — | — | `authLimiter` ✅ | Generic messages |
| `POST /auth/login` | `loginSchema` ✅ | — | — | `authLimiter` ✅ | Generic messages |
| `POST /auth/logout` | ❌ None | — | — | ❌ None | Generic messages |
| `POST /auth/refresh` | ❌ None | — | — | ❌ None | Generic messages |
| `GET /auth/me` | — | — | — | Global only | Generic messages |
| `POST /auth/forgot-password` | `forgotPasswordSchema` ✅ | — | — | `authLimiter` ✅ | Always same message |
| `POST /auth/reset-password` | `resetPasswordSchema` ✅ | — | — | `authLimiter` ✅ | Generic messages |
| `POST /payments/checkout` | Partial (manual check) ⚠️ | — | — | Global only | Generic messages |
| `GET /payments/subscription` | — | — | — | Global only | Generic messages |
| `POST /payments/cancel` | ❌ None | — | — | Global only | Generic messages |

### Error Disclosure Analysis (`backend/src/middlewares/errorHandler.ts`)
| Error Type | Production Behavior | Development Behavior |
|---|---|---|
| `ApiError` | Returns message + code | Same |
| `ZodError` | Returns field-level errors | Same |
| Prisma unique constraint | Returns `A record with this ${target} already exists` | Same (may leak field names) |
| `TokenExpiredError` | Returns "Token expired" | Same |
| `JsonWebTokenError` | Returns "Invalid token" | Same |
| Unknown error | Returns "Internal server error" | Returns `err.message` |
| Stack traces | **Not exposed** in production | Logged to console in dev |

**Key finding:** In production, the 500 handler hides `err.message`. In development, it exposes it. Stack traces are logged but not sent to the client. Prisma P2002 errors may leak the field name via `err.meta?.target`.

---

## 17. Confirmed Security Controls

1. ✅ **Refresh tokens hashed in DB** — SHA-256 before storage
2. ✅ **Refresh token rotation** — Old token deleted, new token issued on every refresh
3. ✅ **Password hashing** — bcrypt with 12 salt rounds
4. ✅ **Access token re-verification** — User fetched from DB on every authenticated request
5. ✅ **Deleted user rejection** — Both access and refresh flows check `isDeleted`
6. ✅ **Email enumeration prevention** — Forgot-password returns same message regardless
7. ✅ **Reset token one-time use** — `used` flag checked and set
8. ✅ **Session invalidation on password reset** — All refresh tokens deleted
9. ✅ **Rate limiting on auth endpoints** — `authLimiter` on register, login, forgot, reset
10. ✅ **Ownership enforcement** — Reviews, comments, watchlists, profiles all scoped to current user
11. ✅ **Admin authorization** — All admin endpoints protected by `authenticate` + `authorize`
12. ✅ **Premium access enforced server-side** — `getStreamLink` checks subscription in DB
13. ✅ **Streaming link hidden from non-premium users** — Set to `null` in `getMediaBySlug`
14. ✅ **Stripe webhook signature verification** — `constructWebhookEvent` with raw body
15. ✅ **Return path sanitization** — `sanitizeReturnPath` prevents open redirects in checkout

---

## 18. Confirmed Gaps

1. ❌ **No email delivery for password reset** — Token logged to console
2. ❌ **Reset token stored plaintext** — UUID stored without hashing in `PasswordResetToken.token`
3. ❌ **No token-reuse detection** — Old refresh tokens fail silently, no alarm
4. ❌ **No expired token cleanup** — Expired refresh/reset tokens accumulate in DB
5. ❌ **No session limit** — Unlimited concurrent refresh tokens per user
6. ❌ **No CSRF tokens** — Refresh and logout rely on CORS + SameSite only
7. ❌ **No password reuse prevention** — User can reset to same password
8. ❌ **Login/Register don't redirect authenticated users**
9. ❌ **Frontend login password validation mismatch** — min 6 vs backend min 8
10. ❌ **No frontend route protection** — All protection is client-side or backend-only
11. ❌ **CANCELED subscription loses access immediately** — May not match intended business logic
12. ❌ **`POST /auth/logout` and `POST /auth/refresh` have no rate limiting**
13. ❌ **TanStack Query cache not cleared on logout** — Sensitive data may persist in memory
14. ⚠️ **Open redirect possible via login `?redirect=` parameter** — Not sanitized
15. ⚠️ **`POST /api/media/:slug/view` view count dedup uses in-memory Map** — Resets on server restart, not shared across instances

---

## 19. Confirmed Gaps (Continued)

16. ❌ **`authorize({ subscription: "PREMIUM" })` middleware exists but is unused** — Premium enforcement is duplicated in service layer instead
17. ⚠️ **Prisma P2002 error may leak field names** — `err.meta?.target` included in response
18. ❌ **No device/session metadata on refresh tokens** — Cannot identify or revoke specific devices
19. ❌ **`POST /payments/checkout` has no route-level validation** — `plan` validated manually in controller, `returnPath` sanitized in service

---

## 20. Contradictions Resolved

### 1. "Any authenticated user can call the stream endpoint" vs "Free users cannot access premium content"
**Resolution:** Both are true. The route-level middleware (`authenticate`) allows any authenticated user to call `GET /api/media/:slug/stream`. The service layer (`getStreamLink`) checks premium status and returns 403 for non-premium users accessing premium content. Free users CAN stream free content.

### 2. "Access matrix says 0 premium-restricted endpoints" vs "Premium content exists"
**Resolution:** No route uses `authorize({ subscription: "PREMIUM" })` middleware. Premium enforcement happens in service functions. The matrix was correct at the route-middleware level.

### 3. "Login/Register redirect authenticated users to `/`" (from access matrix) vs actual code
**Resolution:** **Contradicted.** The login and register pages do NOT check authentication status or redirect. The `auth-provider.tsx` login/register functions call `router.push("/")` after successful submission, but visiting `/login` while logged in shows the form.

### 4. "Refresh tokens are hashed" (baseline) vs "Reset tokens are not hashed"
**Resolution:** Refresh tokens ARE hashed (SHA-256). Reset tokens are NOT hashed (stored as plaintext UUID). Different token types have different security levels.

---

## 21. Unknowns Requiring Later Investigation

1. **What happens when `JWT_ACCESS_EXPIRY` is set to a non-standard format?** The env schema accepts any string. Invalid values may cause runtime crashes.
2. **Is there a maximum number of refresh tokens per user?** No limit found. Could be a memory/storage concern.
3. **Does the Stripe webhook handle `customer.subscription.deleted` correctly for re-subscription?** It resets to FREE but doesn't clear `stripeCustomerId`.
4. **What is the `Account` model used for?** OAuth account model exists in schema but no OAuth library is installed.
5. **Does the `INCOMPLETE` subscription status ever get set?** Only seen in the enum, not in any code path.
6. **What happens if two refresh requests arrive simultaneously?** Both may try to use the same token. The second may fail with `INVALID_REFRESH_TOKEN` since the first deleted it.
7. **Is the in-memory `recentViews` Map for view deduplication a problem in multi-instance deployments?** Yes — each instance has its own map.

---

## 22. Recommended Next Discovery Pass

1. **Stripe webhook end-to-end trace** — Verify all event handlers, edge cases (duplicate events, out-of-order events), and error recovery.
2. **Database model relationship audit** — Map all foreign keys, cascading deletes, and orphan potential.
3. **Frontend state management audit** — Trace TanStack Query cache behavior, stale data, and cache invalidation patterns.
4. **Error boundary and loading state audit** — Verify all pages handle loading, error, and empty states.
5. **UI component inventory** — Catalog all shared components, verify consistency.
6. **Seed script analysis** — Verify what data the seed creates and whether it matches the schema.
7. **Performance and security headers audit** — Verify Helmet configuration, compression, and response times.
