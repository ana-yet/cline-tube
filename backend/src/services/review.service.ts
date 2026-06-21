import { Prisma } from "@prisma/client";
import prisma from "../config/prisma";
import { ApiError } from "../utils/errors";
import type {
  CreateReviewInput,
  UpdateReviewInput,
  ReviewQueryInput,
} from "../validations/review.validation";

/**
 * Review Service
 *
 * Contains all review business logic.
 *
 * Key Business Rules:
 * - One review per user per media (enforced by @@unique in schema)
 * - Reviews start as PENDING — require admin approval
 * - Only APPROVED reviews affect media averageRating
 * - Rating recalculation uses Prisma transactions for consistency
 * - Users can only edit/delete their own reviews
 * - Editing a review resets status to PENDING (re-approval required)
 */

// Select Clauses

const reviewSelect = {
  id: true,
  rating: true,
  content: true,
  tags: true,
  spoilerWarning: true,
  status: true,
  publishedAt: true,
  userId: true,
  mediaId: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      image: true,
    },
  },
  _count: {
    select: {
      likes: true,
      comments: true,
    },
  },
} as const;

// Recalculate Media Rating (called in transactions)

async function recalculateMediaRating(
  tx: Prisma.TransactionClient,
  mediaId: string,
) {
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

// Create Review

export async function createReview(userId: string, input: CreateReviewInput) {
  // Verify media exists
  const media = await prisma.media.findUnique({
    where: { id: input.mediaId },
    select: { id: true },
  });

  if (!media) {
    throw new ApiError(404, "Media not found", "MEDIA_NOT_FOUND");
  }

  // Check for existing review (one per user per media)
  const existing = await prisma.review.findUnique({
    where: {
      userId_mediaId: { userId, mediaId: input.mediaId },
    },
    select: { id: true },
  });

  if (existing) {
    throw new ApiError(
      409,
      "You have already reviewed this media. Edit your existing review instead.",
      "REVIEW_ALREADY_EXISTS",
    );
  }

  const review = await prisma.review.create({
    data: {
      userId,
      mediaId: input.mediaId,
      rating: input.rating,
      content: input.content,
      tags: input.tags,
      spoilerWarning: input.spoilerWarning,
      status: "PENDING",
    },
    select: reviewSelect,
  });

  return review;
}

// Update Review

export async function updateReview(
  userId: string,
  reviewId: string,
  input: UpdateReviewInput,
) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, userId: true, mediaId: true, status: true },
  });

  if (!review) {
    throw new ApiError(404, "Review not found", "REVIEW_NOT_FOUND");
  }

  if (review.userId !== userId) {
    throw new ApiError(403, "You can only edit your own reviews", "FORBIDDEN");
  }

  // Editing resets status to PENDING (re-approval required)
  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: {
      ...input,
      status: "PENDING",
      publishedAt: null,
    },
    select: reviewSelect,
  });

  // Re-approval required; drop stale rating if this review was public
  if (review.status === "APPROVED") {
    await recalculateMediaRating(prisma, review.mediaId);
  }

  return updated;
}

// Delete Review

export async function deleteReview(userId: string, reviewId: string) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, userId: true, mediaId: true, status: true },
  });

  if (!review) {
    throw new ApiError(404, "Review not found", "REVIEW_NOT_FOUND");
  }

  if (review.userId !== userId) {
    throw new ApiError(
      403,
      "You can only delete your own reviews",
      "FORBIDDEN",
    );
  }

  // Delete and recalculate in transaction
  await prisma.$transaction(async (tx) => {
    await tx.review.delete({ where: { id: reviewId } });

    // Recalculate media rating if the review was approved
    if (review.status === "APPROVED") {
      await recalculateMediaRating(tx, review.mediaId);
    }
  });
}

// Get Reviews by Media (Public — only APPROVED)

