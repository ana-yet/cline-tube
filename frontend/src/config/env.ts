import { z } from "zod";

/**
 * Frontend Environment Variable Validation
 *
 * Validates client-side env vars at build time.
 * Only NEXT_PUBLIC_* vars are available in the browser.
 *
 * Architectural Decision: Fail-fast on missing env vars during build,
 * not at runtime in the user's browser.
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:5000/api"),
});

const parsed = clientEnvSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});

if (!parsed.success) {
  console.error("❌ Invalid client environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
}

export const clientEnv = parsed.success
  ? parsed.data
  : { NEXT_PUBLIC_API_URL: "http://localhost:5000/api" };
