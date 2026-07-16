import { Router } from "express";
import * as adminController from "../controllers/admin.controller";
import { adminUserRouter } from "./admin-user.routes";
import { authenticate } from "../middlewares/auth";
import { authorize } from "../middlewares/authorize";

/**
 * Admin Routes
 *
 * GET /admin/dashboard — KPI data (Admin only)
 *
 * User management is mounted at /admin/users
 */

const router = Router();

router.use(authenticate);
router.use(authorize({ roles: ["ADMIN"] }));

router.get("/dashboard", adminController.dashboard);

// Mount user management at /admin/users
router.use("/users", adminUserRouter);

export const adminRouter = router;
