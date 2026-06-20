import { Response } from "express";

/**
 * Standardized API Response Helpers
 *
 * Ensures every API response follows the same envelope:
 *   Success: { success: true, data: T, meta?: PaginationMeta }
 *   Error:   { success: false, error: { message, code, details? } }
 *
 * Architectural Decision: Consistent response shape allows the frontend
 * to write a single Axios interceptor that handles all responses uniformly.
 */

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  meta?: PaginationMeta,
): void => {
  const response: Record<string, unknown> = {
    success: true,
    data,
  };

  if (meta) {
    response.meta = meta;
  }

  res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 500,
  code: string = "INTERNAL_ERROR",
  details?: Record<string, unknown>,
): void => {
  const response: Record<string, unknown> = {
    success: false,
    error: {
      message,
      code,
    },
  };

  if (details) {
    (response.error as Record<string, unknown>).details = details;
  }

  res.status(statusCode).json(response);
};
