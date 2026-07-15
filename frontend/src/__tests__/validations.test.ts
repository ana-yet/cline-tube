/**
 * Frontend validation schema tests.
 *
 * Verifies that client-side Zod schemas enforce the documented policies.
 * Pure unit tests — no DOM or API calls.
 */

import { describe, it, expect } from "vitest";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validations";

// ── Login ───────────────────────────────────────────────────────────────

describe("loginSchema", () => {
  it("accepts valid email and password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty email", () => {
    const result = loginSchema.safeParse({ email: "", password: "pass" });
    expect(result.success).toBe(false);
  });

  it("rejects password shorter than 6 characters", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });
});

// ── Register ────────────────────────────────────────────────────────────

describe("registerSchema", () => {
  const validInput = {
    name: "Jane Doe",
    email: "jane@example.com",
    password: "SecureP4ss",
    confirmPassword: "SecureP4ss",
  };

  it("accepts valid input", () => {
    const result = registerSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects name shorter than 2 characters", () => {
    const result = registerSchema.safeParse({ ...validInput, name: "J" });
    expect(result.success).toBe(false);
  });

  it("rejects password without uppercase", () => {
    const result = registerSchema.safeParse({
      ...validInput,
      password: "securep4ss",
      confirmPassword: "securep4ss",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password without digit", () => {
    const result = registerSchema.safeParse({
      ...validInput,
      password: "SecurePass",
      confirmPassword: "SecurePass",
    });
    expect(result.success).toBe(false);
  });

  it("rejects mismatched passwords", () => {
    const result = registerSchema.safeParse({
      ...validInput,
      confirmPassword: "DifferentP4ss",
    });
    expect(result.success).toBe(false);
  });
});

// ── Forgot password ─────────────────────────────────────────────────────

describe("forgotPasswordSchema", () => {
  it("accepts valid email", () => {
    const result = forgotPasswordSchema.safeParse({
      email: "user@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = forgotPasswordSchema.safeParse({ email: "not-an-email" });
    expect(result.success).toBe(false);
  });
});

// ── Reset password ──────────────────────────────────────────────────────

describe("resetPasswordSchema", () => {
  const validInput = {
    token: "some-token",
    password: "NewSecureP4ss",
    confirmPassword: "NewSecureP4ss",
  };

  it("accepts valid matching passwords", () => {
    const result = resetPasswordSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const result = resetPasswordSchema.safeParse({
      ...validInput,
      confirmPassword: "DifferentP4ss",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty token", () => {
    const result = resetPasswordSchema.safeParse({ ...validInput, token: "" });
    expect(result.success).toBe(false);
  });
});
