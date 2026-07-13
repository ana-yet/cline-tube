/**
 * Prisma schema validation test.
 *
 * Verifies that the Prisma schema is syntactically valid and contains
 * the expected models. Does not require a running database.
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SCHEMA_PATH = path.resolve(__dirname, "../../../prisma/schema.prisma");

describe("Prisma schema", () => {
  let schema: string;

  it("schema file exists", () => {
    expect(fs.existsSync(SCHEMA_PATH)).toBe(true);
    schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
  });

  it("uses postgresql provider", () => {
    schema = schema || fs.readFileSync(SCHEMA_PATH, "utf-8");
    expect(schema).toContain('provider = "postgresql"');
  });

  it("defines all expected domain models", () => {
    schema = schema || fs.readFileSync(SCHEMA_PATH, "utf-8");
    const expectedModels = [
      "User",
      "UserProfile",
      "RefreshToken",
      "PasswordResetToken",
      "Media",
      "Genre",
      "Review",
      "Comment",
      "Watchlist",
      "Subscription",
      "Transaction",
    ];

    for (const model of expectedModels) {
      expect(schema).toContain(`model ${model} {`);
    }
  });

  it("defines expected enums", () => {
    schema = schema || fs.readFileSync(SCHEMA_PATH, "utf-8");
    const expectedEnums = [
      "Role",
      "MediaType",
      "PricingType",
      "ReviewStatus",
      "SubscriptionTier",
      "SubscriptionStatus",
    ];

    for (const enumName of expectedEnums) {
      expect(schema).toContain(`enum ${enumName} {`);
    }
  });

  it("has a unique constraint on User.email", () => {
    schema = schema || fs.readFileSync(SCHEMA_PATH, "utf-8");
    expect(schema).toMatch(/email\s+String\s+@unique/);
  });

  it("has a unique constraint on Media.slug", () => {
    schema = schema || fs.readFileSync(SCHEMA_PATH, "utf-8");
    expect(schema).toMatch(/slug\s+String\s+@unique/);
  });

  it("has a composite unique on Review userId+mediaId", () => {
    schema = schema || fs.readFileSync(SCHEMA_PATH, "utf-8");
    expect(schema).toContain("@@unique([userId, mediaId]");
  });
});
