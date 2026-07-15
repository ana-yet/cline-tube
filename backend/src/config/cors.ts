import cors from "cors";
import { env } from "./env";

export const allowedOrigins = [
  env.FRONTEND_URL,
  ...env.FRONTEND_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
];

// Restrict to the configured frontend origin and allow credentials so the
// refresh-token cookie can be exchanged cross-origin.
export const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Origin is not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Request-ID",
    "X-CSRF-Token",
  ],
  exposedHeaders: ["X-Request-ID"],
  maxAge: 86400,
};
