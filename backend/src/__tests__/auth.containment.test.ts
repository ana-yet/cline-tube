/**
 * Auth service containment tests (Phase 0 invariants).
 *
 * These source-level tests verify that the password-reset containment
 * changes from Phase 0 are still in place. They read source files and
 * check for the absence of unsafe patterns.
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve(__dirname, "..");

function read(relativePath: string): string {
  return fs.readFileSync(path.join(SRC, relativePath), "utf-8");
}

describe("Phase 0 — password-reset containment invariants", () => {
  it("requestPasswordReset does not create tokens or log secrets", () => {
    const src = read("services/auth.service.ts");
    const fnStart = src.indexOf("export async function requestPasswordReset");
    expect(fnStart).toBeGreaterThanOrEqual(0);

    const fnBody = src.slice(fnStart, src.indexOf("\nexport ", fnStart + 1));

    // Must not create tokens
    expect(fnBody).not.toContain("passwordResetToken.create");
    expect(fnBody).not.toContain("uuidv4");

    // Must not log
    expect(fnBody).not.toContain("console.log");
    expect(fnBody).not.toContain("console.error");
    expect(fnBody).not.toContain("console.warn");

    // Must not look up user (anti-enumeration)
    expect(fnBody).not.toContain("prisma.user.findUnique");
  });

  it("resetPassword rejects all tokens without DB lookup", () => {
    const src = read("services/auth.service.ts");
    const fnStart = src.indexOf("export async function resetPassword");
    expect(fnStart).toBeGreaterThanOrEqual(0);

    const fnBody = src.slice(fnStart, src.indexOf("\nexport ", fnStart + 1));

    // Must throw PASSWORD_RESET_UNAVAILABLE
    expect(fnBody).toContain("PASSWORD_RESET_UNAVAILABLE");
    expect(fnBody).toContain("503");

    // Must not look up tokens
    expect(fnBody).not.toContain("passwordResetToken.findUnique");
    expect(fnBody).not.toContain("bcrypt.hash");
  });

  it("forgotPassword controller returns 503 with correct code", () => {
    const src = read("controllers/auth.controller.ts");

    expect(src).toContain("PASSWORD_RESET_UNAVAILABLE");
    expect(src).toContain("503");
    expect(src).toContain("temporarily unavailable");
  });

  it("no [PASSWORD RESET] log line exists in auth service", () => {
    const src = read("services/auth.service.ts");

    expect(src).not.toContain("[PASSWORD RESET]");
    expect(src).not.toMatch(/console\.log.*resetToken/);
  });

  it("registration, login, refresh, logout are unchanged", () => {
    const src = read("services/auth.service.ts");

    expect(src).toContain("export async function register");
    expect(src).toContain("export async function login");
    expect(src).toContain("export async function refreshTokens");
    expect(src).toContain("export async function logout");
    expect(src).toContain("bcrypt.hash");
    expect(src).toContain("bcrypt.compare");
    expect(src).toContain("generateAccessToken");
    expect(src).toContain("hashToken");
  });
});
