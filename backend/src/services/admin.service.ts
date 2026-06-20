import prisma from "../config/prisma";

/**
 * Admin Service — Dashboard KPI Aggregation
 */

export async function getDashboardKPIs() {
  const [
    totalUsers,
    totalMedia,
    totalReviews,
    pendingReviews,
    totalWatchlists,
    avgRating,
  ] = await Promise.all([
    prisma.user.count({ where: { isDeleted: false } }),
    prisma.media.count(),
    prisma.review.count(),
    prisma.review.count({ where: { status: "PENDING" } }),
    prisma.watchlist.count(),
    prisma.review.aggregate({
      where: { status: "APPROVED" },
      _avg: { rating: true },
    }),
  ]);

  return {
    totalUsers,
    totalMedia,
    totalReviews,
    pendingReviews,
    totalWatchlists,
    averageRating: Number(avgRating._avg.rating?.toFixed(1) ?? 0),
  };
}
