import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import { corsOptions } from "./config/cors";
import { apiRouter } from "./routes";
import { errorHandler } from "./middlewares/errorHandler";
import { requestId } from "./middlewares/requestId";
import { apiLimiter } from "./middlewares/rateLimiter";

/**
 * Express Application Setup
 *
 * Middleware pipeline order is intentional:
 * 1. requestId       — Assign unique ID for request tracing
 * 2. helmet          — Security headers (XSS, clickjacking, MIME sniffing)
 * 3. cors            — Cross-origin resource sharing policy
 * 4. compression     — Gzip response bodies for bandwidth reduction
 * 5. morgan          — HTTP request logging (dev: colored, prod: JSON)
 * 6. express.json    — Parse JSON bodies (skip for Stripe webhooks — raw body needed)
 * 7. express.urlencoded — Parse form-encoded bodies
 * 8. cookieParser    — Parse Cookie header into req.cookies
 * 9. apiLimiter      — Global rate limiting (100 req/15min per IP)
 * 10. apiRouter      — Route dispatch
 * 11. errorHandler   — Centralized error handler (MUST be last)
 *
 * Architectural Decisions:
 * - Stripe webhook route needs raw body parsing, handled separately in payment routes
 * - Error handler is registered LAST to catch all upstream errors
 * - Compression is placed early to compress all downstream responses
 */

const app = express();

// ── Security & Request Setup ──────────────────────────────
app.use(requestId);
app.use(helmet());
app.use(cors(corsOptions));
app.use(compression());

// ── Logging ───────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}

// ── Body Parsing ──────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// ── Rate Limiting ─────────────────────────────────────────
app.use("/api", apiLimiter);

// ── Health Check ──────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    data: {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

// ── API Routes ────────────────────────────────────────────
app.use("/api", apiRouter);

// ── 404 Handler ───────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: "Route not found",
      code: "NOT_FOUND",
    },
  });
});

// ── Global Error Handler (MUST be last) ───────────────────
app.use(errorHandler);

export default app;
