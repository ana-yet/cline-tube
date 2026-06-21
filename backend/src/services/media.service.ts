import prisma from "../config/prisma";
import {
  Role,
  SubscriptionStatus,
  SubscriptionTier,
} from "@prisma/client";
import { ApiError } from "../utils/errors";
import { deleteImage } from "./cloudinary.service";
import type {
  CreateMediaInput,
  UpdateMediaInput,
  MediaQueryInput,
} from "../validations/media.validation";

// Media business logic: CRUD, slug generation, genre relations, view tracking,
// premium gating, and list search/filter/sort/pagination.

/**
 * Generate a URL-friendly slug from a title.
 * Appends a short random suffix to prevent collisions.
 */
function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);

  const suffix = Math.random().toString(36).substring(2, 8);
  return `${base}-${suffix}`;
}

/** Standard select clause for media list responses */
const mediaListSelect = {
  id: true,
  title: true,
  slug: true,
  type: true,
  pricingType: true,
  posterUrl: true,
  posterPublicId: true,
  backdropUrl: true,
  backdropPublicId: true,
  releaseYear: true,
  director: true,
  averageRating: true,
  reviewsCount: true,
  viewCount: true,
  createdAt: true,
  genres: {
    select: {
      genre: { select: { id: true, name: true } },
    },
  },
} as const;

/** Standard select clause for media detail responses */
const mediaDetailSelect = {
  ...mediaListSelect,
  synopsis: true,
  streamingLink: true,
  cast: true,
  updatedAt: true,
} as const;

// Create Media (Admin)

export async function createMedia(input: CreateMediaInput) {
  const { genreIds, ...mediaData } = input;
  const slug = generateSlug(mediaData.title);

  // Verify all genre IDs exist
  const genres = await prisma.genre.findMany({
    where: { id: { in: genreIds } },
  });

  if (genres.length !== genreIds.length) {
    throw new ApiError(
      400,
      "One or more genre IDs are invalid",
      "INVALID_GENRES",
    );
  }

  const media = await prisma.media.create({
    data: {
      ...mediaData,
      slug,
      cast: mediaData.cast,
      genres: {
        create: genreIds.map((genreId) => ({ genreId })),
      },
    },
    select: mediaDetailSelect,
  });

  return media;
}

// Update Media (Admin)

export async function updateMedia(id: string, input: UpdateMediaInput) {
  // Check media exists
  const existing = await prisma.media.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      posterPublicId: true,
      backdropPublicId: true,
    },
  });

  if (!existing) {
    throw new ApiError(404, "Media not found", "MEDIA_NOT_FOUND");
  }

  const { genreIds, ...mediaData } = input;

  // If title changed, regenerate slug
  let slug: string | undefined;
  if (mediaData.title && mediaData.title !== existing.title) {
    slug = generateSlug(mediaData.title);
  }

  // Delete old Cloudinary images if new ones are being set
  if (
    mediaData.posterPublicId &&
    existing.posterPublicId &&
    mediaData.posterPublicId !== existing.posterPublicId
  ) {
    deleteImage(existing.posterPublicId).catch(() => {});
  }
  if (
    mediaData.backdropPublicId &&
    existing.backdropPublicId &&
    mediaData.backdropPublicId !== existing.backdropPublicId
  ) {
    deleteImage(existing.backdropPublicId).catch(() => {});
  }

  // Update media in a transaction if genres are being changed
  if (genreIds) {
    const genres = await prisma.genre.findMany({
      where: { id: { in: genreIds } },
    });

    if (genres.length !== genreIds.length) {
      throw new ApiError(
        400,
        "One or more genre IDs are invalid",
        "INVALID_GENRES",
      );
    }

    const media = await prisma.$transaction(async (tx) => {
      // Delete existing genre connections
      await tx.mediaGenre.deleteMany({ where: { mediaId: id } });

      // Update media with new data + genres
      return tx.media.update({
        where: { id },
        data: {
          ...mediaData,
          ...(slug && { slug }),
          genres: {
            create: genreIds.map((genreId) => ({ genreId })),
          },
        },
        select: mediaDetailSelect,
      });
    });

    return media;
  }

  // Simple update without genre changes
  const media = await prisma.media.update({
    where: { id },
    data: {
      ...mediaData,
      ...(slug && { slug }),
    },
    select: mediaDetailSelect,
  });

  return media;
}

// Delete Media (Admin)

export async function deleteMedia(id: string) {
  const existing = await prisma.media.findUnique({
    where: { id },
    select: { id: true, posterPublicId: true, backdropPublicId: true },
  });

  if (!existing) {
    throw new ApiError(404, "Media not found", "MEDIA_NOT_FOUND");
  }

  // Delete Cloudinary images (fire-and-forget, don't block DB delete)
  if (existing.posterPublicId) {
    deleteImage(existing.posterPublicId).catch(() => {});
  }
  if (existing.backdropPublicId) {
    deleteImage(existing.backdropPublicId).catch(() => {});
  }

  await prisma.media.delete({ where: { id } });
}

