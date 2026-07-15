import { z } from "zod";

// Validate environment variables at startup so the server fails fast with a
// clear message instead of running with undefined config.
const envSchema = z
  .object({
  DATABASE_URL: z.string().url({
    message: "DATABASE_URL must be a valid PostgreSQL connection string",
  }),
  JWT_SECRET: z
    .string()
    .min(32, { message: "JWT_SECRET must be at least 32 characters" }),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, { message: "JWT_REFRESH_SECRET must be at least 32 characters" }),
  JWT_ACCESS_EXPIRY: z.string().default("15m"),
  JWT_REFRESH_EXPIRY: z.string().default("7d"),
  STRIPE_SECRET_KEY: z
    .string()
    .min(1, { message: "STRIPE_SECRET_KEY is required" }),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .min(1, { message: "STRIPE_WEBHOOK_SECRET is required" }),
  FRONTEND_URL: z.string().url({ message: "FRONTEND_URL must be a valid URL" }),
  FRONTEND_ORIGINS: z.string().optional(),
  EMAIL_DELIVERY_MODE: z.enum(["capture", "http", "disabled"]).optional(),
  EMAIL_DELIVERY_ENDPOINT: z.string().url().optional(),
  EMAIL_DELIVERY_TOKEN: z.string().min(16).optional(),
  EMAIL_FROM: z.string().min(3).optional(),
  MEDIA_VIEW_HMAC_SECRET: z.string().min(32).optional(),
  PORT: z.coerce.number().int().positive().default(5000),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  CLOUDINARY_CLOUD_NAME: z
    .string()
    .min(1, { message: "CLOUDINARY_CLOUD_NAME is required" }),
  CLOUDINARY_API_KEY: z
    .string()
    .min(1, { message: "CLOUDINARY_API_KEY is required" }),
  CLOUDINARY_API_SECRET: z
    .string()
    .min(1, { message: "CLOUDINARY_API_SECRET is required" }),
  })
  .superRefine((value, ctx) => {
    const emailMode =
      value.EMAIL_DELIVERY_MODE ??
      (value.NODE_ENV === "production" ? "disabled" : "capture");

    if (value.NODE_ENV === "production" && emailMode !== "http") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["EMAIL_DELIVERY_MODE"],
        message: "Production password recovery requires EMAIL_DELIVERY_MODE=http",
      });
    }

    if (value.NODE_ENV === "production" && !value.MEDIA_VIEW_HMAC_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["MEDIA_VIEW_HMAC_SECRET"],
        message: "Production view deduplication requires MEDIA_VIEW_HMAC_SECRET",
      });
    }

    if (emailMode === "http") {
      if (!value.EMAIL_DELIVERY_ENDPOINT) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["EMAIL_DELIVERY_ENDPOINT"],
          message: "EMAIL_DELIVERY_ENDPOINT is required for HTTP email delivery",
        });
      }

      if (!value.EMAIL_DELIVERY_TOKEN) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["EMAIL_DELIVERY_TOKEN"],
          message: "EMAIL_DELIVERY_TOKEN is required for HTTP email delivery",
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  FRONTEND_ORIGINS: parsed.data.FRONTEND_ORIGINS ?? "",
  EMAIL_DELIVERY_MODE:
    parsed.data.EMAIL_DELIVERY_MODE ??
    (parsed.data.NODE_ENV === "production" ? "disabled" : "capture"),
  EMAIL_FROM: parsed.data.EMAIL_FROM ?? "CineTube <no-reply@cinetube.local>",
};

export type Env = typeof env;
