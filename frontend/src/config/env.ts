import { z } from "zod";

const isProductionDeploy =
  process.env.VERCEL_ENV === "production" ||
  process.env.CINETUBE_ENFORCE_PRODUCTION_ENV === "true";

const clientEnvSchema = z
  .object({
    NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:5000/api"),
    NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  })
  .superRefine((value, ctx) => {
    if (!isProductionDeploy) return;

    const apiUrl = new URL(value.NEXT_PUBLIC_API_URL);
    if (apiUrl.protocol !== "https:") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["NEXT_PUBLIC_API_URL"],
        message: "Production NEXT_PUBLIC_API_URL must use HTTPS",
      });
    }

    if (["localhost", "127.0.0.1", "::1"].includes(apiUrl.hostname)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["NEXT_PUBLIC_API_URL"],
        message: "Production NEXT_PUBLIC_API_URL cannot point to localhost",
      });
    }

    if (!apiUrl.pathname.endsWith("/api")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["NEXT_PUBLIC_API_URL"],
        message:
          "Production NEXT_PUBLIC_API_URL must include the Render /api base path",
      });
    }

    if (value.NEXT_PUBLIC_SITE_URL) {
      const siteUrl = new URL(value.NEXT_PUBLIC_SITE_URL);
      if (siteUrl.protocol !== "https:") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["NEXT_PUBLIC_SITE_URL"],
          message: "Production NEXT_PUBLIC_SITE_URL must use HTTPS",
        });
      }
    }
  });

const parsed = clientEnvSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

if (!parsed.success) {
  console.error("Invalid client environment variables:");
  console.error(parsed.error.flatten().fieldErrors);

  if (isProductionDeploy) {
    throw new Error("Invalid production client environment variables");
  }
}

export const clientEnv = parsed.success
  ? parsed.data
  : { NEXT_PUBLIC_API_URL: "http://localhost:5000/api" };
