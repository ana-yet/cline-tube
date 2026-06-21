import { Router } from "express";
import * as mediaController from "../controllers/media.controller";
import { validate } from "../middlewares/validate";
import { authenticate, optionalAuthenticate } from "../middlewares/auth";
import { authorize } from "../middlewares/authorize";
import { uploadImage, parseMultipartJsonFields } from "../middlewares/upload";
import {
  createMediaSchema,
  updateMediaSchema,
  mediaQuerySchema,
} from "../validations/media.validation";

/**
 * Media Routes
 *
 * Public Routes:
 *   GET  /media              — List media with search/filter/sort/pagination
 *   GET  /media/genres       — List all genres
 *   GET  /media/:slug        — Get media detail by slug (increments view count)
 *
 * Admin Routes (require ADMIN role):
 *   POST   /media            — Create new media
 *   PUT    /media/:id        — Update media
 *   DELETE /media/:id        — Delete media
 *   GET    /media/admin/:id  — Get media by ID (for editing)
 */

const router = Router();

// ── Admin Routes (must be before /:slug to avoid conflicts) ─

router.post(
  "/",
  authenticate,
  authorize({ roles: ["ADMIN"] }),
  uploadImage,
  parseMultipartJsonFields,
  validate(createMediaSchema),
  mediaController.create,
);

router.get(
  "/by-id/:id",
  authenticate,
  authorize({ roles: ["ADMIN"] }),
  mediaController.getById,
);

router.put(
  "/:id",
  authenticate,
  authorize({ roles: ["ADMIN"] }),
  uploadImage,
  parseMultipartJsonFields,
  validate(updateMediaSchema),
  mediaController.update,
);

router.delete(
  "/:id",
  authenticate,
  authorize({ roles: ["ADMIN"] }),
  mediaController.remove,
);

// ── Public Routes ─────────────────────────────────────────

router.get("/", validate(mediaQuerySchema, "query"), mediaController.list);

router.get("/genres", mediaController.genres);

router.get(
  "/:slug/stream",
  authenticate,
  mediaController.getStream,
);

router.get("/:slug", optionalAuthenticate, mediaController.getBySlug);

router.post("/:slug/view", mediaController.recordView);

export const mediaRouter = router;
