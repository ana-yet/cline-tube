import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import prisma from "../config/prisma";
import { JwtPayload } from "../types";

// Requires a valid Bearer access token. Re-checks the user in the database on
// every request so deactivated/soft-deleted accounts are rejected immediately.
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
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

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

// Attaches req.user when a valid token is present but never rejects.
// Used by premium-aware public endpoints that adapt to the viewer.
export const optionalAuthenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      next();
      return;
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

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

    if (user && !user.isDeleted) {
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name ?? undefined,
        role: user.role,
      };
    }

    next();
  } catch {
    next();
  }
};
