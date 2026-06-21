import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import prisma from "../config/prisma";
import { env } from "../config/env";
import { ApiError } from "../utils/errors";
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
} from "../utils/jwt";
import type { RegisterInput, LoginInput } from "../validations/auth.validation";

// Authentication logic: bcrypt password hashing, rotating refresh tokens
// (hashed in the DB and revoked on use), and single-use password reset tokens.

const BCRYPT_SALT_ROUNDS = 12;
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

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

// Helper: Build safe user object

function sanitizeUser(user: {
  id: string;
  name: string | null;
  email: string;
  role: string;
  image: string | null;
  emailVerified: Date | null;
  createdAt: Date;
}) {
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

// Register

export async function register(input: RegisterInput) {
  const { name, email, password } = input;

  // Check if email already exists
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

  // Hash password
  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  // Create user + profile in a transaction
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
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      emailVerified: true,
      createdAt: true,
    },
  });

  // Generate token pair
  const accessToken = generateAccessToken(user.id, user.email, user.role);
  const refreshToken = generateRefreshToken();

  // Store HASHED refresh token in database (plain token goes to client cookie)
  await prisma.refreshToken.create({
    data: {
      token: hashToken(refreshToken),
      userId: user.id,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
    },
  });

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
}

// Login

export async function login(input: LoginInput) {
  const { email, password } = input;

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
      role: true,
      image: true,
      emailVerified: true,
      isDeleted: true,
      createdAt: true,
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

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  // Generate token pair
  const accessToken = generateAccessToken(user.id, user.email, user.role);
  const refreshToken = generateRefreshToken();

  // Store HASHED refresh token in database (plain token goes to client cookie)
  await prisma.refreshToken.create({
    data: {
      token: hashToken(refreshToken),
      userId: user.id,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
    },
  });

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
}

// Logout

export async function logout(refreshToken: string | undefined) {
  if (refreshToken) {
    // Delete the specific refresh token (search by hash)
    await prisma.refreshToken.deleteMany({
      where: { token: hashToken(refreshToken) },
    });
  }
}

// Refresh Token Rotation

export async function refreshTokens(oldRefreshToken: string) {
  // Hash the incoming token to look up in DB (only hashes are stored)
  const tokenHash = hashToken(oldRefreshToken);

  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: tokenHash },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
          emailVerified: true,
          isDeleted: true,
          createdAt: true,
        },
      },
    },
  });

  if (!storedToken) {
    throw new ApiError(401, "Invalid refresh token", "INVALID_REFRESH_TOKEN");
  }

  // Check if token has expired
  if (storedToken.expiresAt < new Date()) {
    // Clean up expired token
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });
    throw new ApiError(401, "Refresh token expired", "REFRESH_TOKEN_EXPIRED");
  }

  // Check if user still exists and is not deleted
  if (!storedToken.user || storedToken.user.isDeleted) {
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });
    throw new ApiError(
      401,
      "User not found or account deactivated",
      "UNAUTHORIZED",
    );
  }

  const user = storedToken.user;

  // Token Rotation: revoke old, issue new
  await prisma.refreshToken.delete({ where: { id: storedToken.id } });

  const accessToken = generateAccessToken(user.id, user.email, user.role);
  const newRefreshToken = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      token: hashToken(newRefreshToken),
      userId: user.id,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
    },
  });

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken: newRefreshToken,
  };
}

// Get Current User

export async function getCurrentUser(userId: string) {
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

// Request Password Reset

export async function requestPasswordReset(email: string) {
  // Always return success to prevent email enumeration
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, isDeleted: true },
  });

  if (!user || user.isDeleted) {
    // Return silently — don't reveal whether email exists
    return;
  }

  // Invalidate any existing reset tokens for this user
  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id },
  });

  // Generate a new reset token
  const resetToken = uuidv4();

  await prisma.passwordResetToken.create({
    data: {
      token: resetToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS),
    },
  });

  // In production, send email with reset link:
  // `${env.FRONTEND_URL}/reset-password?token=${resetToken}`
  console.log(`[PASSWORD RESET] Token for ${email}: ${resetToken}`);

  return;
}

// Reset Password

export async function resetPassword(token: string, newPassword: string) {
  // Find the reset token
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: {
      user: {
        select: { id: true, isDeleted: true },
      },
    },
  });

  if (!resetToken) {
    throw new ApiError(
      400,
      "Invalid or expired reset token",
      "INVALID_RESET_TOKEN",
    );
  }

  if (resetToken.used) {
    throw new ApiError(
      400,
      "This reset token has already been used",
      "RESET_TOKEN_USED",
    );
  }

  if (resetToken.expiresAt < new Date()) {
    throw new ApiError(400, "Reset token has expired", "RESET_TOKEN_EXPIRED");
  }

  if (!resetToken.user || resetToken.user.isDeleted) {
    throw new ApiError(404, "User not found", "USER_NOT_FOUND");
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

  // Update password and mark token as used in a transaction
  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    }),
    // Invalidate all refresh tokens for this user (force re-login)
    prisma.refreshToken.deleteMany({
      where: { userId: resetToken.userId },
    }),
  ]);

  return;
}
