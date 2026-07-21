-- Phase 5 domain integrity controls: review moderation audit,
-- report lifecycle uniqueness, durable daily media view deduplication,
-- contact/content persistence, media lifecycle, profile image ownership,
-- last-active metadata, retention-safe finance snapshots, and supporting indexes.

CREATE TYPE "ReviewModerationActionType" AS ENUM (
  'SUBMITTED',
  'EDITED',
  'DELETED',
  'APPROVED',
  'REJECTED',
  'REPORT_SUBMITTED',
  'REPORT_RESOLVED',
  'REPORT_DISMISSED'
);

CREATE TYPE "MediaPublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "ContactSubmissionStatus" AS ENUM ('NEW', 'ASSIGNED', 'RESOLVED', 'DISMISSED');
CREATE TYPE "ContactSubmissionCategory" AS ENUM ('GENERAL', 'BILLING', 'TECHNICAL', 'CONTENT', 'ABUSE', 'OTHER');
CREATE TYPE "ContentPostType" AS ENUM ('BLOG', 'HELP', 'LEGAL');
CREATE TYPE "ContentPostStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

ALTER TABLE "User"
  ADD COLUMN "imagePublicId" TEXT,
  ADD COLUMN "lastActiveAt" TIMESTAMP(3);

ALTER TABLE "Media"
  ADD COLUMN "publicationStatus" "MediaPublicationStatus" NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "deletedAt" TIMESTAMP(3);

UPDATE "Media"
SET "publishedAt" = COALESCE("publishedAt", "createdAt")
WHERE "publicationStatus" = 'PUBLISHED';

ALTER TABLE "ReviewReport"
  ADD COLUMN "resolvedAt" TIMESTAMP(3),
  ADD COLUMN "resolvedById" TEXT,
  ADD COLUMN "resolutionNote" TEXT;

ALTER TABLE "Transaction"
  ADD COLUMN "customerEmailSnapshot" TEXT,
  ADD COLUMN "customerNameSnapshot" TEXT;

UPDATE "Transaction" t
SET "customerEmailSnapshot" = COALESCE(t."customerEmailSnapshot", u."email"),
    "customerNameSnapshot" = COALESCE(t."customerNameSnapshot", u."name")
FROM "User" u
WHERE t."userId" = u."id";

-- Existing duplicate reports are collapsed deterministically before the
-- reporter/review uniqueness constraint is installed. The oldest report is
-- retained as the canonical moderation record.
DELETE FROM "ReviewReport" rr
USING "ReviewReport" keep
WHERE rr."reviewId" = keep."reviewId"
  AND rr."userId" = keep."userId"
  AND (
    rr."createdAt" > keep."createdAt"
    OR (rr."createdAt" = keep."createdAt" AND rr."id" > keep."id")
  );

