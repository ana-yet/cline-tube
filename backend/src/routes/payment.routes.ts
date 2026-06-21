import { Router } from "express";
import * as paymentController from "../controllers/payment.controller";
import { authenticate } from "../middlewares/auth";

/**
 * Payment Routes
 *
 * POST /payments/checkout     — Create Stripe Checkout Session
 * GET  /payments/subscription — Get current subscription
 * POST /payments/cancel       — Cancel subscription (at period end)
 */

const router = Router();

router.use(authenticate);

router.post("/checkout", paymentController.checkout);
router.get("/subscription", paymentController.getSubscription);
router.post("/cancel", paymentController.cancel);

export const paymentRouter = router;
