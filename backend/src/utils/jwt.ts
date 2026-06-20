import jwt from "jsonwebtoken";
import { randomBytes, createHash } from "crypto";
import { env } from "../config/env";
import { JwtPayload } from "../types";

/**
 * JWT & Token Utility Functions
 *
 * Handles access token generation/verification and refresh token generation.
 *
 * Security Design:
 * - Access tokens are short-lived JWTs (15 min) signed with JWT_SECRET
 * - Refresh tokens are opaque 64-byte random hex strings (not UUIDs)
 * - Refresh tokens are SHA-256 hashed before database storage
 *   so a DB leak doesn't expose usable tokens
 * - The `sub` claim contains the user ID for token-to-user mapping
 */

export const generateAccessToken = (
  userId: string,
  email: string,
  role: string,
): string => {
  const payload: Omit<JwtPayload, "iat" | "exp"> = {
    sub: userId,
    email,
    role,
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY as unknown as number,
  });
};

/**
 * Generate a cryptographically secure random refresh token.
 * Returns 64 bytes of randomness as a hex string (128 chars).
 */
export const generateRefreshToken = (): string => {
  return randomBytes(64).toString("hex");
};

/**
 * Hash a refresh token using SHA-256 for secure database storage.
 * The raw token is sent to the client; only the hash is stored in DB.
 */
export const hashToken = (token: string): string => {
  return createHash("sha256").update(token).digest("hex");
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
};
