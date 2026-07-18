import { env } from "../config/env";

/**
 * Structured JSON Logger
 *
 * Replaces console.log/error with structured JSON output.
 * In production, logs are JSON for log aggregation tools (Datadog, ELK, etc.)
 * In development, logs are human-readable with colors.
 *
 * Security: Sensitive fields are redacted automatically.
 */

const SENSITIVE_FIELDS = [
  "password",
  "passwordHash",
  "token",
  "tokenHash",
  "accessToken",
  "refreshToken",
  "secret",
  "authorization",
  "cookie",
  "stripeSecretKey",
  "stripe_webhook_secret",
  "api_key",
  "api_secret",
];

function redact(obj: unknown): unknown {
  if (typeof obj !== "object" || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(redact);

  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_FIELDS.some((f) => key.toLowerCase().includes(f))) {
      redacted[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      redacted[key] = redact(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

function formatMessage(
  level: string,
  message: string,
  meta?: Record<string, unknown>,
) {
  const isProduction = env.NODE_ENV === "production";

  if (isProduction) {
    return JSON.stringify({
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(meta ? { meta: redact(meta) } : {}),
    });
  }

  // Development: human-readable
  const metaStr = meta ? ` ${JSON.stringify(redact(meta), null, 0)}` : "";
  const prefix = level === "error" ? "❌" : level === "warn" ? "⚠️" : "ℹ️";
  return `${prefix} [${level.toUpperCase()}] ${message}${metaStr}`;
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>) {
    console.log(formatMessage("info", message, meta));
  },

  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(formatMessage("warn", message, meta));
  },

  error(message: string, meta?: Record<string, unknown>) {
    console.error(formatMessage("error", message, meta));
  },
};
