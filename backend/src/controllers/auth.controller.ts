import { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.service";
import { sendSuccess } from "../utils/response";
import { refreshTokenCookieOptions } from "../services/auth.service";

/**
 * Auth Controller
 *
 * Thin HTTP layer that:
 * 1. Extracts data from the request
 * 2. Calls the auth service
 * 3. Sets cookies (refresh token)
 * 4. Returns JSON responses
 *
 * All business logic lives in auth.service.ts.
 * Error handling is delegated to the global error handler.
 */

// ── POST /auth/register ───────────────────────────────────

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await authService.register(req.body);

    // Set refresh token as HttpOnly cookie
    res.cookie("refreshToken", result.refreshToken, refreshTokenCookieOptions);

    sendSuccess(
      res,
      {
        user: result.user,
        accessToken: result.accessToken,
      },
      201,
    );
  } catch (error) {
    next(error);
  }
}

// ── POST /auth/login ──────────────────────────────────────

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await authService.login(req.body);

    // Set refresh token as HttpOnly cookie
    res.cookie("refreshToken", result.refreshToken, refreshTokenCookieOptions);

    sendSuccess(res, {
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (error) {
    next(error);
  }
}

// ── POST /auth/logout ─────────────────────────────────────

export async function logout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const refreshToken = req.cookies.refreshToken;

    await authService.logout(refreshToken);

    // Clear the refresh token cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });

    sendSuccess(res, { message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
}

// ── POST /auth/refresh ────────────────────────────────────

export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const oldRefreshToken = req.cookies.refreshToken;

    if (!oldRefreshToken) {
      res.status(401).json({
        success: false,
        error: {
          message: "Refresh token required",
          code: "REFRESH_TOKEN_REQUIRED",
        },
      });
      return;
    }

    const result = await authService.refreshTokens(oldRefreshToken);

    // Set new refresh token as HttpOnly cookie
    res.cookie("refreshToken", result.refreshToken, refreshTokenCookieOptions);

    sendSuccess(res, {
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (error) {
    // On refresh failure, clear the cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });
    next(error);
  }
}

// ── GET /auth/me ──────────────────────────────────────────

export async function me(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const user = await authService.getCurrentUser(userId);

    sendSuccess(res, { user });
  } catch (error) {
    next(error);
  }
}

// ── POST /auth/forgot-password ─────────────────────────────

export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email } = req.body;

    await authService.requestPasswordReset(email);

    // Always return success to prevent email enumeration
    sendSuccess(res, {
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (error) {
    next(error);
  }
}

// ── POST /auth/reset-password ─────────────────────────────

export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { token, password } = req.body;

    await authService.resetPassword(token, password);

    sendSuccess(res, {
      message:
        "Password reset successfully. Please log in with your new password.",
    });
  } catch (error) {
    next(error);
  }
}
