import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/auth";
import { authLimiter } from "../middlewares/rateLimiter";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validations/auth.validation";

/**
 * Authentication Routes
 *
 * Route Summary:
 *   POST /auth/register         — Create new account (rate-limited)
 *   POST /auth/login            — Authenticate and get tokens (rate-limited)
 *   POST /auth/logout           — Revoke refresh token and clear cookie
 *   POST /auth/refresh          — Rotate refresh token and get new access token
 *   GET  /auth/me               — Get current authenticated user
 *   POST /auth/forgot-password  — Request password reset email (rate-limited)
 *   POST /auth/reset-password   — Reset password with token (rate-limited)
 *
 * Security:
 * - Register, login, forgot-password, and reset-password are rate-limited
 *   (5 requests per 15 minutes per IP) to prevent brute-force attacks
 * - Refresh token is read from HttpOnly cookie (not request body)
 * - Logout clears the refresh token cookie
 * - /auth/me requires a valid access token (Bearer header)
 */

const router = Router();

// Public Routes (rate-limited)

router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  authController.register,
);

router.post("/login", authLimiter, validate(loginSchema), authController.login);

router.post(
  "/forgot-password",
  authLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);

router.post(
  "/reset-password",
  authLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword,
);

// Token Refresh (no auth required, uses cookie)

router.post("/refresh", authController.refresh);

// Protected Routes

router.post("/logout", authController.logout);
router.get("/me", authenticate, authController.me);

export const authRouter = router;
