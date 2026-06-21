import jwt from "jsonwebtoken";
import { randomBytes, createHash } from "crypto";
import { env } from "../config/env";
import { JwtPayload } from "../types";

// Access tokens are short-lived JWTs. Refresh tokens are random opaque strings
// that are SHA-256 hashed before storage so a database leak can't be replayed.
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

export const generateRefreshToken = (): string => {
  return randomBytes(64).toString("hex");
};

export const hashToken = (token: string): string => {
  return createHash("sha256").update(token).digest("hex");
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
};
