import prisma from "../config/prisma";
import { ApiError } from "../utils/errors";

export async function addToWatchlist(userId: string, mediaId: string) {
  const media = await prisma.media.findUnique({
    where: { id: mediaId },
    select: { id: true },
  });

  if (!media) {
    throw new ApiError(404, "Media not found", "MEDIA_NOT_FOUND");
  }

  // Check for duplicate
  const existing = await prisma.watchlist.findUnique({
    where: { userId_mediaId: { userId, mediaId } },
  });

  if (existing) {
    throw new ApiError(409, "Already in your watchlist", "DUPLICATE_ENTRY");
  }

  await prisma.watchlist.create({
    data: { userId, mediaId },
  });
}

// Remove from Watchlist

export async function removeFromWatchlist(userId: string, mediaId: string) {
  const existing = await prisma.watchlist.findUnique({
    where: { userId_mediaId: { userId, mediaId } },
  });

  if (!existing) {
    throw new ApiError(404, "Not in your watchlist", "NOT_FOUND");
  }

  await prisma.watchlist.delete({
    where: { userId_mediaId: { userId, mediaId } },
  });
}

// Get User Watchlist

export async function getWatchlist(userId: string) {
  const items = await prisma.watchlist.findMany({
    where: { userId },
    include: {
      media: {
        select: {
          id: true,
          title: true,
          slug: true,
          type: true,
          pricingType: true,
          posterUrl: true,
          backdropUrl: true,
          releaseYear: true,
          director: true,
          averageRating: true,
          reviewsCount: true,
          viewCount: true,
          genres: {
            select: {
              genre: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return items.map((item) => item.media);
}