// Premium access helper

async function userHasPremiumAccess(
  userId?: string,
  role?: Role | string,
): Promise<boolean> {
  if (role === Role.ADMIN) {
    return true;
  }

  if (!userId) {
    return false;
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: {
      tier: true,
      status: true,
      currentPeriodEnd: true,
    },
  });

  return !!(
    subscription &&
    subscription.tier !== SubscriptionTier.FREE &&
    subscription.status === SubscriptionStatus.ACTIVE &&
    subscription.currentPeriodEnd > new Date()
  );
}

// Get Media by Slug (Public — premium link gated)

export async function getMediaBySlug(
  slug: string,
  viewer?: { id: string; role: Role | string },
) {
  const media = await prisma.media.findUnique({
    where: { slug },
    select: mediaDetailSelect,
  });

  if (!media) {
    throw new ApiError(404, "Media not found", "MEDIA_NOT_FOUND");
  }

  if (media.pricingType === "PREMIUM") {
    const hasAccess = await userHasPremiumAccess(viewer?.id, viewer?.role);

    if (!hasAccess) {
      return {
        ...media,
        streamingLink: null,
        accessRestricted: true as const,
      };
    }
  }

  return {
    ...media,
    accessRestricted: false as const,
  };
}

// Get Stream Link (Authenticated — premium enforced)

export async function getStreamLink(
  slug: string,
  userId: string,
  role: Role | string,
) {
  const media = await prisma.media.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      pricingType: true,
      streamingLink: true,
    },
  });

  if (!media || !media.streamingLink) {
    throw new ApiError(404, "Media not found", "MEDIA_NOT_FOUND");
  }

  if (media.pricingType === "PREMIUM") {
    const hasAccess = await userHasPremiumAccess(userId, role);

    if (!hasAccess) {
      throw new ApiError(
        403,
        "Premium subscription required to stream this title",
        "SUBSCRIPTION_REQUIRED",
      );
    }
  }

  return {
    streamingLink: media.streamingLink,
    title: media.title,
  };
}

// View Count (deduplicated per IP+slug, 1-hour window)

const recentViews = new Map<string, number>();
const VIEW_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

// Periodic cleanup to prevent memory leak (every 10 minutes)
setInterval(
  () => {
    const now = Date.now();
    for (const [key, timestamp] of recentViews) {
      if (now - timestamp > VIEW_COOLDOWN_MS) {
        recentViews.delete(key);
      }
    }
  },
  10 * 60 * 1000,
).unref();

/**
 * Record a view for a media item.
 * Deduplicates by IP + slug within a 1-hour window.
 * Prevents: page refresh spam, crawler inflation, admin preview counting.
 */
export async function recordView(slug: string, ip: string | undefined) {
  const key = `${ip ?? "unknown"}:${slug}`;
  const now = Date.now();
  const lastView = recentViews.get(key);

  if (lastView && now - lastView < VIEW_COOLDOWN_MS) {
    return; // Already counted recently — skip
  }

  recentViews.set(key, now);

  await prisma.media.update({
    where: { slug },
    data: { viewCount: { increment: 1 } },
  });
}

// List Media (Public — with search/filter/sort/pagination)

export async function listMedia(query: MediaQueryInput) {
  const { page, limit, search, genre, year, type, pricingType, sortBy } = query;
  const skip = (page - 1) * limit;

  // Build where clause
  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { director: { contains: search, mode: "insensitive" } },
      { synopsis: { contains: search, mode: "insensitive" } },
    ];
  }

  if (genre) {
    where.genres = {
      some: {
        genre: { name: { equals: genre, mode: "insensitive" } },
      },
    };
  }

  if (year) {
    where.releaseYear = year;
  }

  if (type) {
    where.type = type;
  }

  if (pricingType) {
    where.pricingType = pricingType;
  }

  // Build orderBy
  let orderBy: Record<string, string> = {};
  switch (sortBy) {
    case "top-rated":
      orderBy = { averageRating: "desc" };
      break;
    case "popular":
      orderBy = { viewCount: "desc" };
      break;
    case "most-reviewed":
      orderBy = { reviewsCount: "desc" };
      break;
    case "latest":
    default:
      orderBy = { createdAt: "desc" };
      break;
  }

  const [items, total] = await Promise.all([
    prisma.media.findMany({
      where,
      select: mediaListSelect,
      orderBy,
      skip,
      take: limit,
    }),
    prisma.media.count({ where }),
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

// List All Genres (Public)

export async function listGenres() {
  const genres = await prisma.genre.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return genres;
}

// Get Media by ID (Admin)

export async function getMediaById(id: string) {
  const media = await prisma.media.findUnique({
    where: { id },
    select: mediaDetailSelect,
  });

  if (!media) {
    throw new ApiError(404, "Media not found", "MEDIA_NOT_FOUND");
  }

  return media;
}
