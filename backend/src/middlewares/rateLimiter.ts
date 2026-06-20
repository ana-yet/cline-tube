import rateLimit from "express-rate-limit";

/**
 * Rate Limiting Configuration
 *
 * Architectural Decision: Two-tier rate limiting strategy:
 *
 * 1. apiLimiter (Global) — 100 requests per 15 minutes per IP
 *    Applied to all /api routes. Prevents general abuse and DDoS.
 *
 * 2. authLimiter (Auth-specific) — 5 requests per 15 minutes per IP
 *    Applied to login/register endpoints. Prevents brute-force attacks.
 *
 * Rate limit headers (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset)
 * are sent automatically for client-side awareness.
 */

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
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
