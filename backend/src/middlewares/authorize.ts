import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";
import { Role, SubscriptionStatus, SubscriptionTier } from "@prisma/client";

/**
 * Authorization Middleware Factory
 *
 * Creates middleware that enforces role-based and subscription-based access control.
 *
 * Usage:
 *   authorize({ roles: ["ADMIN"] })                    — Admin only
 *   authorize({ roles: ["USER", "ADMIN"] })             — Any authenticated user
 *   authorize({ roles: ["USER", "ADMIN"], subscription: "PREMIUM" }) — Premium users + admins
 *
 * Architectural Decisions:
 * - Single middleware for both role AND subscription checks reduces chain complexity
 * - Admins always bypass subscription checks (they have full access)
 * - Subscription validity is checked against currentPeriodEnd in real-time
 * - Uses database query (not token data) for subscription status to ensure accuracy
 */
interface AuthorizeOptions {
  roles: Role[];
  subscription?: "FREE" | "PREMIUM";
}

export const authorize = (options: AuthorizeOptions) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            message: "Authentication required",
            code: "UNAUTHORIZED",
          },
        });
        return;
      }

      // ── Role Check ────────────────────────────────────
      if (!options.roles.includes(req.user.role as Role)) {
        res.status(403).json({
          success: false,
          error: {
            message: "Insufficient permissions",
            code: "FORBIDDEN",
          },
        });
        return;
      }

      // ── Subscription Check (skip for ADMIN) ───────────
      if (options.subscription === "PREMIUM" && req.user.role !== "ADMIN") {
        const subscription = await prisma.subscription.findUnique({
          where: { userId: req.user.id },
          select: {
            tier: true,
            status: true,
            currentPeriodEnd: true,
          },
        });

        const isPremium =
          subscription &&
          subscription.tier !== SubscriptionTier.FREE &&
          subscription.status === SubscriptionStatus.ACTIVE &&
          subscription.currentPeriodEnd > new Date();

        if (!isPremium) {
          res.status(403).json({
            success: false,
            error: {
              message: "Premium subscription required",
              code: "SUBSCRIPTION_REQUIRED",
            },
          });
          return;
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
