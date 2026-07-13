/**
 * Auth validation schema tests.
 *
 * Verifies that request-body schemas enforce the documented password and
 * email policies. These are pure unit tests — no database or provider needed.
 */

import { describe, it, expect } from "vitest";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validations/auth.validation";

// ── Register ────────────────────────────────────────────────────────────

describe("registerSchema", () => {
  const validInput = {
    name: "Jane Doe",
    email: "jane@example.com",
    password: "SecureP4ss",
  };

  it("accepts valid input", () => {
    const result = registerSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("normalises email to lowercase", () => {
    const result = registerSchema.safeParse({
      ...validInput,
      email: "Jane@EXAMPLE.com",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("jane@example.com");
    }
  });

  it("rejects name shorter than 2 characters", () => {
    const result = registerSchema.safeParse({ ...validInput, name: "J" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = registerSchema.safeParse({ ...validInput, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects password shorter than 8 characters", () => {
    const result = registerSchema.safeParse({ ...validInput, password: "Sh0rt" });
    expect(result.success).toBe(false);
  });

  it("rejects password without uppercase letter", () => {
    const result = registerSchema.safeParse({
      ...validInput,
      password: "securep4ss",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password without lowercase letter", () => {
    const result = registerSchema.safeParse({
      ...validInput,
      password: "SECUREP4SS",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password without digit", () => {
    const result = registerSchema.safeParse({
      ...validInput,
      password: "SecurePass",
    });
    expect(result.success).toBe(false);
  });
});

// ── Login ───────────────────────────────────────────────────────────────

describe("loginSchema", () => {
  it("accepts valid email and password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "any-password",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty email", () => {
    const result = loginSchema.safeParse({ email: "", password: "pass" });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

// ── Forgot password ─────────────────────────────────────────────────────

describe("forgotPasswordSchema", () => {
  it("accepts valid email", () => {
    const result = forgotPasswordSchema.safeParse({ email: "user@example.com" });
    expect(result.success).toBe(true);
  });

  it("normalises email to lowercase", () => {
    const result = forgotPasswordSchema.safeParse({
      email: "User@Example.COM",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("user@example.com");
    }
  });

  it("rejects invalid email", () => {
    const result = forgotPasswordSchema.safeParse({ email: "bad" });
    expect(result.success).toBe(false);
  });
});

// ── Reset password ──────────────────────────────────────────────────────

describe("resetPasswordSchema", () => {
  const validInput = {
    token: "some-uuid-token",
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
