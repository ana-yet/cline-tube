import prisma from "../config/prisma";

/**
 * Dashboard Service — User-level stats aggregation
 *
 * Returns personal metrics for the logged-in user's dashboard.
 * All data is scoped to the authenticated user — no cross-user leakage.
 */

export async function getUserDashboard(userId: string) {
  const [reviewCount, watchlistCount, pendingReviews, recentReviews] =
    await Promise.all([
      prisma.review.count({ where: { userId } }),
      prisma.watchlist.count({ where: { userId } }),
      prisma.review.count({ where: { userId, status: "PENDING" } }),
      prisma.review.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          rating: true,
          content: true,
          status: true,
          createdAt: true,
          media: {
            select: { id: true, title: true, slug: true, posterUrl: true },
          },
        },
      }),
    ]);

  return {
    reviewCount,
    watchlistCount,
    pendingReviews,
    recentReviews,
  };
}
