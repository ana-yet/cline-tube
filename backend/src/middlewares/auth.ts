import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import prisma from "../config/prisma";
import { JwtPayload } from "../types";

/**
 * Authentication Middleware
 *
 * Verifies the JWT access token from the Authorization header.
 * Format: "Bearer <token>"
 *
 * Flow:
 * 1. Extract token from Authorization header
 * 2. Verify signature and expiry using JWT_SECRET
 * 3. Fetch user from database (ensures user still exists and is not soft-deleted)
 * 4. Attach user payload to req.user for downstream handlers
 *
 * Architectural Decisions:
 * - Access token is short-lived (15 min) — stored in memory on client, NOT in cookies
 * - Refresh token is HttpOnly cookie — used only for /auth/refresh
 * - Database lookup on every authenticated request ensures deleted users are blocked immediately
 * - Soft-deleted users (isDeleted=true) are rejected
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        error: {
          message: "Access token required",
          code: "UNAUTHORIZED",
        },
      });
      return;
    }

    const token = authHeader.split(" ")[1];

    // Verify JWT
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isDeleted: true,
      },
    });

    if (!user || user.isDeleted) {
      res.status(401).json({
        success: false,
        error: {
          message: "User not found or account deactivated",
          code: "UNAUTHORIZED",
        },
      });
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name ?? undefined,
      role: user.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: {
          message: "Access token expired",
          code: "TOKEN_EXPIRED",
        },
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: {
          message: "Invalid access token",
          code: "INVALID_TOKEN",
        },
      });
      return;
    }

    next(error);
  }
};
