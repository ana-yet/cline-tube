import { Request, Response, NextFunction } from "express";
import { buildOpenApiDocument } from "../contracts/api-contract";

export function openApi(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json(buildOpenApiDocument());
  } catch (error) {
    next(error);
  }
}
