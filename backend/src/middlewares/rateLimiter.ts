import rateLimit from "express-rate-limit";
import { env } from "../config/env";

const isDev = env.NODE_ENV === "development";

// Global limiter is skipped in development; authLimiter guards login/register.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 10_000 : 500,
  skip: () => isDev,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      requestId: req.requestId,
      error: {
        message: "Too many requests. Please try again later.",
        code: "RATE_LIMIT_EXCEEDED",
      },
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 10,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      requestId: req.requestId,
      error: {
        message: "Too many authentication attempts. Please try again later.",
        code: "AUTH_RATE_LIMIT_EXCEEDED",
      },
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});
