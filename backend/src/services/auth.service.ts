import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import prisma from "../config/prisma";
import { env } from "../config/env";
import { generateCsrfToken } from "../middlewares/csrf";
import { sendPasswordResetEmail } from "./email.service";
import { ApiError } from "../utils/errors";
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
} from "../utils/jwt";
import type {
  RegisterInput,
  LoginInput,
  ChangePasswordInput,
} from "../validations/auth.validation";

const BCRYPT_SALT_ROUNDS = 12;
const REFRESH_TOKEN_EXPIRY_MS = parseDurationMs(
  env.JWT_REFRESH_EXPIRY,
  7 * 24 * 60 * 60 * 1000,
);
const REFRESH_TOKEN_ABSOLUTE_EXPIRY_MS = REFRESH_TOKEN_EXPIRY_MS;
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000;
const REFRESH_REUSE_GRACE_MS = 10_000;
const MAX_ACTIVE_SESSIONS = 5;
const MAX_USER_AGENT_LENGTH = 240;

export const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  // Cross-origin frontend (Vercel) + API (Render) requires SameSite=None.
  sameSite: (env.NODE_ENV === "production" ? "none" : "strict") as
    | "strict"
    | "none",
  maxAge: REFRESH_TOKEN_EXPIRY_MS,
  path: "/",
};

export const clearRefreshTokenCookieOptions = {
  httpOnly: refreshTokenCookieOptions.httpOnly,
  secure: refreshTokenCookieOptions.secure,
  sameSite: refreshTokenCookieOptions.sameSite,
  path: refreshTokenCookieOptions.path,
};

type SafeUserRecord = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  image: string | null;
  emailVerified: Date | null;
  createdAt: Date;
};

interface SessionMetadata {
  userAgent?: string;
  ipAddress?: string;
}

function sanitizeUser(user: SafeUserRecord) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    image: user.image,
    emailVerified: user.emailVerified?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

function normalizeMetadata(metadata: SessionMetadata) {
  return {
    userAgent: metadata.userAgent?.slice(0, MAX_USER_AGENT_LENGTH),
    ipAddressHash: metadata.ipAddress ? hashToken(metadata.ipAddress) : null,
  };
}

export async function register(
  input: RegisterInput,
  metadata: SessionMetadata = {},
) {
  const { name, email, password } = input;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ApiError(
      409,
      "A user with this email already exists",
      "EMAIL_ALREADY_EXISTS",
    );
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      profile: {
        create: {
          favoriteGenres: [],
        },
      },
    },
    select: safeUserSelect(),
  });

  const session = await createRefreshSession(user.id, metadata);

  return {
    user: sanitizeUser(user),
    accessToken: generateAccessToken(user.id, user.email, user.role),
    refreshToken: session.refreshToken,
    csrfToken: session.csrfToken,
  };
}

