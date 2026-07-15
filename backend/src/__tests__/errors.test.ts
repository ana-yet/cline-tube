/**
 * ApiError and response-helper unit tests.
 *
 * Verifies error construction and response envelope shapes without
 * requiring an Express server or database.
 */

import { describe, it, expect } from "vitest";
import { ApiError } from "../utils/errors";

// ── ApiError ────────────────────────────────────────────────────────────

describe("ApiError", () => {
  it("stores statusCode, message, and errorCode", () => {
    const err = new ApiError(404, "Not found", "NOT_FOUND");
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Not found");
    expect(err.errorCode).toBe("NOT_FOUND");
    expect(err.name).toBe("ApiError");
  });

  it("defaults errorCode to API_ERROR when omitted", () => {
    const err = new ApiError(500, "Something broke");
    expect(err.errorCode).toBe("API_ERROR");
  });

  it("stores optional details", () => {
    const details = { field: "email", reason: "duplicate" };
    const err = new ApiError(409, "Conflict", "CONFLICT", details);
    expect(err.details).toEqual(details);
  });

  it("is an instance of Error", () => {
    const err = new ApiError(400, "Bad request", "BAD_REQUEST");
    expect(err).toBeInstanceOf(Error);
    expect(err.stack).toBeDefined();
  });
});
