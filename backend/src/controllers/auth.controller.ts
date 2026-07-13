import { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.service";
import {
  refreshTokenCookieOptions,
  clearRefreshTokenCookieOptions,
} from "../services/auth.service";
import { sendSuccess } from "../utils/response";

// POST /auth/register
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

// POST /auth/login

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

// POST /auth/logout

export async function logout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const refreshToken = req.cookies.refreshToken;

    await authService.logout(refreshToken);

    // Clear the refresh token cookie
    res.clearCookie("refreshToken", clearRefreshTokenCookieOptions);

    sendSuccess(res, { message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
}

// POST /auth/refresh

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
    res.clearCookie("refreshToken", clearRefreshTokenCookieOptions);
    next(error);
  }
}

// GET /auth/me

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

// POST /auth/forgot-password
//
// Phase 0 containment: recovery delivery is unavailable. The endpoint returns
// a stable 503 response for every address — known and unknown — without
// creating tokens, looking up users, or disclosing account existence.

export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await authService.requestPasswordReset(req.body.email);

    res.status(503).json({
      success: false,
      error: {
        message:
          "Password recovery is temporarily unavailable. Please try again later.",
        code: "PASSWORD_RESET_UNAVAILABLE",
      },
    });
  } catch (error) {
    next(error);
  }
}

// POST /auth/reset-password
//
// Phase 0 containment: all reset-token redemption is rejected. Legacy
// plaintext tokens and any future tokens receive the same response.

export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await authService.resetPassword(req.body.token, req.body.password);

    // Unreachable — the service always throws PASSWORD_RESET_UNAVAILABLE.
    res.status(503).json({
      success: false,
      error: {
        message:
          "Password recovery is temporarily unavailable. Please try again later.",
        code: "PASSWORD_RESET_UNAVAILABLE",
      },
    });
  } catch (error) {
    next(error);
  }
}
