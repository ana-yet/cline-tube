import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

describe("Phase 15 final compliance invariants", () => {
  const repoRoot = path.resolve(__dirname, "../../..");

  it("keeps seed data free of placeholder streams and committed admin passwords", () => {
    const seed = readFileSync(path.join(repoRoot, "backend/prisma/seed.ts"), "utf8");

    expect(seed).not.toContain("example.com/stream");
    expect(seed).not.toContain("Admin123!");
    expect(seed).toContain("SEED_ADMIN_PASSWORD");
    expect(seed).toContain("CINETUBE_STREAM_BASE_URL");
    expect(seed).not.toMatch(/Admin:\s*\$\{email\}\s*\/\s*\$\{password\}/);
  });

  it("uses structured logging for Stripe webhook processing", () => {
    const controller = readFileSync(
      path.join(repoRoot, "backend/src/controllers/stripe-webhook.controller.ts"),
      "utf8",
    );

    expect(controller).toContain('import { logger } from "../utils/logger"');
    expect(controller).toContain('logger.info("Stripe webhook received"');
    expect(controller).toContain('logger.error("Stripe webhook processing failed"');
    expect(controller).not.toContain("console.log");
    expect(controller).not.toContain("console.error");
  });
});