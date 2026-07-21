import { Router } from "express";
import * as adminUserController from "../controllers/admin-user.controller";
import { authenticate } from "../middlewares/auth";
import { authorize } from "../middlewares/authorize";

/**
 * Admin User Routes
 *
 * GET    /admin/users     — List users with search/filter
 * GET    /admin/users/:id — Get user detail
 * POST   /admin/users/:id/deactivate  — Soft-delete user
 * POST   /admin/users/:id/reactivate  — Reactivate user
 */

const router = Router();

router.use(authenticate);
router.use(authorize({ roles: ["ADMIN"] }));

router.get("/", adminUserController.list);
router.get("/:id", adminUserController.getDetail);
router.post("/:id/deactivate", adminUserController.deactivate);
router.post("/:id/reactivate", adminUserController.reactivate);

export const adminUserRouter = router;
