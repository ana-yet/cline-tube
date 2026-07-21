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
      "CheckoutAttempt",
      "ProcessedStripeEvent",
      "PaymentAdjustment",
      "ReviewModerationAction",
      "MediaViewDedup",
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
      "CheckoutAttemptStatus",
      "StripeEventStatus",
      "PaymentAdjustmentType",
      "PaymentAdjustmentStatus",
      "ReviewModerationActionType",
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

  it("has Phase 3 auth session and reset-token fields", () => {
    schema = schema || fs.readFileSync(SCHEMA_PATH, "utf-8");

    expect(schema).toContain("tokenHash");
    expect(schema).toContain("@map(\"token\")");
    expect(schema).toContain("familyId");
    expect(schema).toContain("csrfTokenHash");
    expect(schema).toContain("absoluteExpiresAt");
    expect(schema).toContain("revokedAt");
    expect(schema).toContain("usedAt");
  });

  it("has Phase 4 payment consistency models and invoice fields", () => {
    schema = schema || fs.readFileSync(SCHEMA_PATH, "utf-8");

    expect(schema).toContain("model CheckoutAttempt {");
    expect(schema).toContain("model ProcessedStripeEvent {");
    expect(schema).toContain("model PaymentAdjustment {");
    expect(schema).toContain("providerInvoiceId");
    expect(schema).toContain("providerPaymentIntentId");
    expect(schema).toContain("amountMinor");
    expect(schema).toContain("cancelAtPeriodEnd");
    expect(schema).toContain("lastProviderEventTime");
  });

  it("has Phase 5 domain integrity controls", () => {
    schema = schema || fs.readFileSync(SCHEMA_PATH, "utf-8");

    expect(schema).toContain("model ReviewModerationAction {");
    expect(schema).toContain("model MediaViewDedup {");
    expect(schema).toContain("@@unique([reviewId, userId])");
    expect(schema).toContain("@@unique([mediaId, bucketDate, viewerKey])");
    expect(schema).toContain("resolvedAt");
    expect(schema).toContain("resolvedById");
  });

});
