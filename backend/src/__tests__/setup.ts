/**
 * Vitest global setup — sets required environment variables before any
 * module that reads `env.ts` is imported. This prevents process.exit(1)
 * from the env validation during test runs.
 */

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://test:test@localhost:5432/cinetube_test";
process.env.JWT_SECRET =
  process.env.JWT_SECRET ||
  "test-secret-key-for-vitest-at-least-32-chars-long!!";
process.env.JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || "15m";
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ||
  "test-refresh-secret-for-vitest-min-32-chars";
process.env.STRIPE_SECRET_KEY =
  process.env.STRIPE_SECRET_KEY || "sk_test_placeholder";
process.env.STRIPE_WEBHOOK_SECRET =
  process.env.STRIPE_WEBHOOK_SECRET || "whsec_test_placeholder";
process.env.FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:3000";
process.env.CLOUDINARY_CLOUD_NAME =
  process.env.CLOUDINARY_CLOUD_NAME || "test";
process.env.CLOUDINARY_API_KEY =
  process.env.CLOUDINARY_API_KEY || "123456789";
process.env.CLOUDINARY_API_SECRET =
  process.env.CLOUDINARY_API_SECRET || "test_cloudinary_secret";
