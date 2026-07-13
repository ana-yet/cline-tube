# CineTube Database Schema and Data-Integrity Audit

> **Discovery date:** 2026-07-13  
> **Branch:** `main`  
> **Reference docs:** `00-project-baseline.md` through `04-auth-flow-diagrams.md`

---

## 1. Executive Summary

CineTube uses PostgreSQL via Prisma 5.22 with a single initial migration. The schema defines **15 models**, **9 enums**, and **1 composite-key join table**. All primary keys are UUID strings. Foreign keys universally use `ON DELETE CASCADE`, meaning deleting a user removes all their reviews, comments, watchlist entries, refresh tokens, and subscription — but not their transaction history (which uses `SetNull` on the subscription FK). The `Account` model (OAuth) exists but has no application usage. Soft deletion is implemented only on `User` via `isDeleted`/`deletedAt` fields. Several denormalized fields (`averageRating`, `reviewsCount`, `viewCount`) are maintained via application-level recalculation. One-review-per-user-per-media is database-enforced via a composite unique constraint.

---

## 2. Prisma and Datasource Configuration

| Property | Value | Evidence |
|---|---|---|
| Provider | `postgresql` | `prisma/schema.prisma`: `datasource db { provider = "postgresql" }` |
| Prisma version | `^5.22.0` | `backend/package.json` |
| Generator | `prisma-client-js` | `prisma/schema.prisma` |
| Client output | `../backend/node_modules/.prisma/client` | Non-standard — targets backend's `node_modules` directly |
| Datasource URL | `env("DATABASE_URL")` | `prisma/schema.prisma` |
| Relation mode | Not set (default — uses foreign keys) | No `relationMode` in schema |
| Preview features | None | No `previewFeatures` in generator |
| Logging | Development: `query`, `error`, `warn`. Production: `error` only | `backend/src/config/prisma.ts` |
| Connection pooling | Not explicitly configured | No `connection_limit` or PgBouncer URL |
| Singleton behavior | Yes — cached on `globalThis` in dev | `backend/src/config/prisma.ts` |
| Hot-reload protection | Yes — `globalForPrisma` pattern | Same file |
| Graceful disconnect | Yes — `SIGTERM` and `SIGINT` handlers | `backend/src/server.ts` |

### Key Observations
- **Nonstandard output path:** Prisma client generated into `backend/node_modules/.prisma/client`. Frontend cannot accidentally import Prisma since it's in the backend's `node_modules`.
- **No connection pooling config:** Render's PostgreSQL likely requires PgBouncer, but no `?pgbouncer=true` parameter was found.
- **Single DATABASE_URL:** No separation of direct and pooled URLs.

---

## 3. Enum Inventory

### `Role`
| Value | Used In | Default | Application Assignment |
|---|---|---|---|
| `USER` | `User.role` | ✅ Default | Registration creates with default |
| `ADMIN` | `User.role` | — | Seed script only |

**State transitions:** No validation. Role is never changed by application code after creation.

### `MediaType`
| Value | Used In | Default | Application Assignment |
|---|---|---|---|
| `MOVIE` | `Media.type` | — | Media creation (admin form) |
| `SERIES` | `Media.type` | — | Media creation (admin form) |

### `PricingType`
| Value | Used In | Default | Application Assignment |
|---|---|---|---|
| `FREE` | `Media.pricingType` | ✅ Default | Media creation |
| `PREMIUM` | `Media.pricingType` | — | Media creation |

### `ReviewStatus`
| Value | Used In | Default | Application Assignment |
|---|---|---|---|
| `PENDING` | `Review.status` | ✅ Default | Review creation, edit reset |
| `APPROVED` | `Review.status` | — | Admin approve action |
| `REJECTED` | `Review.status` | — | Admin reject action |

**State transitions:** PENDING → APPROVED (admin), PENDING → REJECTED (admin), APPROVED → PENDING (on edit), REJECTED → PENDING (on edit). No validation prevents REJECTED → APPROVED directly.

### `SubscriptionTier`
| Value | Used In | Default | Application Assignment |
|---|---|---|---|
| `FREE` | `Subscription.tier` | ✅ Default | Lazy subscription creation, Stripe webhook (deleted event) |
| `MONTHLY` | `Subscription.tier` | — | Stripe webhook (checkout.session.completed) |
| `YEARLY` | `Subscription.tier` | — | Stripe webhook (checkout.session.completed) |

### `SubscriptionStatus`
| Value | Used In | Default | Application Assignment |
|---|---|---|---|
| `ACTIVE` | `Subscription.status` | ✅ Default | Lazy creation, invoice.paid, subscription.deleted |
| `CANCELED` | `Subscription.status` | — | Cancel endpoint, subscription.updated (cancel_at_period_end) |
| `INCOMPLETE` | `Subscription.status` | — | **Never assigned in application code** |
| `PAST_DUE` | `Subscription.status` | — | invoice.payment_failed, subscription.updated |
| `TRIALING` | `Subscription.status` | — | **Never assigned in application code** |

### `TransactionStatus`
| Value | Used In | Default | Application Assignment |
|---|---|---|---|
| `PENDING` | `Transaction.status` | ✅ Default | **Never explicitly assigned** |
| `SUCCESS` | `Transaction.status` | — | Stripe webhook transactions |
| `FAILED` | `Transaction.status` | — | **Never assigned in application code** |
| `REFUNDED` | `Transaction.status` | — | **Never assigned in application code** |

### `ReportReason`
| Value | Used In | Default | Application Assignment |
|---|---|---|---|
| `SPAM` | `ReviewReport.reason` | — | **No report creation endpoint exists** |
| `SPOILER` | `ReviewReport.reason` | — | Same |
| `HARASSMENT` | `ReviewReport.reason` | — | Same |
| `INAPPROPRIATE` | `ReviewReport.reason` | — | Same |
| `OTHER` | `ReviewReport.reason` | — | Same |

### `ReportStatus`
| Value | Used In | Default | Application Assignment |
|---|---|---|---|
| `PENDING` | `ReviewReport.status` | ✅ Default | **No report creation endpoint** |
| `RESOLVED` | `ReviewReport.status` | — | **Never assigned** |
| `DISMISSED` | `ReviewReport.status` | — | **Never assigned** |

### Unused Enum Values Summary
| Enum | Unused Values |
|---|---|
| `SubscriptionStatus` | `INCOMPLETE`, `TRIALING` |
| `TransactionStatus` | `PENDING` (default but never explicit), `FAILED`, `REFUNDED` |
| `ReportReason` | All values — no report creation API |
| `ReportStatus` | All values — no report management API |

