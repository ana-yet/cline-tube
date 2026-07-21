import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve(__dirname, "..");
const ROOT = path.resolve(__dirname, "../../..");

function readBackend(relativePath: string): string {
  return fs.readFileSync(path.join(SRC, relativePath), "utf-8");
}

function readRoot(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf-8");
}

function functionBody(src: string, signature: string): string {
  const fnStart = src.indexOf(signature);
  expect(fnStart).toBeGreaterThanOrEqual(0);

  const nextExport = src.indexOf("\nexport ", fnStart + 1);
  return src.slice(fnStart, nextExport === -1 ? undefined : nextExport);
}

describe("Phase 5 domain integrity invariants", () => {
  it("adds review audit, report uniqueness, and durable view dedup schema", () => {
    const schema = readRoot("prisma/schema.prisma");

    expect(schema).toContain("model ReviewModerationAction {");
    expect(schema).toContain("enum ReviewModerationActionType {");
    expect(schema).toContain("@@unique([reviewId, userId])");
    expect(schema).toContain("resolvedById");
    expect(schema).toContain("model MediaViewDedup {");
    expect(schema).toContain("@@unique([mediaId, bucketDate, viewerKey])");
    expect(schema).toContain("expiresAt");
  });

  it("ships an ordered migration with deterministic report dedup before uniqueness", () => {
    const migration = readRoot(
      "prisma/migrations/20260714113000_phase5_domain_integrity_controls/migration.sql",
    );

    expect(migration).toContain("CREATE TYPE \"ReviewModerationActionType\"");
    expect(migration.indexOf("DELETE FROM \"ReviewReport\"")).toBeLessThan(
      migration.indexOf("ReviewReport_reviewId_userId_key"),
    );
    expect(migration).toContain("CREATE TABLE \"MediaViewDedup\"");
  });

  it("review state changes write audit and recalculate ratings in the same transaction", () => {
    const src = readBackend("services/review.service.ts");
    const approve = functionBody(src, "export async function approveReview");
    const reject = functionBody(src, "export async function rejectReview");
    const update = functionBody(src, "export async function updateReview");

    for (const fn of [approve, reject, update]) {
      expect(fn).toContain("prisma.$transaction");
      expect(fn).toContain("createModerationAction");
    }

    expect(approve).toContain("recalculateMediaRating(tx");
    expect(reject).toContain("recalculateMediaRating(tx");
    expect(update).toContain("recalculateMediaRating(tx");
  });

  it("report lifecycle prevents duplicates and records admin resolution audit", () => {
    const src = readBackend("services/review.service.ts");
    const report = functionBody(src, "export async function reportReview");
    const resolve = functionBody(src, "export async function resolveReviewReport");
    const routes = readBackend("routes/review.routes.ts");

    expect(report).toContain("SELF_REPORT_NOT_ALLOWED");
    expect(report).toContain("REPORT_ALREADY_EXISTS");
    expect(report).toContain("REPORT_SUBMITTED");
    expect(resolve).toContain("REPORT_RESOLVED");
    expect(resolve).toContain("REPORT_DISMISSED");
    expect(routes).toContain("/:id/report");
    expect(routes).toContain("/reports/:reportId/resolve");
  });

  it("view counting stores only HMAC daily dedup keys and has no process-local interval", () => {
    const src = readBackend("services/media.service.ts");
    const recordView = functionBody(src, "export async function recordView");

    expect(recordView).toContain("mediaViewDedup.create");
    expect(recordView).toContain("viewCount: { increment: 1 }");
    expect(src).toContain('createHmac("sha256"');
    expect(src).not.toContain("new Map");
    expect(src).not.toContain("setInterval");
  });

  it("cleanup is bounded and excludes finance and moderation audit records", () => {
    const cleanup = readBackend("services/cleanup.service.ts");

    expect(cleanup).toContain("DEFAULT_BATCH_SIZE");
    expect(cleanup).toContain("take: limit");
    expect(cleanup).toContain("passwordResetToken");
    expect(cleanup).toContain("refreshToken");
    expect(cleanup).toContain("checkoutAttempt");
    expect(cleanup).toContain("mediaViewDedup");
    expect(cleanup).not.toContain("transaction.delete");
    expect(cleanup).not.toContain("paymentAdjustment.delete");
    expect(cleanup).not.toContain("reviewModerationAction.delete");
  });
  it("enforces media lifecycle visibility and throttled account activity", () => {
    const media = readBackend("services/media.service.ts");
    const validation = readBackend("validations/media.validation.ts");
    const auth = readBackend("middlewares/auth.ts");

    expect(validation).toContain("publicationStatus");
    expect(media).toContain("const liveMediaWhere");
    expect(media).toContain('publicationStatus: "PUBLISHED"');
    expect(media).toContain("deletedAt: null");
    expect(media).toContain("findFirst");
    expect(media).toContain('publicationStatus: "ARCHIVED"');
    expect(media).toContain("deletedAt: now");
    expect(media).not.toContain("await prisma.media.delete");

    expect(auth).toContain("LAST_ACTIVE_UPDATE_INTERVAL_MS");
    expect(auth).toContain("lastActiveAt: { lt: threshold }");
    expect(auth).toContain("updateMany");
  });

});
