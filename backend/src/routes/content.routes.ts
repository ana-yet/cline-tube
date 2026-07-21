import { Router } from "express";
import * as contentController from "../controllers/content.controller";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/auth";
import { authorize } from "../middlewares/authorize";
import { z } from "zod";

/**
 * Content Routes
 *
 * Public:
 *   GET  /content          — List published content
 *   GET  /content/:slug    — Get published post by slug
 *
 * Admin:
 *   GET  /content/admin/all  — List all (including drafts)
 *   POST /content            — Create content
 *   PUT  /content/:id        — Update content
 *   DELETE /content/:id      — Delete content
 */

const createSchema = z.object({
  type: z.enum(["BLOG", "HELP", "LEGAL"]).optional(),
  title: z.string().min(1).max(240).trim(),
  slug: z
    .string()
    .min(1)
    .max(240)
    .trim()
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  excerpt: z.string().max(500).optional(),
  body: z.string().min(1).max(50000),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  seoTitle: z.string().max(240).optional(),
  seoDescription: z.string().max(500).optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).max(240).trim().optional(),
  slug: z
    .string()
    .min(1)
    .max(240)
    .trim()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  excerpt: z.string().max(500).optional(),
  body: z.string().min(1).max(50000).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  seoTitle: z.string().max(240).optional(),
  seoDescription: z.string().max(500).optional(),
});

const router = Router();

// Public
router.get("/", contentController.listPublished);
router.get(
  "/admin/all",
  authenticate,
  authorize({ roles: ["ADMIN"] }),
  contentController.listAll,
);
router.get("/:slug", contentController.getBySlug);

// Admin
router.post(
  "/",
  authenticate,
  authorize({ roles: ["ADMIN"] }),
  validate(createSchema),
  contentController.create,
);

router.put(
  "/:id",
  authenticate,
  authorize({ roles: ["ADMIN"] }),
  validate(updateSchema),
  contentController.update,
);

router.delete(
  "/:id",
  authenticate,
  authorize({ roles: ["ADMIN"] }),
  contentController.remove,
);

export const contentRouter = router;
