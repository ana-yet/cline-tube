import { Request, Response, NextFunction } from "express";
import * as contentService from "../services/content.service";
import { sendSuccess } from "../utils/response";

/**
 * Content Controller
 */

// ── GET /content (Public — published only) ────────────────

export async function listPublished(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await contentService.listPublished(req.query as never);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (error) {
    next(error);
  }
}

// ── GET /content/:slug (Public) ───────────────────────────

export async function getBySlug(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const post = await contentService.getBySlug(req.params.slug);
    sendSuccess(res, { post });
  } catch (error) {
    next(error);
  }
}

// ── GET /content/admin/all (Admin) ────────────────────────

export async function listAll(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await contentService.listAll(req.query as never);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (error) {
    next(error);
  }
}

// ── POST /content (Admin) ─────────────────────────────────

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const post = await contentService.createContent(req.body, req.user!.id);
    sendSuccess(res, { post }, 201);
  } catch (error) {
    next(error);
  }
}

// ── PUT /content/:id (Admin) ──────────────────────────────

export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const post = await contentService.updateContent(req.params.id, req.body);
    sendSuccess(res, { post });
  } catch (error) {
    next(error);
  }
}

// ── DELETE /content/:id (Admin) ───────────────────────────

export async function remove(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await contentService.deleteContent(req.params.id);
    sendSuccess(res, { message: "Content deleted" });
  } catch (error) {
    next(error);
  }
}
