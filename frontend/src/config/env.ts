import { z } from "zod";

// Validate the public client env vars at build time and fall back to a sane
// default so a misconfigured deploy surfaces in logs rather than the browser.
const clientEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:5000/api"),
});

const parsed = clientEnvSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});

if (!parsed.success) {
  console.error("Invalid client environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
}

export const clientEnv = parsed.success
  ? parsed.data
  : { NEXT_PUBLIC_API_URL: "http://localhost:5000/api" };