export async function login(input: LoginInput, metadata: SessionMetadata = {}) {
  const { email, password } = input;

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      ...safeUserSelect(),
      passwordHash: true,
      isDeleted: true,
    },
  });

  if (!user || user.isDeleted) {
    throw new ApiError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  if (!user.passwordHash) {
    throw new ApiError(
      401,
      "This account uses social login. Please sign in with your social provider.",
      "SOCIAL_ACCOUNT",
    );
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  const session = await createRefreshSession(user.id, metadata);

  return {
    user: sanitizeUser(user),
    accessToken: generateAccessToken(user.id, user.email, user.role),
    refreshToken: session.refreshToken,
    csrfToken: session.csrfToken,
  };
}

export async function logout(refreshToken: string | undefined) {
  if (!refreshToken) return;

  await revokeFamilyForToken(refreshToken);
}

export async function logoutAll(userId: string) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function refreshTokens(
  oldRefreshToken: string,
  csrfToken: string,
  metadata: SessionMetadata = {},
) {
  const tokenHash = hashToken(oldRefreshToken);
  const csrfTokenHash = hashToken(csrfToken);
  const now = new Date();

  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          ...safeUserSelect(),
          isDeleted: true,
        },
      },
    },
  });

  if (!storedToken) {
    throw new ApiError(401, "Invalid refresh token", "INVALID_REFRESH_TOKEN");
  }

  if (storedToken.csrfTokenHash !== csrfTokenHash) {
    throw new ApiError(403, "CSRF token mismatch", "CSRF_TOKEN_MISMATCH");
  }

  if (storedToken.usedAt || storedToken.revokedAt) {
    await handleRefreshReuse(storedToken.familyId, storedToken.usedAt, now);
  }

  if (
    storedToken.expiresAt <= now ||
    storedToken.absoluteExpiresAt <= now ||
    !storedToken.user ||
    storedToken.user.isDeleted
  ) {
    await revokeRefreshFamily(storedToken.familyId);
    throw new ApiError(401, "Refresh token expired", "REFRESH_TOKEN_EXPIRED");
  }

  const consumed = await prisma.refreshToken.updateMany({
    where: {
      id: storedToken.id,
      tokenHash,
      usedAt: null,
      revokedAt: null,
    },
    data: {
      usedAt: now,
      lastUsedAt: now,
    },
  });

  if (consumed.count !== 1) {
    const latest = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: { familyId: true, usedAt: true },
    });
    await handleRefreshReuse(
      latest?.familyId ?? storedToken.familyId,
      latest?.usedAt ?? null,
      now,
    );
  }

  const refreshToken = generateRefreshToken();
  const newCsrfToken = generateCsrfToken();
  const { userAgent, ipAddressHash } = normalizeMetadata(metadata);
  const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_EXPIRY_MS);
  const absoluteExpiresAt =
    storedToken.absoluteExpiresAt < expiresAt ? storedToken.absoluteExpiresAt : expiresAt;

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId: storedToken.userId,
      familyId: storedToken.familyId,
      parentId: storedToken.id,
      csrfTokenHash: hashToken(newCsrfToken),
      userAgent,
      ipAddressHash,
      expiresAt,
      absoluteExpiresAt,
      lastUsedAt: now,
    },
  });

  const user = storedToken.user;

  return {
    user: sanitizeUser(user),
    accessToken: generateAccessToken(user.id, user.email, user.role),
    refreshToken,
    csrfToken: newCsrfToken,
  };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...safeUserSelect(),
      isDeleted: true,
      profile: {
        select: {
          bio: true,
          favoriteGenres: true,
          website: true,
          twitter: true,
          facebook: true,
          github: true,
        },
      },
      subscription: {
        select: {
          id: true,
          tier: true,
          status: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
        },
      },
    },
  });

  if (!user || user.isDeleted) {
    throw new ApiError(404, "User not found", "USER_NOT_FOUND");
  }

  return {
    ...sanitizeUser(user),
    profile: user.profile,
    subscription: user.subscription
      ? {
          ...user.subscription,
          currentPeriodStart:
            user.subscription.currentPeriodStart.toISOString(),
          currentPeriodEnd: user.subscription.currentPeriodEnd.toISOString(),
        }
      : null,
  };
}

export async function requestPasswordReset(email: string) {
  const genericResult = {
    message:
      "If an account exists for that email, password reset instructions have been sent.",
  };

  if (env.EMAIL_DELIVERY_MODE === "disabled") {
    throw new ApiError(
      503,
      "Password recovery is temporarily unavailable. Please try again later.",
      "PASSWORD_RESET_UNAVAILABLE",
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      isDeleted: true,
    },
  });

  if (!user || user.isDeleted) {
    await antiEnumerationDelay();
    return genericResult;
  }

  const resetToken = generateRefreshToken();
  const tokenHash = hashToken(resetToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

  await prisma.passwordResetToken.updateMany({
    where: {
      userId: user.id,
      used: false,
      expiresAt: { gt: new Date() },
    },
    data: {
      used: true,
      usedAt: new Date(),
    },
  });

  await prisma.passwordResetToken.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt,
    },
  });

  try {
    const resetUrl = new URL("/reset-password", env.FRONTEND_URL);
    resetUrl.searchParams.set("token", resetToken);

    await sendPasswordResetEmail({
      to: user.email,
      resetUrl: resetUrl.toString(),
    });
  } catch (error) {
    await prisma.passwordResetToken.updateMany({
      where: { tokenHash },
      data: {
        used: true,
        usedAt: new Date(),
      },
    });
    throw error;
  }

  return genericResult;
}

