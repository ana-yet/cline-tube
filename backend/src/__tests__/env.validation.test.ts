/**
 * Environment configuration tests.
 *
 * Verifies that the Zod-based env schema rejects invalid inputs.
 * These are pure schema-validation tests — they do not import the
 * config module (which calls process.exit on failure).
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";

// Re-create the env schema shape from config/env.ts for testing.
// This avoids importing the module that calls process.exit(1).
const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().default(5000),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
    JWT_ACCESS_EXPIRY: z.string().default("15m"),
    JWT_REFRESH_SECRET: z.string().min(32),
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1),
    FRONTEND_URL: z.string().url(),
    FRONTEND_ORIGINS: z.string().optional(),
    EMAIL_DELIVERY_MODE: z.enum(["capture", "http", "disabled"]).optional(),
    EMAIL_DELIVERY_ENDPOINT: z.string().url().optional(),
    EMAIL_DELIVERY_TOKEN: z.string().min(16).optional(),
    EMAIL_FROM: z.string().min(3).optional(),
    MEDIA_VIEW_HMAC_SECRET: z.string().min(32).optional(),
    CLOUDINARY_CLOUD_NAME: z.string().min(1),
    CLOUDINARY_API_KEY: z.string().min(1),
    CLOUDINARY_API_SECRET: z.string().min(1),
  })
  .superRefine((value, ctx) => {
    const emailMode =
      value.EMAIL_DELIVERY_MODE ??
      (value.NODE_ENV === "production" ? "disabled" : "capture");

    if (value.NODE_ENV === "production" && emailMode !== "http") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["EMAIL_DELIVERY_MODE"],
        message: "Production password recovery requires HTTP email delivery",
      });
    }

    if (value.NODE_ENV === "production" && !value.MEDIA_VIEW_HMAC_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["MEDIA_VIEW_HMAC_SECRET"],
        message: "Production view deduplication requires MEDIA_VIEW_HMAC_SECRET",
      });
    }

    if (
      emailMode === "http" &&
      (!value.EMAIL_DELIVERY_ENDPOINT || !value.EMAIL_DELIVERY_TOKEN)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["EMAIL_DELIVERY_ENDPOINT"],
        message: "HTTP email delivery requires endpoint and token",
      });
    }
  });

describe("env schema validation", () => {
  const validEnv = {
    NODE_ENV: "development",
    PORT: "5000",
    DATABASE_URL: "postgresql://localhost:5432/test",
    JWT_SECRET: "a-very-long-secret-key-for-testing-at-least-32-chars",
    JWT_ACCESS_EXPIRY: "15m",
    JWT_REFRESH_SECRET: "another-very-long-secret-for-refresh-tokens",
    STRIPE_SECRET_KEY: "sk_test_placeholder",
    STRIPE_WEBHOOK_SECRET: "whsec_placeholder",
    FRONTEND_URL: "http://localhost:3000",
    CLOUDINARY_CLOUD_NAME: "test",
    CLOUDINARY_API_KEY: "123456789",
    CLOUDINARY_API_SECRET: "test_cloudinary_secret",
  };

  it("accepts valid environment", () => {
    const result = envSchema.safeParse(validEnv);
    expect(result.success).toBe(true);
  });

  it("rejects missing DATABASE_URL", () => {
    const { DATABASE_URL: _, ...rest } = validEnv;
    const result = envSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects short JWT_SECRET", () => {
    const result = envSchema.safeParse({ ...validEnv, JWT_SECRET: "short" });
    expect(result.success).toBe(false);
  });

  it("rejects missing STRIPE_SECRET_KEY", () => {
    const { STRIPE_SECRET_KEY: _, ...rest } = validEnv;
    const result = envSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects invalid FRONTEND_URL", () => {
    const result = envSchema.safeParse({
      ...validEnv,
      FRONTEND_URL: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("requires an HTTP mail adapter in production", () => {
    const result = envSchema.safeParse({
      ...validEnv,
      NODE_ENV: "production",
    });

    expect(result.success).toBe(false);
  });

  it("accepts production with HTTP mail delivery configured", () => {
    const result = envSchema.safeParse({
      ...validEnv,
      NODE_ENV: "production",
      EMAIL_DELIVERY_MODE: "http",
      EMAIL_DELIVERY_ENDPOINT: "https://mail.example.com/send",
      EMAIL_DELIVERY_TOKEN: "mail-token-at-least-sixteen-chars",
      EMAIL_FROM: "CineTube <noreply@example.com>",
      MEDIA_VIEW_HMAC_SECRET: "view-dedup-secret-at-least-thirty-two",
    });

    expect(result.success).toBe(true);
  });
});