export async function getReviewsByMedia(
  mediaSlug: string,
  query: ReviewQueryInput,
) {
  const { page, limit, sortBy } = query;
  const skip = (page - 1) * limit;

  // Resolve media ID from slug
  const media = await prisma.media.findUnique({
    where: { slug: mediaSlug },
    select: { id: true },
  });

  if (!media) {
    throw new ApiError(404, "Media not found", "MEDIA_NOT_FOUND");
  }

  const where = { mediaId: media.id, status: "APPROVED" as const };

  let orderBy: Record<string, string> = {};
  switch (sortBy) {
    case "top-rated":
      orderBy = { rating: "desc" };
      break;
    case "most-liked":
      orderBy = { createdAt: "desc" }; // Will sort client-side or use raw query
      break;
    case "latest":
    default:
      orderBy = { createdAt: "desc" };
      break;
  }

  const [items, total] = await Promise.all([
    prisma.review.findMany({
      where,
      select: reviewSelect,
      orderBy,
      skip,
      take: limit,
    }),
    prisma.review.count({ where }),
  ]);

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// Get My Review for Media (Authenticated — any status)

export async function getMyReviewForMedia(userId: string, mediaSlug: string) {
  const media = await prisma.media.findUnique({
    where: { slug: mediaSlug },
    select: { id: true },
  });

  if (!media) {
    throw new ApiError(404, "Media not found", "MEDIA_NOT_FOUND");
  }

  const review = await prisma.review.findUnique({
    where: {
      userId_mediaId: { userId, mediaId: media.id },
    },
    select: reviewSelect,
  });

  return review;
}

// Get My Reviews

export async function getMyReviews(userId: string, query: ReviewQueryInput) {
  const { page, limit } = query;
  const skip = (page - 1) * limit;

  const where = { userId };

  const [items, total] = await Promise.all([
    prisma.review.findMany({
      where,
      select: {
        ...reviewSelect,
        media: {
          select: {
            id: true,
            title: true,
            slug: true,
            posterUrl: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.review.count({ where }),
  ]);

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// Admin: Get Pending Reviews

export async function getPendingReviews(query: ReviewQueryInput) {
  const { page, limit } = query;
  const skip = (page - 1) * limit;

  const where = { status: "PENDING" as const };

  const [items, total] = await Promise.all([
    prisma.review.findMany({
      where,
      select: {
        ...reviewSelect,
        media: {
          select: {
            id: true,
            title: true,
            slug: true,
            posterUrl: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
      skip,
      take: limit,
    }),
    prisma.review.count({ where }),
  ]);

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// Admin: Approve Review

export async function approveReview(reviewId: string) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, status: true, mediaId: true },
  });

  if (!review) {
    throw new ApiError(404, "Review not found", "REVIEW_NOT_FOUND");
  }

  if (review.status === "APPROVED") {
    throw new ApiError(400, "Review is already approved", "ALREADY_APPROVED");
  }

  // Approve and recalculate in transaction
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.review.update({
      where: { id: reviewId },
      data: {
        status: "APPROVED",
        publishedAt: new Date(),
      },
      select: reviewSelect,
    });

    await recalculateMediaRating(tx, review.mediaId);

    return result;
  });

  return updated;
}

// Admin: Reject Review

export async function rejectReview(reviewId: string) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, status: true, mediaId: true },
  });

  if (!review) {
    throw new ApiError(404, "Review not found", "REVIEW_NOT_FOUND");
  }

  if (review.status === "REJECTED") {
    throw new ApiError(400, "Review is already rejected", "ALREADY_REJECTED");
  }

  // Reject and recalculate in transaction
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.review.update({
      where: { id: reviewId },
      data: {
        status: "REJECTED",
        publishedAt: null,
      },
      select: reviewSelect,
    });

    // Recalculate — this review's rating no longer counts
    await recalculateMediaRating(tx, review.mediaId);

    return result;
  });

  return updated;
}

// Toggle Like

export async function toggleLike(userId: string, reviewId: string) {
  // Verify review exists
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true },
  });

  if (!review) {
    throw new ApiError(404, "Review not found", "REVIEW_NOT_FOUND");
  }

  // Check if already liked
  const existing = await prisma.reviewLike.findUnique({
    where: {
      userId_reviewId: { userId, reviewId },
    },
  });

  if (existing) {
    // Unlike
    await prisma.reviewLike.delete({
      where: {
        userId_reviewId: { userId, reviewId },
      },
    });
    return { liked: false };
  }

  // Like
  await prisma.reviewLike.create({
    data: { userId, reviewId },
  });

  return { liked: true };
}
