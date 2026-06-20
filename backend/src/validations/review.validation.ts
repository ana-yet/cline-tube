import { z } from "zod";

/**
 * Review Validation Schemas
 *
 * Zod schemas for review CRUD and admin moderation.
 */

// ── Create Review ─────────────────────────────────────────

export const createReviewSchema = z.object({
  mediaId: z.string().uuid("Invalid media ID"),
  rating: z
    .number()
    .int("Rating must be a whole number")
    .min(1, "Rating must be at least 1")
    .max(10, "Rating must be at most 10"),
  content: z
    .string()
    .min(10, "Review must be at least 10 characters")
    .max(5000, "Review must be less than 5000 characters")
    .trim(),
  tags: z
    .array(z.string().trim().min(1).max(30))
    .max(5, "Maximum 5 tags allowed")
    .default([]),
  spoilerWarning: z.boolean().default(false),
});

// ── Update Review ─────────────────────────────────────────

export const updateReviewSchema = z.object({
  rating: z
    .number()
    .int("Rating must be a whole number")
    .min(1, "Rating must be at least 1")
    .max(10, "Rating must be at most 10")
    .optional(),
  content: z
    .string()
    .min(10, "Review must be at least 10 characters")
    .max(5000, "Review must be less than 5000 characters")
    .trim()
    .optional(),
  tags: z
    .array(z.string().trim().min(1).max(30))
    .max(5, "Maximum 5 tags allowed")
    .optional(),
  spoilerWarning: z.boolean().optional(),
});

// ── Review Query Parameters ───────────────────────────────

export const reviewQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  mediaId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  sortBy: z.enum(["latest", "top-rated", "most-liked"]).default("latest"),
});

// ── Admin Review Action ───────────────────────────────────

export const reviewActionSchema = z.object({
  reason: z
    .string()
    .max(500, "Reason must be less than 500 characters")
    .optional(),
});

// ── Type Exports ──────────────────────────────────────────

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type ReviewQueryInput = z.infer<typeof reviewQuerySchema>;
