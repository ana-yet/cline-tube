import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { userHasPremiumAccess } from "../services/entitlement.service";

// Role and (optional) subscription gate. Premium access is read live from the
// database projection rather than inferred from the token or role.
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

      if (options.subscription === "PREMIUM") {
        const isPremium = await userHasPremiumAccess(req.user.id);

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
