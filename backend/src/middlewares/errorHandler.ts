import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { ZodError } from "zod";
import { ApiError } from "../utils/errors";

/**
 * Global Error Handler Middleware
 *
 * Catches ALL unhandled errors from the request pipeline and returns
 * a consistent JSON error response. Never exposes internal details in production.
 *
 * Error Classification:
 * - ApiError        → Known business logic errors (custom status + message)
 * - ZodError        → Validation failures (400)
 * - PrismaClientKnownRequestError → Database constraint violations (409/400)
 * - TokenExpiredError → JWT expired (401)
 * - JsonWebTokenError → JWT invalid (401)
 * - Unknown errors  → Internal server error (500)
 *
 * Architectural Decision: All error responses follow the same shape:
 * { success: false, error: { message, code, details? } }
 * This allows the frontend to handle errors uniformly.
 */

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // Log the error with request context
  console.error(`[ERROR] ${req.method} ${req.path} — ${err.message}`, {
    requestId: req.requestId,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });

  // ── ApiError (known business errors) ─────────────────
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.errorCode,
        ...(err.details && { details: err.details }),
      },
    });
    return;
  }

  // ── Zod Validation Error ─────────────────────────────
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        details: err.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      },
    });
    return;
  }

  // ── Prisma Database Errors ───────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002": // Unique constraint violation
        res.status(409).json({
          success: false,
          error: {
            message: `A record with this ${err.meta?.target} already exists`,
            code: "DUPLICATE_ENTRY",
          },
        });
        return;

      case "P2025": // Record not found
        res.status(404).json({
          success: false,
          error: {
            message: "Record not found",
            code: "NOT_FOUND",
          },
        });
        return;

      case "P2003": // Foreign key constraint
        res.status(400).json({
          success: false,
          error: {
            message: "Referenced record does not exist",
            code: "REFERENCE_ERROR",
          },
        });
        return;

      default:
        res.status(400).json({
          success: false,
          error: {
            message: "Database operation failed",
            code: "DATABASE_ERROR",
          },
        });
        return;
    }
  }

  // ── JWT Errors ───────────────────────────────────────
  if (err instanceof TokenExpiredError) {
    res.status(401).json({
      success: false,
      error: {
        message: "Token expired",
        code: "TOKEN_EXPIRED",
      },
    });
    return;
  }

  if (err instanceof JsonWebTokenError) {
    res.status(401).json({
      success: false,
      error: {
        message: "Invalid token",
        code: "INVALID_TOKEN",
      },
    });
    return;
  }

  // ── Unknown Errors (500) ─────────────────────────────
  res.status(500).json({
    success: false,
    error: {
      message:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : err.message || "Internal server error",
      code: "INTERNAL_ERROR",
    },
  });
};
