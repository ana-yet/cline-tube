import rateLimit from "express-rate-limit";
import { env } from "../config/env";

const isDev = env.NODE_ENV === "development";

/**
 * Rate Limiting Configuration
 *
 * 1. apiLimiter (Global) — skipped in development; 500 req / 15 min in production
 * 2. authLimiter — login/register only; relaxed in development for local testing
 */

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 10_000 : 500,
  skip: () => isDev,
  message: {
    success: false,
    error: {
      message: "Too many requests. Please try again later.",
      code: "RATE_LIMIT_EXCEEDED",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 10,
  message: {
    success: false,
    error: {
      message: "Too many authentication attempts. Please try again later.",
      code: "AUTH_RATE_LIMIT_EXCEEDED",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
