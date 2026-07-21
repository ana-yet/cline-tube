import prisma from "../config/prisma";

const DEFAULT_BATCH_SIZE = 500;

type CleanupOptions = {
  now?: Date;
  batchSize?: number;
};

function take(options?: CleanupOptions) {
  return Math.max(1, Math.min(options?.batchSize ?? DEFAULT_BATCH_SIZE, 1000));
}

/**
 * Deletes expired operational data only. It intentionally excludes financial
 * ledgers, moderation audit, and user-generated content because those require
 * explicit retention approval.
 */
export async function cleanupExpiredOperationalRows(options?: CleanupOptions) {
  const now = options?.now ?? new Date();
  const limit = take(options);

  return prisma.$transaction(async (tx) => {
    const [resetTokens, refreshTokens, checkoutAttempts, mediaViewDedup] =
      await Promise.all([
        tx.passwordResetToken.findMany({
          where: {
            OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }],
          },
          select: { id: true },
          take: limit,
        }),
        tx.refreshToken.findMany({
          where: { expiresAt: { lt: now }, revokedAt: { not: null } },
          select: { id: true },
          take: limit,
        }),
        tx.checkoutAttempt.findMany({
          where: {
            expiresAt: { lt: now },
            status: { in: ["CANCELED", "FAILED", "EXPIRED"] },
          },
          select: { id: true },
          take: limit,
        }),
        tx.mediaViewDedup.findMany({
          where: { expiresAt: { lt: now } },
          select: { id: true },
          take: limit,
        }),
      ]);

    const [deletedResetTokens, deletedRefreshTokens, deletedCheckoutAttempts, deletedMediaViewDedup] =
      await Promise.all([
        tx.passwordResetToken.deleteMany({
          where: { id: { in: resetTokens.map((row) => row.id) } },
        }),
        tx.refreshToken.deleteMany({
          where: { id: { in: refreshTokens.map((row) => row.id) } },
        }),
        tx.checkoutAttempt.deleteMany({
          where: { id: { in: checkoutAttempts.map((row) => row.id) } },
        }),
        tx.mediaViewDedup.deleteMany({
          where: { id: { in: mediaViewDedup.map((row) => row.id) } },
        }),
      ]);

    return {
      passwordResetTokens: deletedResetTokens.count,
      refreshTokens: deletedRefreshTokens.count,
      checkoutAttempts: deletedCheckoutAttempts.count,
      mediaViewDedup: deletedMediaViewDedup.count,
    };
  });
}
