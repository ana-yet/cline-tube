import { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.service";
import {
  refreshTokenCookieOptions,
  clearRefreshTokenCookieOptions,
} from "../services/auth.service";
import {
  CSRF_COOKIE_NAME,
  csrfCookieOptions,
  clearCsrfCookieOptions,
} from "../middlewares/csrf";
import { ApiError } from "../utils/errors";
import { sendSuccess } from "../utils/response";

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await authService.register(req.body, getSessionMetadata(req));

    setAuthCookies(res, result.refreshToken, result.csrfToken);

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

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await authService.login(req.body, getSessionMetadata(req));

    setAuthCookies(res, result.refreshToken, result.csrfToken);

    sendSuccess(res, {
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await authService.logout(req.cookies.refreshToken);
    clearAuthCookies(res);

    sendSuccess(res, { message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
}

export async function logoutAll(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await authService.logoutAll(req.user!.id);
    clearAuthCookies(res);

    sendSuccess(res, { message: "All sessions have been signed out" });
  } catch (error) {
    next(error);
  }
}

export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const oldRefreshToken = req.cookies.refreshToken;
    const csrfToken = req.cookies[CSRF_COOKIE_NAME];

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

    const result = await authService.refreshTokens(
      oldRefreshToken,
      csrfToken,
      getSessionMetadata(req),
    );

    setAuthCookies(res, result.refreshToken, result.csrfToken);

    sendSuccess(res, {
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (error) {
    if (shouldClearAuthCookies(error)) {
      clearAuthCookies(res);
    }
    next(error);
  }
}

export async function me(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await authService.getCurrentUser(req.user!.id);

    sendSuccess(res, { user });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await authService.requestPasswordReset(req.body.email);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await authService.resetPassword(req.body.token, req.body.password);
    sendSuccess(res, { message: "Password has been reset successfully" });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await authService.changePassword(
      req.user!.id,
      req.body,
      req.cookies.refreshToken,
    );

    sendSuccess(res, { message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
}

export async function listSessions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sessions = await authService.listSessions(
      req.user!.id,
      req.cookies.refreshToken,
    );

    sendSuccess(res, { sessions });
  } catch (error) {
    next(error);
  }
}

export async function revokeSession(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await authService.revokeSession(
      req.user!.id,
      req.params.sessionId,
      req.cookies.refreshToken,
    );

    if (result.revokedCurrentSession) {
      clearAuthCookies(res);
    }

    sendSuccess(res, { message: "Session revoked successfully" });
  } catch (error) {
    next(error);
  }
}

function setAuthCookies(
  res: Response,
  refreshToken: string,
  csrfToken: string,
): void {
  res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);
  res.cookie(CSRF_COOKIE_NAME, csrfToken, csrfCookieOptions);
}

function clearAuthCookies(res: Response): void {
  res.clearCookie("refreshToken", clearRefreshTokenCookieOptions);
  res.clearCookie(CSRF_COOKIE_NAME, clearCsrfCookieOptions);
}

function getSessionMetadata(req: Request) {
  return {
    userAgent: req.get("user-agent"),
    ipAddress: req.ip,
  };
}

function shouldClearAuthCookies(error: unknown): boolean {
  if (!(error instanceof ApiError)) return true;

  return error.errorCode !== "REFRESH_ALREADY_ROTATED";
}
