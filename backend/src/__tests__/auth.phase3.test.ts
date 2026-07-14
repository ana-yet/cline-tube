import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve(__dirname, "..");
const FRONTEND_SRC = path.resolve(__dirname, "../../../frontend/src");

function readBackend(relativePath: string): string {
  return fs.readFileSync(path.join(SRC, relativePath), "utf-8");
}

function readFrontend(relativePath: string): string {
  return fs.readFileSync(path.join(FRONTEND_SRC, relativePath), "utf-8");
}

function functionBody(src: string, signature: string): string {
  const fnStart = src.indexOf(signature);
  expect(fnStart).toBeGreaterThanOrEqual(0);

  const nextExport = src.indexOf("\nexport ", fnStart + 1);
  return src.slice(fnStart, nextExport === -1 ? undefined : nextExport);
}

describe("Phase 3 auth invariants", () => {
  it("password reset stores only hashes and sends mail without logging tokens", () => {
    const src = readBackend("services/auth.service.ts");
    const fnBody = functionBody(
      src,
      "export async function requestPasswordReset",
    );

    expect(fnBody).toContain("tokenHash");
    expect(fnBody).toContain("sendPasswordResetEmail");
    expect(fnBody).toContain("passwordResetToken.create");
    expect(fnBody).not.toContain("console.log");
    expect(fnBody).not.toContain("console.error");
    expect(fnBody).not.toContain("console.warn");
  });

  it("reset password consumes a hashed single-use token and revokes sessions", () => {
    const src = readBackend("services/auth.service.ts");
    const fnBody = functionBody(src, "export async function resetPassword");

    expect(fnBody).toContain("where: { tokenHash }");
    expect(fnBody).toContain("usedAt");
    expect(fnBody).toContain("refreshToken.updateMany");
    expect(fnBody).toContain("revokedAt");
    expect(fnBody).not.toContain("PASSWORD_RESET_UNAVAILABLE");
  });

  it("refresh rotation marks tokens used and distinguishes race from replay", () => {
    const src = readBackend("services/auth.service.ts");
    const fnBody = functionBody(src, "export async function refreshTokens");

    expect(fnBody).toContain("updateMany");
    expect(fnBody).toContain("usedAt");
    expect(src).toContain("REFRESH_ALREADY_ROTATED");
    expect(src).toContain("SESSION_REUSE_DETECTED");
    expect(fnBody).not.toContain("delete({ where");
  });

  it("auth routes enforce exact origin and CSRF on cookie mutations", () => {
    const routes = readBackend("routes/auth.routes.ts");
    const csrf = readBackend("middlewares/csrf.ts");
    const cors = readBackend("config/cors.ts");

    expect(routes).toContain("requireTrustedOrigin");
    expect(routes).toContain("requireCsrf");
    expect(routes).toContain('"/refresh"');
    expect(routes).toContain('"/logout"');
    expect(csrf).toContain("CSRF_TOKEN_MISMATCH");
    expect(cors).toContain('"X-CSRF-Token"');
  });

  it("frontend keeps access tokens out of browser storage", () => {
    const api = readFrontend("lib/api.ts");
    const checkout = readFrontend("lib/checkout.ts");
    const provider = readFrontend("providers/auth-provider.tsx");

    expect(api).not.toContain("localStorage");
    expect(api).not.toContain("sessionStorage");
    expect(checkout).not.toContain("sessionStorage");
    expect(provider).not.toContain("sessionStorage");
    expect(provider).toContain("queryClient.clear()");
  });
});
