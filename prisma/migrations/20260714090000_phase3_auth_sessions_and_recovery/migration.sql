-- Phase 3 auth expansion: refresh-token families, CSRF binding, and
-- single-use hashed password-reset tokens. Existing physical "token" columns
-- already contain hashes for refresh tokens and are reused as tokenHash fields
-- in Prisma to avoid a destructive rename.

ALTER TABLE "RefreshToken"
  ADD COLUMN "familyId" TEXT,
  ADD COLUMN "parentId" TEXT,
  ADD COLUMN "csrfTokenHash" TEXT,
  ADD COLUMN "userAgent" TEXT,
  ADD COLUMN "ipAddressHash" TEXT,
  ADD COLUMN "absoluteExpiresAt" TIMESTAMP(3),
  ADD COLUMN "usedAt" TIMESTAMP(3),
  ADD COLUMN "revokedAt" TIMESTAMP(3),
  ADD COLUMN "lastUsedAt" TIMESTAMP(3);

UPDATE "RefreshToken"
SET
  "familyId" = "id",
  "csrfTokenHash" = 'legacy-csrf-disabled',
  "absoluteExpiresAt" = "expiresAt",
  "lastUsedAt" = "createdAt"
WHERE "familyId" IS NULL;

ALTER TABLE "RefreshToken"
  ALTER COLUMN "familyId" SET NOT NULL,
  ALTER COLUMN "csrfTokenHash" SET NOT NULL,
  ALTER COLUMN "absoluteExpiresAt" SET NOT NULL,
  ALTER COLUMN "lastUsedAt" SET NOT NULL;

ALTER TABLE "PasswordResetToken"
  ADD COLUMN "usedAt" TIMESTAMP(3);

UPDATE "PasswordResetToken"
SET
  "used" = true,
  "usedAt" = COALESCE("usedAt", CURRENT_TIMESTAMP)
WHERE "used" = false;

CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");
CREATE INDEX "RefreshToken_userId_revokedAt_expiresAt_idx" ON "RefreshToken"("userId", "revokedAt", "expiresAt");
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");
CREATE INDEX "PasswordResetToken_expiresAt_used_idx" ON "PasswordResetToken"("expiresAt", "used");
