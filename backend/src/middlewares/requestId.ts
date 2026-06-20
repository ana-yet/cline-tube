import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

/**
 * Request ID Middleware
 *
 * Assigns a unique UUID to every incoming request for distributed tracing.
 * Uses the X-Request-ID header if provided (from load balancers/proxies),
 * or generates a new UUID.
 *
 * Architectural Decision: Request IDs enable:
 * - Correlating logs across services
 * - Debugging specific user-reported issues
 * - Frontend error reporting with server-side traceability
 */
export const requestId = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const id = (req.headers["x-request-id"] as string) || uuidv4();
  req.requestId = id;
  res.setHeader("X-Request-ID", id);
  next();
};
