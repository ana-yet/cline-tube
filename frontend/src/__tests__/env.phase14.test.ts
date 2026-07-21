import { afterEach, describe, expect, it, vi } from "vitest";

async function importClientEnv() {
  vi.resetModules();
  return import("@/config/env");
}

describe("Phase 14 frontend deployment env guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("allows local development fallback outside production deploys", async () => {
    vi.stubEnv("VERCEL_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");

    const { clientEnv } = await importClientEnv();
    expect(clientEnv.NEXT_PUBLIC_API_URL).toBe("http://localhost:5000/api");
  });

  it("rejects localhost API URLs in production deploys", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:5000/api");

    await expect(importClientEnv()).rejects.toThrow(
      "Invalid production client environment variables",
    );
  });

  it("rejects production API URLs without the /api base path", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://cline-tube.onrender.com");

    await expect(importClientEnv()).rejects.toThrow(
      "Invalid production client environment variables",
    );
  });

  it("accepts HTTPS Render API base in production deploys", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://cline-tube.onrender.com/api");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://cline-tube.vercel.app");

    const { clientEnv } = await importClientEnv();
    expect(clientEnv.NEXT_PUBLIC_API_URL).toBe(
      "https://cline-tube.onrender.com/api",
    );
  });
});
