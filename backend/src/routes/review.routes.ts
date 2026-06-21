import { Router } from "express";
import * as reviewController from "../controllers/review.controller";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/auth";
import { authorize } from "../middlewares/authorize";
import {
  createReviewSchema,
  updateReviewSchema,
  reviewQuerySchema,
} from "../validations/review.validation";
import { createCommentSchema } from "../validations/comment.validation";
import * as commentController from "../controllers/comment.controller";

/**
 * Review Routes
 *
 * Public:
 *   GET  /reviews/media/:slug  — Get approved reviews for a media item
 *
 * Authenticated:
 *   POST   /reviews            — Create a review
 *   PUT    /reviews/:id        — Update own review
 *   DELETE /reviews/:id        — Delete own review
 *   GET    /reviews/mine       — Get my reviews
 *   POST   /reviews/:id/like   — Toggle like on a review
 *
 * Admin:
 *   GET  /reviews/pending      — Get pending reviews queue
 *   POST /reviews/:id/approve  — Approve a review
 *   POST /reviews/:id/reject   — Reject a review
 */

const router = Router();

// Public Routes

router.get(
  "/media/:slug",
  validate(reviewQuerySchema, "query"),
  reviewController.getByMedia,
);

router.get(
  "/media/:slug/mine",
  authenticate,
  reviewController.getMyReviewForMedia,
);

// Authenticated Routes

router.post(
  "/",
  authenticate,
  validate(createReviewSchema),
  reviewController.create,
);

router.put(
  "/:id",
  authenticate,
  validate(updateReviewSchema),
  reviewController.update,
);

router.delete("/:id", authenticate, reviewController.remove);

router.get(
  "/mine",
  authenticate,
  validate(reviewQuerySchema, "query"),
  reviewController.getMine,
);

router.get("/:id/comments", commentController.list);

router.post(
  "/:id/comments",
  authenticate,
  validate(createCommentSchema),
  commentController.create,
);

router.delete(
  "/:id/comments/:commentId",
  authenticate,
  commentController.remove,
);

router.post("/:id/like", authenticate, reviewController.toggleLike);

// Admin Routes

router.get(
  "/pending",
  authenticate,
  authorize({ roles: ["ADMIN"] }),
  validate(reviewQuerySchema, "query"),
  reviewController.getPending,
);

router.post(
  "/:id/approve",
  authenticate,
  authorize({ roles: ["ADMIN"] }),
  reviewController.approve,
);

router.post(
  "/:id/reject",
  authenticate,
  authorize({ roles: ["ADMIN"] }),
  reviewController.reject,
);

export const reviewRouter = router;
