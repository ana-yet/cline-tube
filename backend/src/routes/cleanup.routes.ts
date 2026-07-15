import { Router } from "express";
import { authenticate } from "../middlewares/auth";
import { authorize } from "../middlewares/authorize";
import { cleanupExpiredOperationalRows } from "../services/cleanup.service";
import { sendSuccess } from "../utils/response";

/**
 * Admin Cleanup Routes
 *
 * POST /admin/cleanup — Run expired data cleanup (Admin only)
 *
 * Deletes expired: password reset tokens, refresh tokens,
 * checkout attempts, media view dedup rows.
 *
 * Excludes financial ledgers, moderation audit, user content.
 */

const router = Router();

router.use(authenticate);
router.use(authorize({ roles: ["ADMIN"] }));

router.post("/cleanup", async (_req, res, next) => {
  try {
    const result = await cleanupExpiredOperationalRows();
    sendSuccess(res, {
      message: "Cleanup completed",
      deleted: result,
    });
  } catch (error) {
    next(error);
  }
});

export const cleanupRouter = router;
