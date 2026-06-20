import cors from "cors";
import { env } from "./env";

/**
 * CORS Configuration
 *
 * Architectural Decision: Restrict origins to the configured frontend URL.
 * In production, this prevents cross-origin attacks from arbitrary domains.
 * Credentials (cookies) are enabled for refresh token cookie exchange.
 */
export const corsOptions: cors.CorsOptions = {
  origin: env.FRONTEND_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
  exposedHeaders: ["X-Request-ID"],
  maxAge: 86400, // 24 hours — how long browsers cache preflight responses
};
