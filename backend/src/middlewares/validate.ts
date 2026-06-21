import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

// Validates body/query/params against a Zod schema and replaces the source with
// the parsed value (stripping unknown fields). Errors become 400s with field detail.
type ValidationSource = "body" | "query" | "params";

export const validate = (
  schema: ZodSchema,
  source: ValidationSource = "body",
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req[source] = schema.parse(req[source]);
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
