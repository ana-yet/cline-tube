import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { ZodError } from "zod";
import { ApiError } from "../utils/errors";

// Maps known error types to consistent JSON responses and hides internal
// details in production. Unhandled errors fall through to a generic 500.
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  console.error(`[ERROR] ${req.method} ${req.path} — ${err.message}`, {
    requestId: req.requestId,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });

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

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002": // unique constraint
        res.status(409).json({
          success: false,
          error: {
            message: `A record with this ${err.meta?.target} already exists`,
            code: "DUPLICATE_ENTRY",
          },
        });
        return;

      case "P2025": // record not found
        res.status(404).json({
          success: false,
          error: {
            message: "Record not found",
            code: "NOT_FOUND",
          },
        });
        return;

      case "P2003": // foreign key constraint
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
