/**
 * Custom API Error Class
 *
 * Used throughout the application to throw known business logic errors.
 * The global error handler catches these and returns the appropriate HTTP response.
 *
 * Usage:
 *   throw new ApiError(404, "Media not found", "MEDIA_NOT_FOUND");
 *   throw new ApiError(403, "Premium required", "SUBSCRIPTION_REQUIRED", { tier: "MONTHLY" });
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    statusCode: number,
    message: string,
    errorCode: string = "API_ERROR",
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.name = "ApiError";

    // Maintains proper stack trace in V8 engines
    Error.captureStackTrace(this, this.constructor);
  }
}
