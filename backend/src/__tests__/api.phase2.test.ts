import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { apiRouteContracts, buildOpenApiDocument } from "../contracts/api-contract";

const SRC = path.resolve(__dirname, "..");
const ROOT = path.resolve(__dirname, "../../..");

function readBackend(relativePath: string): string {
  return fs.readFileSync(path.join(SRC, relativePath), "utf-8");
}

function readRoot(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf-8");
}

describe("Phase 2 API contract and envelope invariants", () => {
  it("keeps a source-owned contract baseline for the current API surface", () => {
    expect(apiRouteContracts.length).toBeGreaterThanOrEqual(42);

    const keys = new Set(
      apiRouteContracts.map((route) => `${route.method} ${route.path}`),
    );

    expect(keys.size).toBe(apiRouteContracts.length);
    expect(keys).toContain("POST /api/auth/register");
    expect(keys).toContain("GET /api/media");
    expect(keys).toContain("GET /api/media/{slug}/stream");
    expect(keys).toContain("POST /api/payments/checkout");
    expect(keys).toContain("POST /api/webhooks/stripe");
    expect(keys).toContain("GET /api/openapi.json");
  });

  it("assigns validation, policy, and DTO ownership to protected routes", () => {
    const protectedRoutes = apiRouteContracts.filter((route) =>
      ["user", "admin"].includes(route.access),
    );

    expect(protectedRoutes.length).toBeGreaterThan(20);
    for (const route of protectedRoutes) {
      expect(route.policy.length).toBeGreaterThan(0);
      expect(route.responseDto).toMatch(/Dto$/);
    }

    const mutatingRoutes = apiRouteContracts.filter((route) =>
      ["POST", "PUT", "PATCH", "DELETE"].includes(route.method),
    );

    for (const route of mutatingRoutes) {
      expect(["no-store", "none"]).toContain(route.cache);
    }
  });

  it("builds an OpenAPI 3.1 document from the same route contracts", () => {
    const document = buildOpenApiDocument();

    expect(document.openapi).toBe("3.1.0");
    expect(document.components.schemas.SuccessEnvelope).toBeDefined();
    expect(document.components.schemas.ErrorEnvelope).toBeDefined();
    expect(Object.keys(document.paths).length).toBeGreaterThanOrEqual(42);
    expect(document.paths["/api/auth/register"].post).toBeDefined();
    expect(document.paths["/api/openapi.json"].get).toBeDefined();
  });

  it("checks in generated OpenAPI JSON that matches source contracts", () => {
    const generated = JSON.parse(readRoot("backend/openapi.json"));
    const source = buildOpenApiDocument();

    expect(generated.info.version).toBe(source.info.version);
    expect(Object.keys(generated.paths).sort()).toEqual(
      Object.keys(source.paths).sort(),
    );
  });

  it("standard envelopes include requestId on success and errors", () => {
    const response = readBackend("utils/response.ts");
    const errorHandler = readBackend("middlewares/errorHandler.ts");
    const validate = readBackend("middlewares/validate.ts");
    const auth = readBackend("middlewares/auth.ts");
    const rateLimiter = readBackend("middlewares/rateLimiter.ts");
    const app = readBackend("app.ts");

    expect(response).toContain("requestId: res.locals.requestId");
    expect(errorHandler).toContain("requestId: req.requestId");
    expect(validate).toContain("requestId: req.requestId");
    expect(auth).toContain("requestId: req.requestId");
    expect(rateLimiter).toContain("requestId: req.requestId");
    expect(app).toContain("requestId: req.requestId");
    expect(app).toContain("requestId: res.locals.requestId");
  });

  it("documents high-risk policies without exposing raw provider or secret DTOs", () => {
    const contract = readBackend("contracts/api-contract.ts");
    const payment = readBackend("services/payment.service.ts");

    expect(contract).toContain("premium entitlement");
    expect(contract).toContain("owned checkout attempt");
    expect(contract).toContain("Stripe signature");
    expect(contract).not.toContain("stripeCustomerId response");
    expect(payment).not.toContain("stripeCustomerId: true,\n      stripeSubscriptionId: true,\n      currentPeriodStart");
  });
});
