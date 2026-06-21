import cors from "cors";
import { env } from "./env";

// Restrict to the configured frontend origin and allow credentials so the
// refresh-token cookie can be exchanged cross-origin.
export const corsOptions: cors.CorsOptions = {
  origin: env.FRONTEND_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
  exposedHeaders: ["X-Request-ID"],
  maxAge: 86400,
};
