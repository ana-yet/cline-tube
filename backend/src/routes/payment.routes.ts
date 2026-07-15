import { Role } from "@prisma/client";
import { Router } from "express";
import * as paymentController from "../controllers/payment.controller";
import { authenticate } from "../middlewares/auth";
import { authorize } from "../middlewares/authorize";
import { requireCsrf, requireTrustedOrigin } from "../middlewares/csrf";

/**
 * Payment Routes
 *
 * GET  /payments/plans            - Server-authoritative plan facts
 * POST /payments/checkout         - Create Stripe Checkout Session
 * GET  /payments/checkout/outcome - Resolve owned checkout return
 * GET  /payments/subscription     - Get current subscription
 * POST /payments/cancel           - Cancel subscription at period end
 * POST /payments/resume           - Resume a canceling subscription
 */

const router = Router();

router.get("/plans", paymentController.plans);

router.use(authenticate);

router.post(
  "/checkout",
  requireTrustedOrigin,
  requireCsrf,
  paymentController.checkout,
);
router.get("/checkout/outcome", paymentController.checkoutOutcome);
router.get("/subscription", paymentController.getSubscription);
router.post("/cancel", requireTrustedOrigin, requireCsrf, paymentController.cancel);
router.post("/resume", requireTrustedOrigin, requireCsrf, paymentController.resume);
router.get(
  "/reconcile",
  authorize({ roles: [Role.ADMIN] }),
  paymentController.reconcile,
);

export const paymentRouter = router;
