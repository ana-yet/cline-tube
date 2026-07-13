import bcrypt from "bcrypt";
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
// (hashed in the DB and revoked on use), and password reset containment.

const BCRYPT_SALT_ROUNDS = 12;
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

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
//
// Phase 0 containment: recovery delivery is not available, so we must not
// create tokens that can never be delivered. Returning before any user lookup
// provides the strongest anti-enumeration behaviour — known and unknown
// addresses follow identical timing and response paths.

export async function requestPasswordReset(_email: string) {
  // Do not look up the user — prevents timing-based enumeration.
  // Do not create a reset token — there is no delivery channel.
  // Do not log anything — prevents secret or identifier disclosure.
  return;
}

// Reset Password
//
// Phase 0 containment: password recovery is not available. All reset
// attempts — including legacy plaintext tokens — are rejected with the same
// unavailable response. This prevents redemption of tokens that were
// generated under the old plaintext-and-logged scheme.

export async function resetPassword(_token: string, _newPassword: string) {
  // Do not look up any token record — legacy plaintext tokens are no longer
  // redeemable. The same response is returned regardless of token validity.
  throw new ApiError(
    503,
    "Password recovery is temporarily unavailable. Please try again later.",
    "PASSWORD_RESET_UNAVAILABLE",
  );
}
