import { Router } from "express";
import express from "express";
import { handleWebhook } from "../controllers/stripe-webhook.controller";

/**
 * Stripe Webhook Routes
 *
 * POST /webhooks/stripe — Receive Stripe webhook events
 *
 * IMPORTANT: Uses raw body parser (not JSON) for signature verification.
 * Mounted in app.ts at /api/webhooks BEFORE express.json().
 */

const router = Router();

// Raw body parser for webhook signature verification
router.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  handleWebhook,
);

export const webhookRouter = router;
