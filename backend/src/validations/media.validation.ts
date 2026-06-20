import { z } from "zod";

/**
 * Media Validation Schemas
 *
 * Zod schemas for media CRUD operations and query parameters.
 * Used by the `validate` middleware on media routes.
 */

// ── Create Media ──────────────────────────────────────────

export const createMediaSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(500, "Title must be less than 500 characters")
    .trim(),
  synopsis: z
    .string()
    .min(1, "Synopsis is required")
    .max(10000, "Synopsis must be less than 10000 characters")
    .trim(),
  type: z.enum(["MOVIE", "SERIES"], {
    required_error: "Type is required",
    invalid_type_error: "Type must be MOVIE or SERIES",
  }),
  pricingType: z.enum(["FREE", "PREMIUM"]).default("FREE"),
  streamingLink: z
    .string()
    .min(1, "Streaming link is required")
    .url("Must be a valid URL"),
  posterUrl: z.string().url("Must be a valid URL").optional().nullable(),
  posterPublicId: z.string().optional().nullable(),
  backdropUrl: z.string().url("Must be a valid URL").optional().nullable(),
  backdropPublicId: z.string().optional().nullable(),
  releaseYear: z.coerce
    .number()
    .int()
    .min(1888, "Year must be 1888 or later")
    .max(new Date().getFullYear() + 5, "Year too far in the future"),
  director: z
    .string()
    .min(1, "Director is required")
    .max(255, "Director must be less than 255 characters")
    .trim(),
  cast: z
    .array(z.string().trim().min(1))
    .min(1, "At least one cast member is required")
    .max(50, "Maximum 50 cast members"),
  genreIds: z
    .array(z.string().uuid("Invalid genre ID"))
    .min(1, "At least one genre is required")
    .max(10, "Maximum 10 genres"),
});

// ── Update Media ──────────────────────────────────────────

export const updateMediaSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(500, "Title must be less than 500 characters")
    .trim()
    .optional(),
  synopsis: z
    .string()
    .min(1, "Synopsis is required")
    .max(10000, "Synopsis must be less than 10000 characters")
    .trim()
    .optional(),
  type: z.enum(["MOVIE", "SERIES"]).optional(),
  pricingType: z.enum(["FREE", "PREMIUM"]).optional(),
  streamingLink: z.string().url("Must be a valid URL").optional(),
  posterUrl: z.string().url("Must be a valid URL").optional().nullable(),
  posterPublicId: z.string().optional().nullable(),
  backdropUrl: z.string().url("Must be a valid URL").optional().nullable(),
  backdropPublicId: z.string().optional().nullable(),
  releaseYear: z.coerce
    .number()
    .int()
    .min(1888)
    .max(new Date().getFullYear() + 5)
    .optional(),
  director: z.string().min(1).max(255).trim().optional(),
  cast: z.array(z.string().trim().min(1)).min(1).max(50).optional(),
  genreIds: z
    .array(z.string().uuid("Invalid genre ID"))
    .min(1, "At least one genre is required")
    .max(10)
    .optional(),
});

// ── Media Query Parameters ────────────────────────────────

export const mediaQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(12),
  search: z.string().trim().optional(),
  genre: z.string().trim().optional(),
  year: z.coerce.number().int().optional(),
  type: z.enum(["MOVIE", "SERIES"]).optional(),
  pricingType: z.enum(["FREE", "PREMIUM"]).optional(),
  sortBy: z
    .enum(["latest", "top-rated", "popular", "most-reviewed"])
    .default("latest"),
});

// ── Type Exports ──────────────────────────────────────────

export type CreateMediaInput = z.infer<typeof createMediaSchema>;
export type UpdateMediaInput = z.infer<typeof updateMediaSchema>;
export type MediaQueryInput = z.infer<typeof mediaQuerySchema>;
