import { Request, Response } from "express";
import * as paymentService from "../services/payment.service";

/**
 * Stripe Webhook Controller
 *
 * Handles incoming Stripe webhook events.
 * Uses raw body for signature verification.
 */

export async function handleWebhook(
  req: Request,
  res: Response,
): Promise<void> {
  const signature = req.headers["stripe-signature"] as string;

  if (!signature) {
    res.status(400).json({
      success: false,
      error: {
        message: "Missing stripe-signature header",
        code: "MISSING_SIGNATURE",
      },
    });
    return;
  }

  try {
    const event = paymentService.constructWebhookEvent(
      req.body, // raw body buffer
      signature,
    );

    await paymentService.handleWebhookEvent(event);

    res.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook error";
    console.error(`Webhook error: ${message}`);
    res.status(400).json({
      success: false,
      error: { message, code: "WEBHOOK_ERROR" },
    });
  }
}