export async function resetPassword(token: string, newPassword: string) {
  const tokenHash = hashToken(token);
  const now = new Date();

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          passwordHash: true,
          isDeleted: true,
        },
      },
    },
  });

  if (
    !resetToken ||
    resetToken.used ||
    resetToken.usedAt ||
    resetToken.expiresAt <= now ||
    resetToken.user.isDeleted ||
    !resetToken.user.passwordHash
  ) {
    throw new ApiError(
      400,
      "Reset token is invalid or expired",
      "INVALID_RESET_TOKEN",
    );
  }

  await assertNewPassword(resetToken.user.passwordHash, newPassword);
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: {
        used: true,
        usedAt: now,
      },
    }),
    prisma.passwordResetToken.updateMany({
      where: {
        userId: resetToken.userId,
        used: false,
      },
      data: {
        used: true,
        usedAt: now,
      },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: resetToken.userId, revokedAt: null },
      data: { revokedAt: now },
    }),
  ]);
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
  currentRefreshToken?: string,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      passwordHash: true,
      isDeleted: true,
    },
  });

  if (!user || user.isDeleted || !user.passwordHash) {
    throw new ApiError(404, "User not found", "USER_NOT_FOUND");
  }

  const isCurrentPasswordValid = await bcrypt.compare(
    input.currentPassword,
    user.passwordHash,
  );

  if (!isCurrentPasswordValid) {
    throw new ApiError(
      401,
      "Current password is incorrect",
      "INVALID_CURRENT_PASSWORD",
    );
  }

  await assertNewPassword(user.passwordHash, input.password);

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS);
  const currentFamilyId = currentRefreshToken
    ? await findFamilyIdForToken(currentRefreshToken)
    : null;
  const now = new Date();

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    }),
    prisma.refreshToken.updateMany({
      where: {
        userId: user.id,
        revokedAt: null,
        ...(currentFamilyId ? { familyId: { not: currentFamilyId } } : {}),
      },
      data: { revokedAt: now },
    }),
  ]);
}

export async function listSessions(userId: string, currentRefreshToken?: string) {
  const now = new Date();
  const currentFamilyId = currentRefreshToken
    ? await findFamilyIdForToken(currentRefreshToken)
    : null;

  const tokens = await prisma.refreshToken.findMany({
    where: {
      userId,
      revokedAt: null,
      usedAt: null,
      expiresAt: { gt: now },
      absoluteExpiresAt: { gt: now },
    },
    orderBy: [{ lastUsedAt: "desc" }, { createdAt: "desc" }],
    select: {
      familyId: true,
      userAgent: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
    },
  });

  const sessions = new Map<
    string,
    {
      id: string;
      device: string;
      createdAt: Date;
      lastUsedAt: Date;
      expiresAt: Date;
      current: boolean;
    }
  >();

  for (const token of tokens) {
    if (sessions.has(token.familyId)) continue;

    sessions.set(token.familyId, {
      id: token.familyId,
      device: token.userAgent || "Unknown browser",
      createdAt: token.createdAt,
      lastUsedAt: token.lastUsedAt,
      expiresAt: token.expiresAt,
      current: token.familyId === currentFamilyId,
    });
  }

  return Array.from(sessions.values()).map((session) => ({
    ...session,
    createdAt: session.createdAt.toISOString(),
    lastUsedAt: session.lastUsedAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
  }));
}

