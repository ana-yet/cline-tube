import { createHmac } from "node:crypto";
import prisma from "../config/prisma";
import { Prisma, Role } from "@prisma/client";
import { env } from "../config/env";
import { ApiError } from "../utils/errors";
import { deleteImage } from "./cloudinary.service";
import { userHasPremiumAccess } from "./entitlement.service";
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
  publicationStatus: true,
  publishedAt: true,
  archivedAt: true,
  deletedAt: true,
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

type MediaLifecycleStatus = CreateMediaInput["publicationStatus"];

const liveMediaWhere = {
  publicationStatus: "PUBLISHED",
  deletedAt: null,
} satisfies Prisma.MediaWhereInput;

function lifecycleFields(
  publicationStatus?: MediaLifecycleStatus,
  existing?: { publishedAt: Date | null },
) {
  if (!publicationStatus) {
    return {};
  }

  const now = new Date();

  if (publicationStatus === "PUBLISHED") {
    return {
      publicationStatus,
      publishedAt: existing?.publishedAt ?? now,
      archivedAt: null,
      deletedAt: null,
    };
  }

  if (publicationStatus === "ARCHIVED") {
    return { publicationStatus, archivedAt: now };
  }

  return {
    publicationStatus,
    publishedAt: null,
    archivedAt: null,
    deletedAt: null,
  };
}

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
      ...lifecycleFields(mediaData.publicationStatus),
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
      publishedAt: true,
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
          ...lifecycleFields(mediaData.publicationStatus, existing),
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
      ...lifecycleFields(mediaData.publicationStatus, existing),
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
    select: { id: true },
  });

  if (!existing) {
    throw new ApiError(404, "Media not found", "MEDIA_NOT_FOUND");
  }

  const now = new Date();

  await prisma.media.update({
    where: { id },
    data: {
      publicationStatus: "ARCHIVED",
      archivedAt: now,
      deletedAt: now,
    },
  });
}

// Get Media by Slug (Public — premium link gated)

export async function getMediaBySlug(
  slug: string,
  viewer?: { id: string; role: Role | string },
) {
  const media = await prisma.media.findFirst({
    where: { slug, ...liveMediaWhere },
    select: mediaDetailSelect,
  });

  if (!media) {
    throw new ApiError(404, "Media not found", "MEDIA_NOT_FOUND");
  }

  if (media.pricingType === "PREMIUM") {
    const hasAccess = await userHasPremiumAccess(viewer?.id);

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
) {
  const media = await prisma.media.findFirst({
    where: { slug, ...liveMediaWhere },
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
    const hasAccess = await userHasPremiumAccess(userId);

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

// View Count (durable approximate daily dedup)

const VIEW_DEDUP_RETENTION_DAYS = 7;

function isUniqueViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

function utcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function viewerDedupKey(input: { ip?: string; userAgent?: string }) {
  const secret = env.MEDIA_VIEW_HMAC_SECRET || env.JWT_SECRET;
  const fingerprint = `${input.ip ?? "unknown"}:${input.userAgent ?? "unknown"}`;
  return createHmac("sha256", secret).update(fingerprint).digest("hex");
}

/**
 * Record a view for a media item.
 * Deduplicates by HMAC(IP + User-Agent) per UTC day in the database.
 * No raw viewer fingerprint is persisted.
 */
export async function recordView(
  slug: string,
  viewer: { ip?: string; userAgent?: string },
) {
  const media = await prisma.media.findFirst({
    where: { slug, ...liveMediaWhere },
    select: { id: true },
  });

  if (!media) {
    throw new ApiError(404, "Media not found", "MEDIA_NOT_FOUND");
  }

  const now = new Date();
  const bucketDate = utcDay(now);
  const viewerKey = viewerDedupKey(viewer);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.mediaViewDedup.create({
        data: {
          mediaId: media.id,
          bucketDate,
          viewerKey,
          expiresAt: addDays(bucketDate, VIEW_DEDUP_RETENTION_DAYS),
        },
      });

      await tx.media.update({
        where: { id: media.id },
        data: { viewCount: { increment: 1 } },
      });
    });

    return { recorded: true as const };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { recorded: false as const };
    }
    throw error;
  }
}

// List Media (Public — with search/filter/sort/pagination)

export async function listMedia(query: MediaQueryInput) {
  const { page, limit, search, genre, year, type, pricingType, sortBy } = query;
  const skip = (page - 1) * limit;

  // Build where clause
  const where: Prisma.MediaWhereInput = { ...liveMediaWhere };

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

// ── Get Related Media (by shared genres) ──────────────────

export async function getRelatedMedia(slug: string, limit: number = 8) {
  const media = await prisma.media.findUnique({
    where: { slug, ...liveMediaWhere },
    select: { id: true },
  });

  if (!media) {
    throw new ApiError(404, "Media not found", "MEDIA_NOT_FOUND");
  }

  // Get genre IDs for this media
  const mediaGenres = await prisma.mediaGenre.findMany({
    where: { mediaId: media.id },
    select: { genreId: true },
  });

  const genreIds = mediaGenres.map((g) => g.genreId);

  if (genreIds.length === 0) {
    return [];
  }

  // Find media sharing at least one genre, exclude current, prefer most shared
  const related = await prisma.media.findMany({
    where: {
      ...liveMediaWhere,
      id: { not: media.id },
      genres: { some: { genreId: { in: genreIds } } },
    },
    select: {
      ...mediaListSelect,
      _count: {
        select: {
          genres: { where: { genreId: { in: genreIds } } },
        },
      },
    },
    orderBy: [{ averageRating: "desc" }, { viewCount: "desc" }],
    take: limit,
  });

  // Sort by number of shared genres (most shared first)
  return related
    .sort((a, b) => (b._count?.genres ?? 0) - (a._count?.genres ?? 0));
}
