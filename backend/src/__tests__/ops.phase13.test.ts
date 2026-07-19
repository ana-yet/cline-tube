import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { isAcceptingTraffic, markNotReady, markReady } from "../ops/readiness";
import { redact, redactUrl } from "../utils/logger";

const root = path.resolve(__dirname, "..");
const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

describe("Phase 13 operational readiness", () => {
  it("redacts nested secret fields and sensitive query strings", () => {
    expect(
      redact({
        email: "viewer@example.com",
        accessToken: "secret-token",
        nested: { passwordHash: "hash", ok: true },
      }),
    ).toEqual({
      email: "viewer@example.com",
      accessToken: "[REDACTED]",
      nested: { passwordHash: "[REDACTED]", ok: true },
    });

    expect(redactUrl("/reset?token=abc&next=/profile")).toBe(
      "/reset?token=%5BREDACTED%5D&next=%2Fprofile",
    );
    expect(redactUrl("/login?password=abc&search=movie")).toBe(
      "/login?password=%5BREDACTED%5D&search=movie",
    );
  });

  it("tracks readiness drain state independently of liveness", () => {
    markReady();
    expect(isAcceptingTraffic()).toBe(true);

    markNotReady();
    expect(isAcceptingTraffic()).toBe(false);

    markReady();
    expect(isAcceptingTraffic()).toBe(true);
  });

  it("keeps liveness fast and puts readiness before the global API limiter", () => {
    const app = readSource("app.ts");
    const healthIndex = app.indexOf('app.get("/api/health"');
    const readyIndex = app.indexOf('app.get("/api/ready"');
    const limiterIndex = app.indexOf('app.use("/api", apiLimiter)');

    expect(healthIndex).toBeGreaterThan(-1);
    expect(readyIndex).toBeGreaterThan(healthIndex);
    expect(limiterIndex).toBeGreaterThan(readyIndex);

    const healthBlock = app.slice(healthIndex, readyIndex);
    expect(healthBlock).not.toContain("$queryRaw");
    expect(healthBlock).toContain('status: "live"');

    const readyBlock = app.slice(readyIndex, limiterIndex);
    expect(readyBlock).toContain("isAcceptingTraffic()");
    expect(readyBlock).toContain("$queryRaw`SELECT 1`");
    expect(readyBlock).toContain('reason: "draining"');
    expect(readyBlock).toContain('reason: "database"');
  });

  it("marks readiness false before closing the HTTP server during shutdown", () => {
    const server = readSource("server.ts");
    const markIndex = server.indexOf("markNotReady()");
    const closeIndex = server.indexOf("server.close");

    expect(markIndex).toBeGreaterThan(-1);
    expect(closeIndex).toBeGreaterThan(markIndex);
    expect(server).toContain("setTimeout");
    expect(server).toContain("10_000");
  });
});