CREATE TABLE "ReviewModerationAction" (
  "id" TEXT NOT NULL,
  "reviewId" TEXT,
  "actorId" TEXT,
  "type" "ReviewModerationActionType" NOT NULL,
  "fromStatus" "ReviewStatus",
  "toStatus" "ReviewStatus",
  "reason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ReviewModerationAction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaViewDedup" (
  "id" TEXT NOT NULL,
  "mediaId" TEXT NOT NULL,
  "bucketDate" DATE NOT NULL,
  "viewerKey" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MediaViewDedup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContactSubmission" (
  "id" TEXT NOT NULL,
  "category" "ContactSubmissionCategory" NOT NULL DEFAULT 'GENERAL',
  "name" VARCHAR(160) NOT NULL,
  "email" VARCHAR(320) NOT NULL,
  "emailNormalized" VARCHAR(320) NOT NULL,
  "subject" VARCHAR(240) NOT NULL,
  "message" TEXT NOT NULL,
  "status" "ContactSubmissionStatus" NOT NULL DEFAULT 'NEW',
  "assignedToId" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "resolutionNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ContactSubmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentPost" (
  "id" TEXT NOT NULL,
  "type" "ContentPostType" NOT NULL DEFAULT 'BLOG',
  "slug" TEXT NOT NULL,
  "title" VARCHAR(240) NOT NULL,
  "excerpt" VARCHAR(500),
  "body" TEXT NOT NULL,
  "status" "ContentPostStatus" NOT NULL DEFAULT 'DRAFT',
  "authorId" TEXT,
  "publishedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "seoTitle" VARCHAR(240),
  "seoDescription" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ContentPost_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_resolvedById_fkey"
  FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReviewModerationAction" ADD CONSTRAINT "ReviewModerationAction_reviewId_fkey"
  FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReviewModerationAction" ADD CONSTRAINT "ReviewModerationAction_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MediaViewDedup" ADD CONSTRAINT "MediaViewDedup_mediaId_fkey"
  FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContactSubmission" ADD CONSTRAINT "ContactSubmission_assignedToId_fkey"
  FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ContentPost" ADD CONSTRAINT "ContentPost_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Transaction" DROP CONSTRAINT IF EXISTS "Transaction_userId_fkey";
ALTER TABLE "Transaction" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "User_imagePublicId_key" ON "User"("imagePublicId");
CREATE INDEX "User_lastActiveAt_idx" ON "User"("lastActiveAt");

CREATE UNIQUE INDEX "ReviewReport_reviewId_userId_key" ON "ReviewReport"("reviewId", "userId");
CREATE INDEX "ReviewReport_status_createdAt_idx" ON "ReviewReport"("status", "createdAt");
CREATE INDEX "ReviewReport_reviewId_status_idx" ON "ReviewReport"("reviewId", "status");

CREATE INDEX "ReviewModerationAction_reviewId_createdAt_idx" ON "ReviewModerationAction"("reviewId", "createdAt");
CREATE INDEX "ReviewModerationAction_actorId_createdAt_idx" ON "ReviewModerationAction"("actorId", "createdAt");
CREATE INDEX "ReviewModerationAction_type_createdAt_idx" ON "ReviewModerationAction"("type", "createdAt");

CREATE UNIQUE INDEX "MediaViewDedup_mediaId_bucketDate_viewerKey_key" ON "MediaViewDedup"("mediaId", "bucketDate", "viewerKey");
CREATE INDEX "MediaViewDedup_expiresAt_idx" ON "MediaViewDedup"("expiresAt");
CREATE INDEX "MediaViewDedup_mediaId_bucketDate_idx" ON "MediaViewDedup"("mediaId", "bucketDate");

CREATE INDEX "Media_publicationStatus_publishedAt_idx" ON "Media"("publicationStatus", "publishedAt");
CREATE INDEX "Media_publicationStatus_pricingType_createdAt_idx" ON "Media"("publicationStatus", "pricingType", "createdAt");
CREATE INDEX "Media_publicationStatus_type_createdAt_idx" ON "Media"("publicationStatus", "type", "createdAt");

CREATE INDEX "Transaction_userId_paidAt_idx" ON "Transaction"("userId", "paidAt");
CREATE INDEX "Transaction_paidAt_idx" ON "Transaction"("paidAt");
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");
CREATE INDEX "PasswordResetToken_expiresAt_used_idx" ON "PasswordResetToken"("expiresAt", "used");

CREATE INDEX "ContactSubmission_status_createdAt_idx" ON "ContactSubmission"("status", "createdAt");
CREATE INDEX "ContactSubmission_emailNormalized_idx" ON "ContactSubmission"("emailNormalized");
CREATE INDEX "ContactSubmission_assignedToId_status_idx" ON "ContactSubmission"("assignedToId", "status");

CREATE UNIQUE INDEX "ContentPost_slug_key" ON "ContentPost"("slug");
CREATE INDEX "ContentPost_status_publishedAt_idx" ON "ContentPost"("status", "publishedAt");
CREATE INDEX "ContentPost_type_status_idx" ON "ContentPost"("type", "status");
CREATE INDEX "ContentPost_authorId_idx" ON "ContentPost"("authorId");