---

## 4. Model Inventory

### Model Summary Matrix

| Model | Purpose | Primary Key | Unique Constraints | Key Indexes | Soft Delete | Usage Status |
|---|---|---|---|---|---|---|
| `User` | User accounts | `id` (UUID) | `email` | `email` | ✅ `isDeleted`/`deletedAt` | Actively used |
| `UserProfile` | Extended user profile | `id` (UUID) | `userId` | `userId` | ❌ | Actively used |
| `Account` | OAuth provider accounts | `id` (UUID) | `[provider, providerAccountId]` | `userId` | ❌ | **Defined but no usage found** |
| `RefreshToken` | JWT refresh tokens | `id` (UUID) | `token` (hash) | `token`, `userId` | ❌ | Actively used |
| `PasswordResetToken` | Password reset tokens | `id` (UUID) | `token` (plaintext) | `token`, `userId` | ❌ | Actively used |
| `Media` | Movies and series | `id` (UUID) | `slug` | `slug`, `title`, `releaseYear`, `type`, `pricingType`, `averageRating`, `viewCount`, `createdAt` | ❌ | Actively used |
| `Genre` | Genre taxonomy | `id` (UUID) | `name` | `name` (via unique) | ❌ | Actively used |
| `MediaGenre` | Media↔Genre join | `[mediaId, genreId]` | Composite PK | `mediaId`, `genreId` | ❌ | Actively used |
| `Review` | User reviews | `id` (UUID) | `[userId, mediaId]` | `userId`, `mediaId`, `status`, `createdAt` | ❌ | Actively used |
| `ReviewLike` | Review likes | `[userId, reviewId]` | Composite PK | `userId`, `reviewId` | ❌ | Actively used |
| `ReviewReport` | Review reports | `id` (UUID) | None | `reviewId`, `userId`, `status` | ❌ | **Schema only — no create/update API** |
| `Comment` | Nested comments | `id` (UUID) | None | `userId`, `reviewId`, `parentId`, `createdAt` | ❌ | Actively used |
| `Watchlist` | User watchlists | `[userId, mediaId]` | Composite PK | `userId`, `mediaId` | ❌ | Actively used |
| `Subscription` | Stripe subscriptions | `id` (UUID) | `userId`, `stripeCustomerId`, `stripeSubscriptionId` | `userId`, `status` | ❌ | Actively used |
| `Transaction` | Payment transactions | `id` (UUID) | `providerTxnId` | `userId`, `status`, `createdAt` | ❌ | Actively used |

---

## 5. Relationship Inventory

### Relationship Summary Matrix

| Parent | Child | Cardinality | Foreign Key | Delete Behavior | Orphan Risk |
|---|---|---|---|---|---|
| `User` | `UserProfile` | 1:0..1 | `UserProfile.userId` | CASCADE | None |
| `User` | `Account` | 1:0..* | `Account.userId` | CASCADE | None |
| `User` | `RefreshToken` | 1:0..* | `RefreshToken.userId` | CASCADE | None |
| `User` | `PasswordResetToken` | 1:0..* | `PasswordResetToken.userId` | CASCADE | None |
| `User` | `Review` | 1:0..* | `Review.userId` | CASCADE | None |
| `User` | `ReviewLike` | 1:0..* | `ReviewLike.userId` | CASCADE | None |
| `User` | `ReviewReport` | 1:0..* | `ReviewReport.userId` | CASCADE | None |
| `User` | `Comment` | 1:0..* | `Comment.userId` | CASCADE | None |
| `User` | `Watchlist` | 1:0..* | `Watchlist.userId` | CASCADE | None |
| `User` | `Subscription` | 1:0..1 | `Subscription.userId` | CASCADE | None |
| `User` | `Transaction` | 1:0..* | `Transaction.userId` | CASCADE | None |
| `Media` | `MediaGenre` | 1:0..* | `MediaGenre.mediaId` | CASCADE | None |
| `Media` | `Review` | 1:0..* | `Review.mediaId` | CASCADE | None |
| `Media` | `Watchlist` | 1:0..* | `Watchlist.mediaId` | CASCADE | None |
| `Genre` | `MediaGenre` | 1:0..* | `MediaGenre.genreId` | CASCADE | None |
| `Review` | `ReviewLike` | 1:0..* | `ReviewLike.reviewId` | CASCADE | None |
| `Review` | `ReviewReport` | 1:0..* | `ReviewReport.reviewId` | CASCADE | None |
| `Review` | `Comment` | 1:0..* | `Comment.reviewId` | CASCADE | None |
| `Comment` | `Comment` (self) | 1:0..* | `Comment.parentId` | CASCADE | None |
| `Subscription` | `Transaction` | 1:0..* | `Transaction.subscriptionId` | **SET NULL** | Transactions preserved |

### Key Observations
- **All User relations cascade on delete** — deleting a user removes everything.
- **All Media relations cascade on delete** — deleting media removes all reviews, genres, watchlist entries.
- **Transaction → Subscription uses SET NULL** — transactions survive subscription deletion.
- **Comment self-relation uses CASCADE** — deleting a parent comment deletes all children recursively.

---

## 6. Unique Constraints and Duplicate Prevention

### Duplicate-Prevention Summary Matrix

| Data Rule | Database Constraint | Application Check | Concurrency Safe | Status |
|---|---|---|---|---|
| Unique user email | `User.email` UNIQUE | `findUnique` before create | ✅ | Both |
| Unique refresh token hash | `RefreshToken.token` UNIQUE | N/A (generated) | ✅ | Database-enforced |
| Unique password reset token | `PasswordResetToken.token` UNIQUE | N/A (generated) | ✅ | Database-enforced |
| Unique media slug | `Media.slug` UNIQUE | Generated with random suffix | ✅ | Both |
| Unique genre name | `Genre.name` UNIQUE | Upsert in seed | ✅ | Database-enforced |
| One review per user per media | `Review.[userId, mediaId]` UNIQUE | `findUnique` before create | ✅ | Both |
| One like per user per review | `ReviewLike.[userId, reviewId]` PK | `findUnique` before create | ✅ | Both |
| One watchlist entry per user per media | `Watchlist.[userId, mediaId]` PK | `findUnique` before create | ✅ | Both |
| Unique Stripe customer ID | `Subscription.stripeCustomerId` UNIQUE | N/A (from Stripe) | ✅ | Database-enforced |
| Unique Stripe subscription ID | `Subscription.stripeSubscriptionId` UNIQUE | N/A (from Stripe) | ✅ | Database-enforced |
| Unique transaction reference | `Transaction.providerTxnId` UNIQUE | N/A (from Stripe) | ✅ | Database-enforced |
| Unique OAuth provider account | `Account.[provider, providerAccountId]` UNIQUE | N/A | ✅ | Database-enforced |
| One subscription per user | `Subscription.userId` UNIQUE | N/A | ✅ | Database-enforced |
| Unique user profile | `UserProfile.userId` UNIQUE | N/A | ✅ | Database-enforced |
| **Duplicate review reports** | **None** | **None** | ❌ | **Missing** |
| **Duplicate comments** | **None** | **None** | ❌ | **Not prevented** |

