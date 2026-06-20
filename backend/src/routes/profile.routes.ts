import { Router } from "express";
import * as profileController from "../controllers/profile.controller";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/auth";
import { z } from "zod";

/**
 * Profile Routes
 *
 * GET /profile     — Get current user's profile
 * PUT /profile     — Update current user's profile
 */

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  bio: z.string().max(500).nullable().optional(),
  favoriteGenres: z.array(z.string()).max(10).optional(),
  website: z.string().url().nullable().optional().or(z.literal("")),
  twitter: z.string().max(100).nullable().optional().or(z.literal("")),
  facebook: z.string().max(100).nullable().optional().or(z.literal("")),
  github: z.string().max(100).nullable().optional().or(z.literal("")),
});

const router = Router();

router.use(authenticate);

router.get("/", profileController.get);
router.put("/", validate(updateProfileSchema), profileController.update);

export const profileRouter = router;
