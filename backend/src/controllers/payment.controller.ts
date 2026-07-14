import { Request, Response, NextFunction } from "express";
import * as paymentService from "../services/payment.service";
import { sendSuccess } from "../utils/response";
import { ApiError } from "../utils/errors";

// GET /payments/plans
export async function plans(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    sendSuccess(res, { plans: paymentService.listPlans() });
  } catch (error) {
    next(error);
  }
}

// POST /payments/checkout
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

// GET /payments/checkout/outcome
export async function checkoutOutcome(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sessionId = req.query.sessionId ?? req.query.session_id;

    if (typeof sessionId !== "string" || !sessionId) {
      throw new ApiError(400, "sessionId is required", "SESSION_ID_REQUIRED");
    }

    const result = await paymentService.getCheckoutOutcome(
      req.user!.id,
      sessionId,
      req.query.canceled === "true",
    );

    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

// GET /payments/subscription
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

// POST /payments/resume
export async function resume(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await paymentService.resumeSubscription(req.user!.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

// GET /payments/reconcile
export async function reconcile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rawDays = typeof req.query.days === "string" ? req.query.days : "30";
    const days = Number.parseInt(rawDays, 10);

    if (!Number.isFinite(days) || days < 1 || days > 90) {
      throw new ApiError(400, "days must be between 1 and 90", "INVALID_WINDOW");
    }

    const report = await paymentService.getLocalReconciliationReport(days);
    sendSuccess(res, { report });
  } catch (error) {
    next(error);
  }
}

// POST /payments/cancel
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
