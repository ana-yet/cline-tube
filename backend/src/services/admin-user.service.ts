import prisma from "../config/prisma";
import { ApiError } from "../utils/errors";

/**
 * Admin User Service
 *
 * User management operations for admins.
 * Read-only list + soft-delete/deactivation.
 * No role changes or password resets from this service.
 */

// ── List Users (Admin) ────────────────────────────────────

export async function listUsers(query: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}) {
  const { page = 1, limit = 20, search, role } = query;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { isDeleted: false };
  if (role) where.role = role;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        emailVerified: true,
        createdAt: true,
        lastActiveAt: true,
        _count: {
          select: { reviews: true, watchlist: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// ── Deactivate User (Soft Delete) ─────────────────────────

export async function deactivateUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isDeleted: true },
  });

  if (!user) {
    throw new ApiError(404, "User not found", "USER_NOT_FOUND");
  }

  if (user.isDeleted) {
    throw new ApiError(
      400,
      "User is already deactivated",
      "ALREADY_DEACTIVATED",
    );
  }

  // Prevent deactivating the last admin
  if (user.role === "ADMIN") {
    const adminCount = await prisma.user.count({
      where: { role: "ADMIN", isDeleted: false },
    });
    if (adminCount <= 1) {
      throw new ApiError(
        400,
        "Cannot deactivate the last admin account",
        "LAST_ADMIN",
      );
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isDeleted: true, deletedAt: new Date() },
  });

  // Revoke all refresh tokens
  await prisma.refreshToken.deleteMany({ where: { userId } });
}

// ── Reactivate User ───────────────────────────────────────

export async function reactivateUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isDeleted: true },
  });

  if (!user) {
    throw new ApiError(404, "User not found", "USER_NOT_FOUND");
  }

  if (!user.isDeleted) {
    throw new ApiError(400, "User is already active", "ALREADY_ACTIVE");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isDeleted: false, deletedAt: null },
  });
}

// ── Get User Detail (Admin) ───────────────────────────────

export async function getUserDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      emailVerified: true,
      isDeleted: true,
      createdAt: true,
      lastActiveAt: true,
      profile: {
        select: {
          bio: true,
          favoriteGenres: true,
          website: true,
        },
      },
      subscription: {
        select: {
          tier: true,
          status: true,
          currentPeriodEnd: true,
        },
      },
      _count: {
        select: { reviews: true, watchlist: true },
      },
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found", "USER_NOT_FOUND");
  }

  return user;
}
