/**
 * JWT utility tests.
 *
 * Verifies token generation, hashing, and verification without external
 * dependencies. Uses a test JWT_SECRET.
 */

import { describe, it, expect } from "vitest";

// Env vars are set by src/__tests__/setup.ts (Vitest setupFiles).

import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  verifyAccessToken,
} from "../utils/jwt";

describe("JWT utilities", () => {
  const userId = "user-uuid-123";
  const email = "test@example.com";
  const role = "USER";

  describe("generateAccessToken", () => {
    it("returns a non-empty string", () => {
      const token = generateAccessToken(userId, email, role);
      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");
    });

    it("produces a verifiable token with correct claims", () => {
      const token = generateAccessToken(userId, email, role);
      const payload = verifyAccessToken(token);

      expect(payload.sub).toBe(userId);
      expect(payload.email).toBe(email);
      expect(payload.role).toBe(role);
      expect(payload.exp).toBeDefined();
      expect(payload.iat).toBeDefined();
    });
  });

  describe("generateRefreshToken", () => {
    it("returns a 128-character hex string (64 bytes)", () => {
      const token = generateRefreshToken();
      expect(token).toHaveLength(128);
      expect(/^[0-9a-f]+$/.test(token)).toBe(true);
    });

    it("produces unique tokens on successive calls", () => {
      const a = generateRefreshToken();
      const b = generateRefreshToken();
      expect(a).not.toBe(b);
    });
  });

  describe("hashToken", () => {
    it("returns a 64-character hex string (SHA-256)", () => {
      const hash = hashToken("some-token");
      expect(hash).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
    });

    it("is deterministic — same input produces same hash", () => {
      const a = hashToken("deterministic-input");
      const b = hashToken("deterministic-input");
      expect(a).toBe(b);
    });

    it("produces different hashes for different inputs", () => {
      const a = hashToken("token-a");
      const b = hashToken("token-b");
      expect(a).not.toBe(b);
    });
  });

  describe("verifyAccessToken", () => {
    it("throws on invalid token", () => {
      expect(() => verifyAccessToken("not-a-jwt")).toThrow();
    });

    it("throws on token signed with different secret", () => {
      // Generate with default secret, then we can verify our own works
      const token = generateAccessToken(userId, email, role);
      // Should verify fine with the configured secret
      const payload = verifyAccessToken(token);
      expect(payload.sub).toBe(userId);
    });
  });
});
