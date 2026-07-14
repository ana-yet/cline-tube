import { Request, Response } from "express";
import * as paymentService from "../services/payment.service";

// Receives Stripe webhook events; the raw body is required for signature checks.
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

  let event: ReturnType<typeof paymentService.constructWebhookEvent>;

  try {
    event = paymentService.constructWebhookEvent(
      req.body, // raw body buffer
      signature,
    );
  } catch {
    res.status(400).json({
      success: false,
      error: { message: "Invalid webhook signature", code: "WEBHOOK_ERROR" },
    });
    return;
  }

  try {
    console.log("Stripe webhook received", { type: event.type });

    await paymentService.handleWebhookEvent(event);

    res.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook error";
    console.error("Stripe webhook processing failed", {
      type: event.type,
      message,
    });
    res.status(500).json({
      success: false,
      error: { message: "Webhook processing failed", code: "WEBHOOK_ERROR" },
    });
  }
}