### Check-Then-Create Patterns
The review creation, like toggle, and watchlist add all use a `findUnique` → `create` pattern. These are safe because the composite unique/PK constraints would catch any race condition. The application check prevents a nice error message; the database constraint prevents actual duplication.

---

## 7. Index Coverage

### Explicit Indexes (from migration)

| Table | Index | Type | Column(s) |
|---|---|---|---|
| `User` | `User_email_key` | UNIQUE | `email` |
| `UserProfile` | `UserProfile_userId_key` | UNIQUE | `userId` |
| `UserProfile` | `UserProfile_userId_idx` | INDEX | `userId` |
| `Account` | `Account_provider_providerAccountId_key` | UNIQUE | `provider, providerAccountId` |
| `Account` | `Account_userId_idx` | INDEX | `userId` |
| `RefreshToken` | `RefreshToken_token_key` | UNIQUE | `token` |
| `RefreshToken` | `RefreshToken_token_idx` | INDEX | `token` (redundant with unique) |
| `RefreshToken` | `RefreshToken_userId_idx` | INDEX | `userId` |
| `PasswordResetToken` | `PasswordResetToken_token_key` | UNIQUE | `token` |
| `PasswordResetToken` | `PasswordResetToken_token_idx` | INDEX | `token` (redundant with unique) |
| `PasswordResetToken` | `PasswordResetToken_userId_idx` | INDEX | `userId` |
| `Media` | `Media_slug_key` | UNIQUE | `slug` |
| `Media` | `Media_slug_idx` | INDEX | `slug` (redundant with unique) |
| `Media` | `Media_title_idx` | INDEX | `title` |
| `Media` | `Media_releaseYear_idx` | INDEX | `releaseYear` |
| `Media` | `Media_type_idx` | INDEX | `type` |
| `Media` | `Media_pricingType_idx` | INDEX | `pricingType` |
| `Media` | `Media_averageRating_idx` | INDEX | `averageRating` |
| `Media` | `Media_viewCount_idx` | INDEX | `viewCount` |
| `Media` | `Media_createdAt_idx` | INDEX | `createdAt` |
| `Genre` | `Genre_name_key` | UNIQUE | `name` |
| `MediaGenre` | `MediaGenre_mediaId_idx` | INDEX | `mediaId` |
| `MediaGenre` | `MediaGenre_genreId_idx` | INDEX | `genreId` |
| `Review` | `Review_userId_mediaId_key` | UNIQUE | `userId, mediaId` |
| `Review` | `Review_userId_idx` | INDEX | `userId` |
| `Review` | `Review_mediaId_idx` | INDEX | `mediaId` |
| `Review` | `Review_status_idx` | INDEX | `status` |
| `Review` | `Review_createdAt_idx` | INDEX | `createdAt` |
| `ReviewLike` | `ReviewLike_userId_reviewId_key` | PK | `userId, reviewId` |
| `ReviewLike` | `ReviewLike_userId_idx` | INDEX | `userId` |
| `ReviewLike` | `ReviewLike_reviewId_idx` | INDEX | `reviewId` |
| `ReviewReport` | `ReviewReport_reviewId_idx` | INDEX | `reviewId` |
| `ReviewReport` | `ReviewReport_userId_idx` | INDEX | `userId` |
| `ReviewReport` | `ReviewReport_status_idx` | INDEX | `status` |
| `Comment` | `Comment_userId_idx` | INDEX | `userId` |
| `Comment` | `Comment_reviewId_idx` | INDEX | `reviewId` |
| `Comment` | `Comment_parentId_idx` | INDEX | `parentId` |
| `Comment` | `Comment_createdAt_idx` | INDEX | `createdAt` |
| `Watchlist` | `Watchlist_userId_mediaId_key` | PK | `userId, mediaId` |
| `Watchlist` | `Watchlist_userId_idx` | INDEX | `userId` |
| `Watchlist` | `Watchlist_mediaId_idx` | INDEX | `mediaId` |
| `Subscription` | `Subscription_userId_key` | UNIQUE | `userId` |
| `Subscription` | `Subscription_stripeCustomerId_key` | UNIQUE | `stripeCustomerId` |
| `Subscription` | `Subscription_stripeSubscriptionId_key` | UNIQUE | `stripeSubscriptionId` |
| `Subscription` | `Subscription_userId_idx` | INDEX | `userId` (redundant with unique) |
| `Subscription` | `Subscription_status_idx` | INDEX | `status` |
| `Transaction` | `Transaction_providerTxnId_key` | UNIQUE | `providerTxnId` |
| `Transaction` | `Transaction_userId_idx` | INDEX | `userId` |
| `Transaction` | `Transaction_status_idx` | INDEX | `status` |
| `Transaction` | `Transaction_createdAt_idx` | INDEX | `createdAt` |

### Index-Risk Summary

| Query | Fields | Existing Index | Risk | Evidence |
|---|---|---|---|---|
| Media search by title (LIKE) | `title` | `Media_title_idx` | Low — B-tree supports prefix matching | `media.service.ts:listMedia` |
| Media filter by type + pricing + sort | `type`, `pricingType`, `averageRating` | Individual indexes | Low — composite index would help but individual indexes sufficient for small tables | `media.service.ts:listMedia` |
| Reviews by media + status | `mediaId`, `status` | Individual indexes | Low — both indexed | `review.service.ts:getReviewsByMedia` |
| Reviews by user + media (unique) | `userId`, `mediaId` | `Review_userId_mediaId_key` UNIQUE | None | `review.service.ts:getMyReviewForMedia` |
| Pending reviews | `status` | `Review_status_idx` | None | `review.service.ts:getPendingReviews` |
| Watchlist by user | `userId` | `Watchlist_userId_idx` | None | `watchlist.service.ts:getWatchlist` |
| Subscription by user | `userId` | `Subscription_userId_key` UNIQUE | None | `payment.service.ts:getSubscription` |
| Refresh token lookup | `token` | `RefreshToken_token_key` UNIQUE | None | `auth.service.ts:refreshTokens` |
| **Expired refresh token cleanup** | `expiresAt` | **None** | **Medium — no index on expiresAt** | No cleanup query exists |
| **Expired reset token lookup** | `expiresAt`, `used` | **None** | **Medium — no index on expiresAt** | No cleanup query exists |

