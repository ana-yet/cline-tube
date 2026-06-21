// Known business errors thrown by services and caught by the global error handler.
// Example: throw new ApiError(404, "Media not found", "MEDIA_NOT_FOUND");
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
    Error.captureStackTrace(this, this.constructor);
  }
}
