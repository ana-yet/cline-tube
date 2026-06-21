import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

// Tags each request with an ID (reusing an upstream X-Request-ID when present)
// so logs and client error reports can be correlated.
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
