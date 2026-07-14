import { randomBytes, timingSafeEqual } from "crypto";
import { Request, Response, NextFunction } from "express";
import { allowedOrigins } from "../config/cors";
import { env } from "../config/env";
import { ApiError } from "../utils/errors";

export const CSRF_COOKIE_NAME = "ct_csrf";
export const CSRF_HEADER_NAME = "x-csrf-token";

export const csrfCookieOptions = {
  httpOnly: false,
  secure: env.NODE_ENV === "production",
  sameSite: (env.NODE_ENV === "production" ? "none" : "strict") as
    | "strict"
    | "none",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

export const clearCsrfCookieOptions = {
  httpOnly: csrfCookieOptions.httpOnly,
  secure: csrfCookieOptions.secure,
  sameSite: csrfCookieOptions.sameSite,
  path: csrfCookieOptions.path,
};

export function generateCsrfToken(): string {
  return randomBytes(32).toString("hex");
}

export function requireTrustedOrigin(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const origin = req.get("origin");

  if (!origin || !allowedOrigins.includes(origin)) {
    next(new ApiError(403, "Untrusted request origin", "UNTRUSTED_ORIGIN"));
    return;
  }

  next();
}

export function requireCsrf(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.get(CSRF_HEADER_NAME);

  if (
    typeof cookieToken !== "string" ||
    typeof headerToken !== "string" ||
    !tokensMatch(cookieToken, headerToken)
  ) {
    next(new ApiError(403, "CSRF token mismatch", "CSRF_TOKEN_MISMATCH"));
    return;
  }

  next();
}

function tokensMatch(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  return left.length === right.length && timingSafeEqual(left, right);
}
