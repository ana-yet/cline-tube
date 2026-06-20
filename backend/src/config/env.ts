import { z } from "zod";

/**
 * Environment Variable Validation
 *
 * Uses Zod to validate ALL required environment variables at startup.
 * If any variable is missing or invalid, the server crashes immediately
 * with a descriptive error — never silently running with undefined config.
 *
 * Architectural Decision: Fail-fast on missing env vars prevents
 * runtime surprises in production (e.g., undefined JWT_SECRET).
 */
const envSchema = z.object({
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
});

/**
 * Parse and validate environment variables.
 * Throws ZodError with detailed messages if validation fails.
 */
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
