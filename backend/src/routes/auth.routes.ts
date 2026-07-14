import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/auth";
import { requireCsrf, requireTrustedOrigin } from "../middlewares/csrf";
import { authLimiter } from "../middlewares/rateLimiter";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  sessionIdParamsSchema,
} from "../validations/auth.validation";

const router = Router();

router.post(
  "/register",
  requireTrustedOrigin,
  authLimiter,
  validate(registerSchema),
  authController.register,
);

router.post(
  "/login",
  requireTrustedOrigin,
  authLimiter,
  validate(loginSchema),
  authController.login,
);

router.post(
  "/forgot-password",
  requireTrustedOrigin,
  authLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);

router.post(
  "/reset-password",
  requireTrustedOrigin,
  authLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword,
);

router.post(
  "/refresh",
  requireTrustedOrigin,
  requireCsrf,
  authController.refresh,
);

router.post(
  "/logout",
  requireTrustedOrigin,
  requireCsrf,
  authController.logout,
);

router.get("/me", authenticate, authController.me);

router.get("/sessions", authenticate, authController.listSessions);

router.delete(
  "/sessions/:sessionId",
  requireTrustedOrigin,
  requireCsrf,
  authenticate,
  validate(sessionIdParamsSchema, "params"),
  authController.revokeSession,
);

router.post(
  "/logout-all",
  requireTrustedOrigin,
  requireCsrf,
  authenticate,
  authController.logoutAll,
);

router.post(
  "/change-password",
  requireTrustedOrigin,
  requireCsrf,
  authenticate,
  authLimiter,
  validate(changePasswordSchema),
  authController.changePassword,
);

export const authRouter = router;
