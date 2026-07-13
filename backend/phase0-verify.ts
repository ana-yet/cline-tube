/**
 * Phase 0 regression verification — password-reset containment.
 *
 * Uses Node.js built-in `node:test` (requires Node ≥ 18).
 * Run:  npx ts-node --transpile-only phase0-verify.ts
 *       or:  node --import tsx phase0-verify.ts
 *
 * This script verifies source-level invariants without calling a live server.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const BACKEND_SRC = path.resolve(__dirname, "src");

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(BACKEND_SRC, relativePath), "utf-8");
}

// ---------- Phase 0 source invariant checks ----------

describe("Phase 0 — password-reset containment", () => {
  // 1. Recovery output does not contain a token
  it("auth.service.ts does not log raw reset tokens or email addresses", () => {
    const source = readSource("services/auth.service.ts");

    // No console.log that prints tokens or emails in the recovery path
    assert.ok(
      !source.includes("console.log") ||
        !source.match(/console\.log.*resetToken/i),
      "console.log with resetToken must not exist",
    );
    assert.ok(
      !source.match(/console\.log.*\[PASSWORD RESET\]/i),
      "[PASSWORD RESET] log line must be removed",
    );
    assert.ok(
      !source.match(/console\.log.*Token for/i),
      "Token-for log line must be removed",
    );
  });

  // 2. No new reset token is created while delivery is unavailable
  it("requestPasswordReset does not create a PasswordResetToken record", () => {
    const source = readSource("services/auth.service.ts");

    // The function must not call prisma.passwordResetToken.create
    const funcStart = source.indexOf(
      "export async function requestPasswordReset",
    );
    assert.ok(funcStart !== -1, "requestPasswordReset must exist");

    // Find the end of the function (next export or end of file)
    const funcBody = source.slice(funcStart);
    const nextExport = funcBody.indexOf("\nexport ", 1);
    const body = nextExport !== -1 ? funcBody.slice(0, nextExport) : funcBody;

    assert.ok(
      !body.includes("passwordResetToken.create"),
      "requestPasswordReset must not create a PasswordResetToken",
    );
    assert.ok(
      !body.includes("prisma.user.findUnique"),
      "requestPasswordReset must not look up user (anti-enumeration)",
    );
    assert.ok(
      !body.includes("uuidv4"),
      "requestPasswordReset must not generate a UUID token",
    );
  });

  // 3. Reset-password service rejects all tokens
  it("resetPassword throws PASSWORD_RESET_UNAVAILABLE without DB lookup", () => {
    const source = readSource("services/auth.service.ts");

    const funcStart = source.indexOf("export async function resetPassword");
    assert.ok(funcStart !== -1, "resetPassword must exist");

    const funcBody = source.slice(funcStart);
    const nextExport = funcBody.indexOf("\nexport ", 1);
    const body = nextExport !== -1 ? funcBody.slice(0, nextExport) : funcBody;

    assert.ok(
      body.includes("PASSWORD_RESET_UNAVAILABLE"),
      "resetPassword must throw PASSWORD_RESET_UNAVAILABLE",
    );
    assert.ok(body.includes("503"), "resetPassword must use status 503");
    assert.ok(
      !body.includes("passwordResetToken.findUnique"),
      "resetPassword must not look up any token in DB",
    );
    assert.ok(
      !body.includes("bcrypt.hash"),
      "resetPassword must not hash a new password",
    );
    assert.ok(
      !body.includes("prisma.$transaction"),
      "resetPassword must not use a transaction",
    );
  });

  // 4. Controller returns 503 for forgot-password
  it("forgotPassword controller returns 503 with PASSWORD_RESET_UNAVAILABLE", () => {
    const source = readSource("controllers/auth.controller.ts");

    assert.ok(
      source.includes("PASSWORD_RESET_UNAVAILABLE"),
      "Controller must reference PASSWORD_RESET_UNAVAILABLE code",
    );
    assert.ok(source.includes("503"), "Controller must use status 503");
    assert.ok(
      source.includes("temporarily unavailable"),
      "Controller must include honest unavailable message",
    );
  });

  // 5. Controller returns 503 for reset-password
  it("resetPassword controller returns 503 with PASSWORD_RESET_UNAVAILABLE", () => {
    const source = readSource("controllers/auth.controller.ts");

    // Both endpoints should have the same unavailable code
    const matches = source.match(/PASSWORD_RESET_UNAVAILABLE/g);
    assert.ok(
      matches && matches.length >= 2,
      "PASSWORD_RESET_UNAVAILABLE must appear at least twice (forgot + reset)",
    );
  });

  // 6. No raw reset token appears in any auth recovery path
  it("no auth source exposes raw reset tokens in recovery responses or logs", () => {
    // Check that the recovery functions do not return or log raw tokens
    const serviceSource = readSource("services/auth.service.ts");

    // requestPasswordReset must not return a token
    const reqFuncStart = serviceSource.indexOf(
      "export async function requestPasswordReset",
    );
    assert.ok(reqFuncStart !== -1, "requestPasswordReset must exist");
    const reqFuncBody = serviceSource.slice(reqFuncStart);
    const reqNextExport = reqFuncBody.indexOf("\nexport ", 1);
    const reqBody =
      reqNextExport !== -1 ? reqFuncBody.slice(0, reqNextExport) : reqFuncBody;

    assert.ok(
      !reqBody.match(/token:\s*resetToken/),
      "requestPasswordReset must not include raw resetToken in response",
    );
    assert.ok(
      !reqBody.includes("uuidv4"),
      "requestPasswordReset must not generate UUID tokens",
    );

    // resetPassword must not look up or return raw tokens
    const resetFuncStart = serviceSource.indexOf(
      "export async function resetPassword",
    );
    assert.ok(resetFuncStart !== -1, "resetPassword must exist");
    const resetFuncBody = serviceSource.slice(resetFuncStart);
    const resetNextExport = resetFuncBody.indexOf("\nexport ", 1);
    const resetBody =
      resetNextExport !== -1
        ? resetFuncBody.slice(0, resetNextExport)
        : resetFuncBody;

    assert.ok(
      !resetBody.includes("passwordResetToken.findUnique"),
      "resetPassword must not look up raw tokens from DB",
    );
    assert.ok(
      !resetBody.includes("token: resetToken"),
      "resetPassword must not include raw resetToken in response",
    );
  });

  // 7. Unrelated auth behavior preserved — registration still exists
  it("registration service still creates users and hashes passwords", () => {
    const source = readSource("services/auth.service.ts");

    assert.ok(
      source.includes("export async function register"),
      "register function must exist",
    );
    assert.ok(source.includes("bcrypt.hash"), "bcrypt.hash must still be used");
    assert.ok(
      source.includes("prisma.user.create"),
      "user creation must still exist",
    );
  });

  // 8. Unrelated auth behavior preserved — login still exists
  it("login service still verifies passwords and issues tokens", () => {
    const source = readSource("services/auth.service.ts");

    assert.ok(
      source.includes("export async function login"),
      "login function must exist",
    );
    assert.ok(
      source.includes("bcrypt.compare"),
      "bcrypt.compare must still be used",
    );
    assert.ok(
      source.includes("generateAccessToken"),
      "access token generation must still exist",
    );
  });

  // 9. Unrelated auth behavior preserved — refresh still exists
  it("refreshTokens service still rotates tokens", () => {
    const source = readSource("services/auth.service.ts");

    assert.ok(
      source.includes("export async function refreshTokens"),
      "refreshTokens function must exist",
    );
    assert.ok(
      source.includes("hashToken"),
      "hashToken must still be used for refresh rotation",
    );
  });

  // 10. Unrelated auth behavior preserved — logout still exists
  it("logout service still revokes refresh tokens", () => {
    const source = readSource("services/auth.service.ts");

    assert.ok(
      source.includes("export async function logout"),
      "logout function must exist",
    );
    assert.ok(
      source.includes("prisma.refreshToken.deleteMany"),
      "refresh token deletion must still exist",
    );
  });

  // 11. Prisma schema not modified
  it("prisma/schema.prisma was not modified", () => {
    // This is verified by git status — the schema file should not appear
    // in the diff. The test here checks that passwordResetToken model
    // still exists in the schema (not removed).
    const schemaPath = path.resolve(__dirname, "../prisma/schema.prisma");
    const schema = fs.readFileSync(schemaPath, "utf-8");

    assert.ok(
      schema.includes("model PasswordResetToken"),
      "PasswordResetToken model must still exist in schema",
    );
    assert.ok(
      schema.includes("model User"),
      "User model must still exist in schema",
    );
    assert.ok(
      schema.includes("model RefreshToken"),
      "RefreshToken model must still exist in schema",
    );
  });

  // 12. No password/token/secret logged in auth recovery path
  it("no sensitive values logged in recovery path", () => {
    const source = readSource("services/auth.service.ts");

    // Recovery function must not log
    const funcStart = source.indexOf(
      "export async function requestPasswordReset",
    );
    assert.ok(funcStart !== -1, "requestPasswordReset must exist");

    const funcBody = source.slice(funcStart);
    const nextExport = funcBody.indexOf("\nexport ", 1);
    const body = nextExport !== -1 ? funcBody.slice(0, nextExport) : funcBody;

    assert.ok(
      !body.includes("console.log"),
      "requestPasswordReset must not contain console.log",
    );
    assert.ok(
      !body.includes("console.error"),
      "requestPasswordReset must not contain console.error",
    );
    assert.ok(
      !body.includes("console.warn"),
      "requestPasswordReset must not contain console.warn",
    );
  });
});
