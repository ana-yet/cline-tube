import { Request, Response, NextFunction } from "express";
import * as paymentService from "../services/payment.service";
import { sendSuccess } from "../utils/response";
import { ApiError } from "../utils/errors";

/**
 * Payment Controller
 */

// ── POST /payments/checkout ───────────────────────────────

export async function checkout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { plan, returnPath } = req.body;

    if (!plan || !["MONTHLY", "YEARLY"].includes(plan)) {
      throw new ApiError(400, "Plan must be MONTHLY or YEARLY", "INVALID_PLAN");
    }

    const result = await paymentService.createCheckoutSession(
      req.user!.id,
      req.user!.email,
      plan,
      typeof returnPath === "string" ? returnPath : undefined,
    );

    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

// ── GET /payments/subscription ─────────────────────────────

export async function getSubscription(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const subscription = await paymentService.getSubscription(req.user!.id);
    sendSuccess(res, { subscription });
  } catch (error) {
    next(error);
  }
}

// ── POST /payments/cancel ─────────────────────────────────

export async function cancel(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await paymentService.cancelSubscription(req.user!.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
