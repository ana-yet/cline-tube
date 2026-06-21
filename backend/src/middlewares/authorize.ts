import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";
import { Role, SubscriptionStatus, SubscriptionTier } from "@prisma/client";

// Role and (optional) subscription gate. Admins bypass the subscription check,
// and premium status is read live from the database rather than the token.
//   authorize({ roles: ["ADMIN"] })
//   authorize({ roles: ["USER", "ADMIN"], subscription: "PREMIUM" })
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
