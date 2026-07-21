import { Router } from "express";
import * as contactController from "../controllers/contact.controller";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/auth";
import { authorize } from "../middlewares/authorize";
import { z } from "zod";

/**
 * Contact Routes
 *
 * POST /contact          — Submit contact form (Public)
 * GET  /contact          — List submissions (Admin)
 * PATCH /contact/:id     — Update status (Admin)
 */

const submitSchema = z.object({
  category: z
    .enum(["GENERAL", "BILLING", "TECHNICAL", "CONTENT", "ABUSE", "OTHER"])
    .optional(),
  name: z.string().min(1).max(160).trim(),
  email: z.string().email().max(320).trim(),
  subject: z.string().min(1).max(240).trim(),
  message: z.string().min(1).max(5000).trim(),
});

const updateSchema = z.object({
  status: z.enum(["NEW", "ASSIGNED", "RESOLVED", "DISMISSED"]).optional(),
  assignedToId: z.string().uuid().nullable().optional(),
  resolutionNote: z.string().max(2000).nullable().optional(),
});

const router = Router();

// Public
router.post("/", validate(submitSchema), contactController.submit);

// Admin
router.get(
  "/",
  authenticate,
  authorize({ roles: ["ADMIN"] }),
  contactController.list,
);

router.patch(
  "/:id",
  authenticate,
  authorize({ roles: ["ADMIN"] }),
  validate(updateSchema),
  contactController.update,
);

export const contactRouter = router;