---

## 8. Soft Deletion and Retention

### Models with Soft Delete
Only `User` supports soft deletion.

| Field | Type | Default | Evidence |
|---|---|---|---|
| `isDeleted` | `Boolean` | `false` | `prisma/schema.prisma` |
| `deletedAt` | `DateTime?` | `null` | `prisma/schema.prisma` |

### Services That Filter Deleted Records
| Service | Filter | Evidence |
|---|---|---|
| `auth.service.ts:login` | `if (!user \|\| user.isDeleted)` | Confirmed |
| `auth.service.ts:refreshTokens` | `if (!storedToken.user \|\| storedToken.user.isDeleted)` | Confirmed |
| `auth.service.ts:getCurrentUser` | `if (!user \|\| user.isDeleted)` | Confirmed |
| `auth.service.ts:requestPasswordReset` | `if (!user \|\| user.isDeleted)` | Confirmed |
| `auth.service.ts:resetPassword` | `if (!resetToken.user \|\| resetToken.user.isDeleted)` | Confirmed |
| `middlewares/auth.ts:authenticate` | `if (!user \|\| user.isDeleted)` | Confirmed |
| `middlewares/auth.ts:optionalAuthenticate` | `if (user && !user.isDeleted)` | Confirmed |
| `admin.service.ts:getDashboardKPIs` | `where: { isDeleted: false }` | Confirmed |

### Services That Do NOT Filter Deleted Records
| Service | Risk | Evidence |
|---|---|---|
| `media.service.ts` (all functions) | Low — media has no soft delete | — |
| `review.service.ts` (all functions) | **Medium** — reviews of deleted users remain visible with `userId` still set | Reviews query by `mediaId`/`status`, not filtered by user.isDeleted |
| `comment.service.ts` | **Medium** — comments of deleted users remain visible | Same pattern |
| `watchlist.service.ts:getWatchlist` | Low — scoped to current user who is authenticated | — |

### Key Behaviors
- **Deleted-user reviews remain visible** — `APPROVED` reviews by deleted users still appear in public listings because the review query filters by `status`, not by user deletion status.
- **Personal information remains attached** — `Review.user` still shows `name` and `image` of the deleted user (not anonymized).
- **Email cannot be reused** — `User.email` has a unique constraint. A soft-deleted user still occupies the email. There is no hard-delete endpoint.
- **No user deletion API exists** — No `DELETE /api/users/:id` or similar endpoint. Soft deletion is only via direct database manipulation.
- **No hard-delete functionality** — No service or controller calls `prisma.user.delete`.
- **No cleanup of expired tokens** — Expired refresh tokens and reset tokens accumulate indefinitely.

---

## 9. Referential Actions and Cascade Behavior

### Deleting a User
| Cascade Target | Behavior | Evidence |
|---|---|---|
| `UserProfile` | CASCADE — deleted | `UserProfile_userId_fkey` |
| `Account` | CASCADE — deleted | `Account_userId_fkey` |
| `RefreshToken` | CASCADE — deleted (all sessions) | `RefreshToken_userId_fkey` |
| `PasswordResetToken` | CASCADE — deleted | `PasswordResetToken_userId_fkey` |
| `Review` | CASCADE — deleted | `Review_userId_fkey` |
| `ReviewLike` | CASCADE — deleted | `ReviewLike_userId_fkey` |
| `ReviewReport` | CASCADE — deleted | `ReviewReport_userId_fkey` |
| `Comment` | CASCADE — deleted | `Comment_userId_fkey` |
| `Watchlist` | CASCADE — deleted | `Watchlist_userId_fkey` |
| `Subscription` | CASCADE — deleted | `Subscription_userId_fkey` |
| `Transaction` | CASCADE — deleted | `Transaction_userId_fkey` |

**Risk:** Hard-deleting a user would destroy all transaction history, review history, and moderation data. Since only soft-delete is used in practice, this is mitigated — but there is no safety net if someone runs `prisma.user.delete`.

### Deleting Media
| Cascade Target | Behavior | Evidence |
|---|---|---|
| `MediaGenre` | CASCADE — deleted | `MediaGenre_mediaId_fkey` |
| `Review` | CASCADE — deleted | `Review_mediaId_fkey` |
| `Watchlist` | CASCADE — deleted | `Watchlist_mediaId_fkey` |

**Risk:** Deleting media cascades to reviews, which cascades to comments, likes, and reports. No transaction wrapping in `mediaService.deleteMedia` — Cloudinary cleanup is fire-and-forget.

### Deleting a Review
| Cascade Target | Behavior | Evidence |
|---|---|---|
| `ReviewLike` | CASCADE — deleted | `ReviewLike_reviewId_fkey` |
| `ReviewReport` | CASCADE — deleted | `ReviewReport_reviewId_fkey` |
| `Comment` | CASCADE — deleted | `Comment_reviewId_fkey` |

**Note:** `deleteReview` in the service uses a transaction to also recalculate media rating.

### Deleting a Comment
| Cascade Target | Behavior | Evidence |
|---|---|---|
| Child `Comment` (self-relation) | CASCADE — recursive deletion | `Comment_parentId_fkey` |

**Risk:** Deleting a top-level comment cascades to ALL nested replies. No depth limit.

### Deleting a Subscription
| Cascade Target | Behavior | Evidence |
|---|---|---|
| `Transaction.subscriptionId` | **SET NULL** — transactions preserved | `Transaction_subscriptionId_fkey` |

**Good:** Transaction history survives subscription deletion.

---

## 10. Transaction Inventory

### All `prisma.$transaction` Usages

