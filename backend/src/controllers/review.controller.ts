import { Request, Response, NextFunction } from "express";
import * as reviewService from "../services/review.service";
import { sendSuccess } from "../utils/response";

/**
 * Review Controller
 *
 * Thin HTTP layer for review operations.
 */

// ── POST /reviews (Authenticated) ─────────────────────────

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const review = await reviewService.createReview(req.user!.id, req.body);
    sendSuccess(res, { review }, 201);
  } catch (error) {
    next(error);
  }
}

// ── PUT /reviews/:id (Owner only) ─────────────────────────

export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const review = await reviewService.updateReview(
      req.user!.id,
      req.params.id,
      req.body,
    );
    sendSuccess(res, { review });
  } catch (error) {
    next(error);
  }
}

// ── DELETE /reviews/:id (Owner only) ──────────────────────

export async function remove(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await reviewService.deleteReview(req.user!.id, req.params.id);
    sendSuccess(res, { message: "Review deleted successfully" });
  } catch (error) {
    next(error);
  }
}

// ── GET /reviews/media/:slug (Public) ─────────────────────

export async function getByMedia(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await reviewService.getReviewsByMedia(
      req.params.slug,
      req.query as never,
    );
    sendSuccess(res, result.items, 200, result.meta);
  } catch (error) {
    next(error);
  }
}

// ── GET /reviews/media/:slug/mine (Authenticated) ───────

export async function getMyReviewForMedia(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const review = await reviewService.getMyReviewForMedia(
      req.user!.id,
      req.params.slug,
    );
    sendSuccess(res, { review });
  } catch (error) {
    next(error);
  }
}

// ── GET /reviews/mine (Authenticated) ─────────────────────

export async function getMine(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await reviewService.getMyReviews(
      req.user!.id,
      req.query as never,
    );
    sendSuccess(res, result.items, 200, result.meta);
  } catch (error) {
    next(error);
  }
}

// ── GET /reviews/pending (Admin) ──────────────────────────

export async function getPending(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await reviewService.getPendingReviews(req.query as never);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (error) {
    next(error);
  }
}

// ── POST /reviews/:id/approve (Admin) ─────────────────────

export async function approve(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const review = await reviewService.approveReview(req.params.id);
    sendSuccess(res, { review });
  } catch (error) {
    next(error);
  }
}

// ── POST /reviews/:id/reject (Admin) ──────────────────────

export async function reject(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const review = await reviewService.rejectReview(req.params.id);
    sendSuccess(res, { review });
  } catch (error) {
    next(error);
  }
}

// ── POST /reviews/:id/like (Authenticated) ────────────────

export async function toggleLike(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await reviewService.toggleLike(req.user!.id, req.params.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
