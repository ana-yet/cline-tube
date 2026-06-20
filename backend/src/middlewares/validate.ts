import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

/**
 * Request Validation Middleware Factory
 *
 * Validates request body, query parameters, or route parameters against Zod schemas.
 *
 * Usage:
 *   router.post("/register", validate(registerSchema), controller.register);
 *   router.get("/media", validate(mediaQuerySchema, "query"), controller.list);
 *   router.get("/media/:slug", validate(mediaSlugSchema, "params"), controller.getBySlug);
 *
 * Architectural Decisions:
 * - Zod is used for both backend and frontend validation — single source of truth
 * - Validation errors return structured field-level messages for frontend form mapping
 * - The `source` parameter allows validating body, query, or params independently
 * - Strip unknown fields to prevent injection of unexpected data
 */
type ValidationSource = "body" | "query" | "params";

export const validate = (
  schema: ZodSchema,
  source: ValidationSource = "body",
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const dataToValidate = req[source];
      const parsed = schema.parse(dataToValidate);

      // Replace with parsed data (strips unknown fields, applies defaults/coercions)
      req[source] = parsed;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        }));

        res.status(400).json({
          success: false,
          error: {
            message: "Validation failed",
            code: "VALIDATION_ERROR",
            details: fieldErrors,
          },
        });
        return;
      }

      next(error);
    }
  };
};
