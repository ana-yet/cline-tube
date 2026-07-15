import prisma from "../config/prisma";
import { ApiError } from "../utils/errors";

/**
 * Content Service
 *
 * Manages editorial content (blog posts, help articles, legal pages).
 * Public reads only return PUBLISHED content.
 */

// ── List Published Content (Public) ───────────────────────

export async function listPublished(query: {
  page?: number;
  limit?: number;
  type?: string;
}) {
  const { page = 1, limit = 10, type } = query;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { status: "PUBLISHED" };
  if (type) where.type = type.toUpperCase();

  const [items, total] = await Promise.all([
    prisma.contentPost.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        type: true,
        slug: true,
        title: true,
        excerpt: true,
        publishedAt: true,
        seoTitle: true,
        seoDescription: true,
      },
    }),
    prisma.contentPost.count({ where }),
  ]);

  return {
    items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// ── Get Published Content by Slug (Public) ────────────────

export async function getBySlug(slug: string) {
  const post = await prisma.contentPost.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: {
      id: true,
      type: true,
      slug: true,
      title: true,
      excerpt: true,
      body: true,
      publishedAt: true,
      seoTitle: true,
      seoDescription: true,
      author: { select: { id: true, name: true } },
    },
  });

  if (!post) {
    throw new ApiError(404, "Content not found", "NOT_FOUND");
  }

  return post;
}

// ── List All Content (Admin — includes drafts) ────────────

export async function listAll(query: {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
}) {
  const { page = 1, limit = 20, type, status } = query;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (type) where.type = type.toUpperCase();
  if (status) where.status = status;

  const [items, total] = await Promise.all([
    prisma.contentPost.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        type: true,
        slug: true,
        title: true,
        excerpt: true,
        status: true,
        publishedAt: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { id: true, name: true } },
      },
    }),
    prisma.contentPost.count({ where }),
  ]);

  return {
    items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// ── Create Content (Admin) ────────────────────────────────

export async function createContent(input: {
  type?: string;
  title: string;
  slug: string;
  excerpt?: string;
  body: string;
  status?: string;
  seoTitle?: string;
  seoDescription?: string;
}, authorId: string) {
  // Check slug uniqueness
  const existing = await prisma.contentPost.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });

  if (existing) {
    throw new ApiError(409, "A post with this slug already exists", "SLUG_EXISTS");
  }

  const status = (input.status?.toUpperCase() || "DRAFT") as "DRAFT" | "PUBLISHED" | "ARCHIVED";

  const post = await prisma.contentPost.create({
    data: {
      type: (input.type?.toUpperCase() as "BLOG" | "HELP" | "LEGAL") || "BLOG",
      title: input.title.trim(),
      slug: input.slug.trim(),
      excerpt: input.excerpt?.trim(),
      body: input.body,
      status,
      authorId,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
      seoTitle: input.seoTitle?.trim(),
      seoDescription: input.seoDescription?.trim(),
    },
  });

  return post;
}

// ── Update Content (Admin) ────────────────────────────────

export async function updateContent(id: string, input: {
  title?: string;
  slug?: string;
  excerpt?: string;
  body?: string;
  status?: string;
  seoTitle?: string;
  seoDescription?: string;
}) {
  const existing = await prisma.contentPost.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!existing) {
    throw new ApiError(404, "Content not found", "NOT_FOUND");
  }

  // Check slug uniqueness if changing
  if (input.slug) {
    const slugTaken = await prisma.contentPost.findFirst({
      where: { slug: input.slug, id: { not: id } },
      select: { id: true },
    });
    if (slugTaken) {
      throw new ApiError(409, "A post with this slug already exists", "SLUG_EXISTS");
    }
  }

  const data: Record<string, unknown> = {};

  if (input.title !== undefined) data.title = input.title.trim();
  if (input.slug !== undefined) data.slug = input.slug.trim();
  if (input.excerpt !== undefined) data.excerpt = input.excerpt?.trim();
  if (input.body !== undefined) data.body = input.body;
  if (input.seoTitle !== undefined) data.seoTitle = input.seoTitle?.trim();
  if (input.seoDescription !== undefined) data.seoDescription = input.seoDescription?.trim();

  if (input.status) {
    const newStatus = input.status.toUpperCase();
    data.status = newStatus;
    if (newStatus === "PUBLISHED" && existing.status !== "PUBLISHED") {
      data.publishedAt = new Date();
    }
    if (newStatus === "ARCHIVED") {
      data.archivedAt = new Date();
    }
  }

  const post = await prisma.contentPost.update({
    where: { id },
    data,
  });

  return post;
}

// ── Delete Content (Admin) ────────────────────────────────

export async function deleteContent(id: string) {
  const existing = await prisma.contentPost.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    throw new ApiError(404, "Content not found", "NOT_FOUND");
  }

  await prisma.contentPost.delete({ where: { id } });
}