| # | Function | File | Operations | Type | Why Atomic |
|---|---|---|---|---|---|
| 1 | `deleteReview` | `review.service.ts` | `review.delete` + `recalculateMediaRating` | Interactive | Rating must reflect deletion |
| 2 | `updateReview` (edit) | `review.service.ts` | `review.update` + `recalculateMediaRating` (if was APPROVED) | Interactive | Rating must reflect status reset |
| 3 | `approveReview` | `review.service.ts` | `review.update` (→APPROVED) + `recalculateMediaRating` | Interactive | Rating must include new approval |
| 4 | `rejectReview` | `review.service.ts` | `review.update` (→REJECTED) + `recalculateMediaRating` | Interactive | Rating must exclude rejected review |
| 5 | `handleWebhookEvent` (checkout.session.completed) | `payment.service.ts` | `subscription.update` + `transaction.create` | Batch | Subscription and payment must be consistent |
| 6 | `handleWebhookEvent` (invoice.paid) | `payment.service.ts` | `subscription.update` + `transaction.create` | Batch | Same |
| 7 | `resetPassword` | `auth.service.ts` | `user.update` + `passwordResetToken.update` + `refreshToken.deleteMany` | Batch | Password, token, and sessions must change together |
| 8 | `updateMedia` (with genres) | `media.service.ts` | `mediaGenre.deleteMany` + `media.update` (with genre create) | Interactive | Genre replacement must be atomic |

### Multi-Step Operations Missing Transactions

| Operation | Steps | Risk | Evidence |
|---|---|---|---|
| `mediaService.deleteMedia` | Delete Cloudinary images (fire-and-forget) + `prisma.media.delete` | Low — DB delete is single operation. Cloudinary failure doesn't affect DB. | `media.service.ts:deleteMedia` |
| `seed.ts:seedMedia` | `media.upsert` + `mediaGenre.deleteMany` + `mediaGenre.createMany` | Low — seed only, not production data | `backend/prisma/seed.ts` |
| `commentService.createComment` | `comment.create` (single operation) | None | `comment.service.ts:createComment` |
| Review rating recalculation on edit | `review.update` (PENDING) + `recalculateMediaRating` — **but only when previous status was APPROVED** | **Medium** — if the `update` succeeds but `recalculateMediaRating` fails, the review is reset but rating is stale | `review.service.ts:updateReview` — the recalculation is OUTSIDE the transaction for the edit case |

---

## 11. Denormalized and Derived Data

### Derived Fields

| Field | Model | Source of Truth | Update Mechanism | Atomic | Drift Risk |
|---|---|---|---|---|---|
| `averageRating` | `Media` | `Review.rating` where `status=APPROVED` | `recalculateMediaRating` in transactions | ✅ Yes | Low — recalculated on every review change |
| `reviewsCount` | `Media` | `COUNT(Review)` where `status=APPROVED` | Same function | ✅ Yes | Low |
| `viewCount` | `Media` | `POST /media/:slug/view` calls | `prisma.media.update({ data: { viewCount: { increment: 1 } } })` | ✅ Yes (atomic increment) | Low |
| `_count.reviews` | User profile | `prisma.user.findUnique` with `_count` | Calculated on read | N/A | None |
| `_count.watchlist` | User profile | Same | Calculated on read | N/A | None |
| `_count.likes` | Review | `prisma.review.findUnique` with `_count` | Calculated on read | N/A | None |
| `_count.comments` | Review | Same | Calculated on read | N/A | None |
| Revenue totals | Dashboard | `prisma.transaction.aggregate` | Calculated on read | N/A | None |

### `recalculateMediaRating` Implementation
```typescript
async function recalculateMediaRating(tx, mediaId) {
  const result = await tx.review.aggregate({
    where: { mediaId, status: "APPROVED" },
    _avg: { rating: true },
    _count: { id: true },
  });
  await tx.media.update({
    where: { id: mediaId },
    data: {
      averageRating: result._avg.rating ?? 0,
      reviewsCount: result._count.id,
    },
  });
}
```
Evidence: `backend/src/services/review.service.ts:recalculateMediaRating`

### Drift Risks
1. **`averageRating` can become 0** — When all reviews are deleted or rejected, `_avg.rating` returns `null`, which becomes `0`. This is correct behavior.
2. **`averageRating` precision** — `Decimal(3,1)` allows values 0.0–99.9. Ratings are 1–10, so no overflow risk.
3. **Concurrent review operations** — Two simultaneous approvals could both read the same aggregate and write the same value. The second write would overwrite the first, but since both recalculate from the same source of truth, the final value would be correct on the next recalculation.
4. **`viewCount` in-memory dedup** — `recentViews` Map resets on server restart. In multi-instance deployments, each instance has its own map, so the same IP could be counted on each instance.

---

## 12. Review and Moderation Integrity

### Review Lifecycle
1. **Creation:** Status = `PENDING`. One per user per media (DB-enforced).
2. **Editing:** Status reset to `PENDING`, `publishedAt` set to `null`. If previous status was `APPROVED`, media rating is recalculated.
3. **Approval:** Status → `APPROVED`, `publishedAt` set to `new Date()`. Media rating recalculated.
4. **Rejection:** Status → `REJECTED`, `publishedAt` set to `null`. Media rating recalculated.
5. **Deletion:** Review deleted. If was `APPROVED`, media rating recalculated.

### Moderation Integrity Findings

