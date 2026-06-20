import { Router } from "express";
import * as adminController from "../controllers/admin.controller";
import { authenticate } from "../middlewares/auth";
import { authorize } from "../middlewares/authorize";

/**
 * Admin Routes
 *
 * GET /admin/dashboard — KPI data (Admin only)
 */

const router = Router();

router.use(authenticate);
router.use(authorize({ roles: ["ADMIN"] }));

router.get("/dashboard", adminController.dashboard);

export const adminRouter = router;