export async function revokeSession(
  userId: string,
  familyId: string,
  currentRefreshToken?: string,
) {
  const currentFamilyId = currentRefreshToken
    ? await findFamilyIdForToken(currentRefreshToken)
    : null;

  const result = await prisma.refreshToken.updateMany({
    where: {
      userId,
      familyId,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });

  if (result.count === 0) {
    throw new ApiError(404, "Session not found", "SESSION_NOT_FOUND");
  }

  return {
    revokedCurrentSession: familyId === currentFamilyId,
  };
}

async function createRefreshSession(
  userId: string,
  metadata: SessionMetadata,
) {
  const refreshToken = generateRefreshToken();
  const csrfToken = generateCsrfToken();
  const familyId = randomUUID();
  const now = new Date();
  const { userAgent, ipAddressHash } = normalizeMetadata(metadata);
  const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_EXPIRY_MS);
  const absoluteExpiresAt = new Date(
    now.getTime() + REFRESH_TOKEN_ABSOLUTE_EXPIRY_MS,
  );

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId,
      familyId,
      csrfTokenHash: hashToken(csrfToken),
      userAgent,
      ipAddressHash,
      expiresAt,
      absoluteExpiresAt,
      lastUsedAt: now,
    },
  });

  await enforceSessionLimit(userId);

  return { refreshToken, csrfToken };
}

async function enforceSessionLimit(userId: string) {
  const now = new Date();
  const activeTokens = await prisma.refreshToken.findMany({
    where: {
      userId,
      revokedAt: null,
      usedAt: null,
      expiresAt: { gt: now },
      absoluteExpiresAt: { gt: now },
    },
    select: {
      familyId: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });

  const families = new Map<string, Date>();
  for (const token of activeTokens) {
    const seen = families.get(token.familyId);
    const activity =
      token.lastUsedAt > token.createdAt ? token.lastUsedAt : token.createdAt;

    if (!seen || activity > seen) {
      families.set(token.familyId, activity);
    }
  }

  const excessFamilyIds = Array.from(families.entries())
    .sort((a, b) => b[1].getTime() - a[1].getTime())
    .slice(MAX_ACTIVE_SESSIONS)
    .map(([familyId]) => familyId);

  if (excessFamilyIds.length === 0) return;

  await prisma.refreshToken.updateMany({
    where: {
      userId,
      familyId: { in: excessFamilyIds },
      revokedAt: null,
    },
    data: { revokedAt: now },
  });
}

async function handleRefreshReuse(
  familyId: string,
  usedAt: Date | null,
  now: Date,
): Promise<never> {
  if (usedAt && now.getTime() - usedAt.getTime() <= REFRESH_REUSE_GRACE_MS) {
    throw new ApiError(
      409,
      "Refresh token already rotated",
      "REFRESH_ALREADY_ROTATED",
    );
  }

  await revokeRefreshFamily(familyId);
  throw new ApiError(
    401,
    "Refresh token reuse detected",
    "SESSION_REUSE_DETECTED",
  );
}

async function revokeRefreshFamily(familyId: string) {
  await prisma.refreshToken.updateMany({
    where: {
      familyId,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}

async function revokeFamilyForToken(refreshToken: string) {
  const familyId = await findFamilyIdForToken(refreshToken);
  if (!familyId) return;

  await revokeRefreshFamily(familyId);
}

async function findFamilyIdForToken(refreshToken: string) {
  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
    select: { familyId: true },
  });

  return storedToken?.familyId ?? null;
}

async function assertNewPassword(
  currentPasswordHash: string,
  newPassword: string,
) {
  const isReused = await bcrypt.compare(newPassword, currentPasswordHash);

  if (isReused) {
    throw new ApiError(
      400,
      "New password must be different from the current password",
      "PASSWORD_REUSE",
    );
  }
}

async function antiEnumerationDelay() {
  await new Promise((resolve) => setTimeout(resolve, 50));
}

function safeUserSelect() {
  return {
    id: true,
    name: true,
    email: true,
    role: true,
    image: true,
    emailVerified: true,
    createdAt: true,
  } as const;
}

function parseDurationMs(value: string, fallbackMs: number): number {
  const match = /^(\d+)([mhd])?$/.exec(value.trim());

  if (!match) return fallbackMs;

  const amount = Number(match[1]);
  const unit = match[2] ?? "ms";

  switch (unit) {
    case "m":
      return amount * 60 * 1000;
    case "h":
      return amount * 60 * 60 * 1000;
    case "d":
      return amount * 24 * 60 * 60 * 1000;
    default:
      return amount;
  }
}