| Check | Status | Evidence |
|---|---|---|
| One review per user per media | ✅ DB-enforced | `Review.[userId, mediaId]` UNIQUE |
| Reviews start as PENDING | ✅ Confirmed | `review.service.ts:createReview` |
| Editing resets to PENDING | ✅ Confirmed | `review.service.ts:updateReview` |
| Rejected reviews can be edited | ✅ Confirmed — edit resets to PENDING | Same function |
| Deletion updates rating | ✅ Confirmed (if APPROVED) | `review.service.ts:deleteReview` |
| Approval is idempotent | ✅ Confirmed — throws 400 if already APPROVED | `review.service.ts:approveReview` |
| Rejection is idempotent | ✅ Confirmed — throws 400 if already REJECTED | `review.service.ts:rejectReview` |
| Admin can see all reviews | ✅ Via `getPendingReviews` and `getMyReviews` (admin's own) | `review.service.ts` |
| **Moderation history stored** | ❌ No — status changes overwrite previous value | No audit log |
| **Approver/rejector identity stored** | ❌ No — no `approvedBy` or `moderatedBy` field | Schema has no such field |
| **Moderation timestamps** | ❌ No — no `approvedAt` or `rejectedAt` | Only `publishedAt` is set on approval |
| Reports connected to moderation | ❌ No — `ReviewReport` exists but no create/update API | `review.routes.ts` has no report endpoints |
| **Self-reporting prevented** | ❌ Unknown — no report creation endpoint | Cannot verify |
| Duplicate reports prevented | ❌ No unique constraint on `[userId, reviewId]` for reports | `ReviewReport` has no composite unique |

---

## 13. Comment Tree Integrity

### Structure
- `Comment.parentId` is a self-referencing FK to `Comment.id`
- `onDelete: Cascade` — deleting a parent deletes all children recursively
- No maximum depth enforcement in schema or application

### Findings

| Check | Status | Evidence |
|---|---|---|
| Parent belongs to same review | ✅ Checked in `commentService.createComment` | `prisma.comment.findFirst({ where: { id: input.parentId, reviewId } })` |
| Circular references possible | ❌ No — Prisma FK prevents cycles at DB level | Self-referencing FK |
| Recursive deletion supported | ✅ CASCADE on `parentId` | `Comment_parentId_fkey` |
| Children deleted when parent deleted | ✅ CASCADE | Same |
| **Maximum nesting depth** | ❌ Not enforced | No application or DB check |
| Comments loaded recursively | ✅ `include: { replies: { ... } }` | `comment.service.ts:getCommentsByReview` loads one level of replies |
| **Deep nesting performance** | ⚠️ Risk — only one level of replies loaded, but no limit on depth | `replies` select does not recurse further |
| Comment counts stored | ❌ Calculated via `_count` on read | `reviewSelect._count.comments` |
| Admin deletion differs | ✅ Admin can delete any comment; owner can delete own | `comment.service.ts:deleteComment` |

### Performance Risk
The `getCommentsByReview` function loads top-level comments with one level of nested replies. Comments nested deeper than 2 levels would not appear in the API response. However, the schema allows arbitrary nesting.

---

## 14. Media and Genre Integrity

### Media Required Fields
`title`, `slug`, `synopsis`, `type`, `streamingLink`, `releaseYear`, `director`, `cast`

### Media Optional Fields
`pricingType` (default FREE), `posterUrl`, `posterPublicId`, `backdropUrl`, `backdropPublicId`

### Findings

| Check | Status | Evidence |
|---|---|---|
| Slug uniqueness | ✅ DB-enforced UNIQUE | `Media.slug` UNIQUE |
| Slug creation | Random suffix appended | `media.service.ts:generateSlug` |
| Slug update on title change | ✅ Confirmed | `media.service.ts:updateMedia` |
| Release year validation | ✅ 1888 to currentYear+5 | `media.validation.ts:createMediaSchema` |
| Rating range | N/A — stored as `Decimal(3,1)`, calculated from reviews | Schema |
| Duration validation | ❌ No duration field exists | Schema has no duration |
| Streaming URL validation | ✅ Must be valid URL | `media.validation.ts:createMediaSchema` |
| Cloudinary public IDs stored | ✅ `posterPublicId`, `backdropPublicId` | Schema |
| **Frontend genre drift** | ⚠️ Possible — frontend has hardcoded `GENRES` array | `frontend/src/app/(public)/browse/page.tsx` — may not match DB genres |
| Genre association updates | ✅ Replace pattern — `deleteMany` + `createMany` | `media.service.ts:updateMedia`, `seed.ts:seedMedia` |
| Duplicate genre relations prevented | ✅ Composite PK | `MediaGenre.[mediaId, genreId]` PK |
| Media deletion removes joins | ✅ CASCADE | `MediaGenre_mediaId_fkey` |
| **Stream URLs can be malformed** | ✅ Validated at creation | `createMediaSchema` — `z.string().url()` |
| Free/premium conflicts | None — subscription check is in service layer | `media.service.ts:userHasPremiumAccess` |
| **Draft/unpublished media** | ❌ No draft state — all media is immediately public | No `published` or `draft` field |

---

## 15. Subscription and Transaction Integrity

### Subscription

| Check | Status | Evidence |
|---|---|---|
| Every user has a Subscription row | ⚠️ Not at creation — created lazily on first `GET /payments/subscription` | `payment.service.ts:getSubscription` |
| One-to-one uniqueness | ✅ `Subscription.userId` UNIQUE | Schema |
| Default free state | ✅ `FREE` + `ACTIVE` | Schema defaults |
| Stripe customer uniqueness | ✅ `stripeCustomerId` UNIQUE | Schema |
| Stripe subscription uniqueness | ✅ `stripeSubscriptionId` UNIQUE | Schema |
| `FREE + ACTIVE` valid | ✅ Intentional — default state | Schema + service |
| `CANCELED + MONTHLY/YEARLY` valid | ✅ Intentional — user canceled but tier remains | `cancelSubscription` sets `status: "CANCELED"` without changing tier |
| **Deleted Stripe subscriptions clear fields** | ✅ `stripeSubscriptionId` set to `null` | `handleWebhookEvent` — `customer.subscription.deleted` |
| **User can have multiple Stripe subscriptions** | ❌ Prevented by `stripeSubscriptionId` UNIQUE | Schema |
| `INCOMPLETE` status never assigned | ✅ Confirmed unused | No code path sets this |
| `TRIALING` status never assigned | ✅ Confirmed unused | No code path sets this |

### Transaction

| Check | Status | Evidence |
|---|---|---|
| Transactions immutable | ✅ — only `create`, never `update` | No `prisma.transaction.update` found |
| Duplicate prevention | ✅ `providerTxnId` UNIQUE | Schema |
| **Failed payments create records** | ❌ No — only `SUCCESS` transactions are created | `handleWebhookEvent` |
| **Refunds represented** | ❌ No — `REFUNDED` status exists but never assigned | No refund handler |
| Amount units | Decimal major units (dollars) — `amount / 100` from Stripe cents | `payment.service.ts` |
| Currency | `USD` default, derived from Stripe | Schema + service |

---

## 16. Authentication Token Persistence

### RefreshToken

| Property | Value | Evidence |
|---|---|---|
| Token uniqueness | ✅ `token` UNIQUE | Schema |
| Storage format | SHA-256 hash (64 hex chars) | `jwt.ts:hashToken` |
| User relation | Cascade on delete | `RefreshToken_userId_fkey` |
| Expiry index | ❌ No index on `expiresAt` | Schema |
| Cleanup strategy | ❌ None — expired tokens accumulate | No scheduled cleanup |
| Session metadata | ❌ None — no device, IP, or user-agent | Schema only has `id`, `token`, `userId`, `expiresAt`, `createdAt` |
| Rotation concurrency risk | ⚠️ Two simultaneous refreshes with same token — second fails with "Invalid refresh token" | `refreshTokens` deletes by ID after lookup |

### PasswordResetToken

| Property | Value | Evidence |
|---|---|---|
| Storage format | **Plaintext UUID** | `auth.service.ts:requestPasswordReset` — `const resetToken = uuidv4()` |
| Token uniqueness | ✅ `token` UNIQUE | Schema |
| Expiration | 1 hour | `PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000` |
| Used flag | ✅ Checked and set | `auth.service.ts:resetPassword` |
| Multiple token prevention | ✅ Old tokens deleted before creating new | `deleteMany({ where: { userId } })` |
| Cleanup strategy | ❌ None — used and expired tokens accumulate | No scheduled cleanup |
| Cascade behavior | CASCADE on user delete | `PasswordResetToken_userId_fkey` |

---

## 17. Migration History

### Migration Count
**1** — Single initial migration.

### Migration Details
| Name | Timestamp | Tables Created | Enums Created |
|---|---|---|---|
| `20260621044807_init` | 2026-06-21 04:48:07 | All 15 tables | All 9 enums |

### Schema Drift Assessment
The migration SQL matches the current `schema.prisma` exactly. All models, fields, constraints, indexes, and foreign keys present in the schema are present in the migration. No drift detected.

Evidence: `prisma/migrations/20260621044807_init/migration.sql` — contains all CREATE TABLE, CREATE INDEX, CREATE UNIQUE INDEX, and ALTER TABLE (ADD CONSTRAINT) statements matching the schema.

---

## 18. Seed-Data Audit

### Seeded Data

| Entity | Count | Method | Evidence |
|---|---|---|---|
| Genres | 12 | `upsert` by name | `backend/prisma/seed.ts:seedGenres` |
| Admin user | 1 | `upsert` by email | `backend/prisma/seed.ts:seedAdmin` |
| Media | 20 | `upsert` by slug | `backend/prisma/seed.ts:seedMedia` |

### Admin Credentials
Hardcoded in seed file. Email and password are constants in the source code. The password is hashed with bcrypt(12) before storage.

Evidence: `backend/prisma/seed.ts:seedAdmin` — `const email = "admin@cinetube.com"; const password = "Admin123!";`

### Media Content
- 10 movies, 10 series
- All use `example.com/stream/...` URLs for streaming
- All use `image.tmdb.org` URLs for posters and backdrops (external URLs, not Cloudinary)
- Mix of FREE (10) and PREMIUM (10) pricing types
- All genres from the 12-genre list are used

### Idempotency
✅ All operations use `upsert` — safe to rerun. Genre-media associations are deleted and recreated on each run (`deleteMany` + `createMany`).

### Production Safety
⚠️ Running the seed in production would:
- Create or overwrite the admin user (including resetting password hash)
- Create or overwrite all 20 media items
- Reset all genre-media associations for seeded media
- NOT delete non-seeded data

### Hardcoded Content
- `example.com/stream/*` URLs — placeholder streaming links
- `image.tmdb.org` URLs — real TMDB image URLs (may be subject to rate limiting or removal)

---

## 19. Query-Pattern Audit

### Media Listing (`media.service.ts:listMedia`)
- **Prisma method:** `findMany` + `count`
- **Filters:** `title` (contains), `type`, `pricingType`, genre (via `some`), not soft-deleted (N/A — no soft delete on media)
- **Sort:** `createdAt`, `averageRating`, `viewCount`, `releaseYear`
- **Pagination:** `skip`/`take`
- **Includes:** `genres: { select: { genre: { select: { id, name } } } }`
- **Index support:** ✅ All filter/sort fields indexed
- **N+1 risk:** None — single query with include
- **Over-fetching:** None — uses `mediaListSelect`

### Reviews by Media (`review.service.ts:getReviewsByMedia`)
- **Prisma method:** `findMany` + `count`
- **Filters:** `mediaId`, `status: "APPROVED"`
- **Sort:** `rating` desc, `createdAt` desc
- **Pagination:** `skip`/`take`
- **Includes:** `user: { select: { id, name, image } }`, `_count: { likes, comments }`
- **Index support:** ✅ `mediaId` + `status` indexed
- **N+1 risk:** None — `_count` is a Prisma aggregate

### Watchlist (`watchlist.service.ts:getWatchlist`)
- **Prisma method:** `findMany`
- **Filters:** `userId`
- **Includes:** `media` with full select
- **Index support:** ✅ `userId` indexed
- **N+1 risk:** Low — single query with nested include

### Dashboard KPIs (`admin.service.ts:getDashboardKPIs`)
- **Prisma method:** Multiple `count`, `aggregate` in `Promise.all`
- **Filters:** Various
- **Index support:** ✅
- **N+1 risk:** None — parallel queries

---

## 20. Data-Exposure Findings

### Data-Exposure Summary Matrix

| Field/Data | API Surface | Exposure Status | Evidence |
|---|---|---|---|
| `passwordHash` | Never in any `select` | ✅ Internal only | All selects exclude it |
| Refresh token hash | Never in API response | ✅ Internal only | Cookie only, not in body |
| Reset token (plaintext) | **Logged to console** | ⚠️ Potentially sensitive | `auth.service.ts:requestPasswordReset` — `console.log(...)` |
| `stripeCustomerId` | `GET /payments/subscription` | ⚠️ Potentially sensitive | `payment.service.ts:getSubscription` — included in select |
| `stripeSubscriptionId` | `GET /payments/subscription` | ⚠️ Potentially sensitive | Same |
| `posterPublicId` | `GET /media` list and detail | ⚠️ Internal Cloudinary ID | `mediaListSelect` includes it |
| `backdropPublicId` | Same | ⚠️ Internal Cloudinary ID | Same |
| `isDeleted` | Never in API response | ✅ Internal only | Not in any select |
| `deletedAt` | Never in API response | ✅ Internal only | Not in any select |
| User email | `GET /auth/me`, `GET /profile` | ✅ Intended — own data only | Scoped to authenticated user |
| User role | `GET /auth/me`, `GET /profile` | ✅ Intended | Same |
| Unmoderated reviews | Not in public listing | ✅ Only APPROVED shown publicly | `getReviewsByMedia` filters by `status: "APPROVED"` |
| Rejected reviews | Not in public listing | ✅ Hidden | Same |
| Pending reviews (admin) | `GET /reviews/pending` | ✅ Intended — admin only | Protected by `authorize({ roles: ["ADMIN"] })` |

---

## 21. Confirmed Data Controls

1. ✅ One-review-per-user-per-media enforced at DB level
2. ✅ One-like-per-user-per-review enforced at DB level (composite PK)
3. ✅ One-watchlist-entry-per-user-per-media enforced at DB level (composite PK)
4. ✅ One-subscription-per-user enforced at DB level (unique)
5. ✅ Refresh token hashes are unique
6. ✅ Media slugs are unique
7. ✅ Genre names are unique
8. ✅ Stripe identifiers are unique
9. ✅ Transaction references are unique (providerTxnId)
10. ✅ Review rating recalculation is transactional
11. ✅ Password reset invalidates all sessions
12. ✅ Soft-deleted users rejected by auth middleware
13. ✅ Cascade deletes prevent orphans for user-owned data
14. ✅ Transaction history preserved when subscription deleted (SET NULL)

---

## 22. Confirmed Data-Integrity Gaps

1. ❌ No duplicate prevention for `ReviewReport` — a user could submit multiple reports for the same review
2. ❌ No moderation history — status changes are overwrites, no audit trail
3. ❌ No `approvedBy`/`rejectedBy` tracking on reviews
4. ❌ No cleanup of expired refresh tokens
5. ❌ No cleanup of expired/used password reset tokens
6. ❌ No cleanup of expired password reset tokens
7. ❌ `Account` model exists but has no application usage
8. ❌ `ReviewReport` model exists but has no create/update API
9. ❌ `INCOMPLETE` and `TRIALING` subscription statuses never used
10. ❌ `FAILED` and `REFUNDED` transaction statuses never used
11. ❌ No draft/unpublished state for media
12. ❌ No duration field for media
13. ❌ No maximum comment nesting depth
14. ⚠️ Deleted-user reviews remain visible with personal information
15. ⚠️ Email cannot be reused after soft deletion (unique constraint)
16. ⚠️ `viewCount` dedup uses in-memory Map — not shared across instances
17. ⚠️ Lazy subscription creation means some users may have no Subscription row
18. ⚠️ `updateReview` rating recalculation on edit is outside the transaction for the non-APPROVED case

---

## 23. Concurrency and Race-Condition Risks

| Risk | Severity | Description | Mitigation |
|---|---|---|---|
| Simultaneous refresh with same token | Low | Second refresh fails with "Invalid refresh token" — user retries | Client handles 401 |
| Simultaneous review creation | Low | `findUnique` check + unique constraint prevents duplicate | DB constraint is the safety net |
| Simultaneous like toggle | Low | Composite PK prevents duplicate; one succeeds, other fails | DB constraint |
| Simultaneous watchlist add | Low | Same pattern | DB constraint |
| Simultaneous view count increment | Low | `increment: 1` is atomic in Prisma | DB atomic operation |
| Rating recalculation race | Low | Two concurrent recalculations read same data, write same result | Next recalculation corrects |
| Subscription webhook duplicate events | Low | `providerTxnId` UNIQUE prevents duplicate transactions | DB constraint |
| **Check-then-create for reports** | **Medium** | No unique constraint — concurrent reports could duplicate | **Missing DB constraint** |

---

## 24. Orphan and Cascade Risks

### Confirmed Safe
- User deletion cascades to all owned data
- Media deletion cascades to genres, reviews, watchlists
- Review deletion cascades to likes, reports, comments
- Comment deletion cascades to child comments
- Subscription deletion sets transaction FK to NULL

### Potential Risks
1. **Hard-deleting a user destroys transaction history** — CASCADE on `Transaction.userId`. Mitigated by soft-delete-only pattern, but no safety net.
2. **Media deletion destroys all reviews** — CASCADE. Reviews with approved ratings are permanently lost. No soft-delete on media.
3. **Genre deletion destroys all media-genre associations** — CASCADE on `MediaGenre.genreId`. Not a data loss since genres are reference data.
4. **Cloudinary assets remain after DB deletion** — `deleteMedia` fires `deleteImage` but catches errors silently. If Cloudinary delete fails, orphans accumulate.
5. **No cascading rating recalculation on user deletion** — If a user with APPROVED reviews is hard-deleted, media `averageRating` and `reviewsCount` become stale until the next review action on that media.

---

## 25. Schema Elements With No Usage Found

| Element | Type | Evidence |
|---|---|---|
| `Account` model | Model | No `prisma.account` calls in any service |
| `ReviewReport` model | Model | No create/update/delete in any service or controller |
| `ReportReason` enum | Enum | Only used by `ReviewReport.reason` |
| `ReportStatus` enum | Enum | Only used by `ReviewReport.status` |
| `SubscriptionStatus.INCOMPLETE` | Enum value | Never assigned |
| `SubscriptionStatus.TRIALING` | Enum value | Never assigned |
| `TransactionStatus.FAILED` | Enum value | Never assigned |
| `TransactionStatus.REFUNDED` | Enum value | Never assigned |

---

## 26. Unknowns Requiring Later Investigation

1. **Does the production database have connection pooling configured?** No PgBouncer or connection limit parameters found in config.
2. **Are there more migrations in the production database?** Only one migration file exists in the repo.
3. **Is the `Account` model a remnant of a planned OAuth feature?** No OAuth library is installed.
4. **Is the `ReviewReport` model a remnant of a planned reporting feature?** No API endpoints exist.
5. **What happens to media `averageRating` when a user with APPROVED reviews is hard-deleted?** The rating becomes stale.
6. **Does the `INCOMPLETE` Stripe subscription status ever occur?** Stripe may set this during checkout; the webhook handler doesn't cover it.
7. **Are there database-level triggers or functions not captured in Prisma?** Cannot verify without database access.
8. **Is the in-memory `recentViews` Map a problem in production?** Depends on whether Render runs single or multiple instances.

---

## 27. Recommended Next Discovery Pass

1. **Frontend component and state audit** — Catalog all components, verify TanStack Query cache behavior, identify stale data risks.
2. **Stripe webhook end-to-end verification** — Trace all event types, verify edge cases (duplicate events, out-of-order delivery).
3. **Error handling and loading state audit** — Verify all pages handle loading, error, and empty states.
4. **UI/UX consistency audit** — Verify responsive design, consistent styling, accessibility.
5. **Performance audit** — Identify N+1 queries, missing pagination, large payload risks.
6. **Deployment readiness audit** — Verify environment variables, build scripts, health checks.
