import { Router } from "express";
import * as dashboardController from "../controllers/dashboard.controller";
import { authenticate } from "../middlewares/auth";

/**
 * Dashboard Routes — User personal dashboard
 *
 * GET /dashboard — Aggregated user stats
 */

const router = Router();

router.use(authenticate);
router.get("/", dashboardController.overview);

export const dashboardRouter = router;
