import multer from "multer";
import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/errors";

/**
 * Upload Middleware (Multer)
 *
 * Handles multipart/form-data file uploads.
 * Files are stored in memory (not disk) for direct upload to Cloudinary.
 *
 * Security:
 * - Only image MIME types are accepted
 * - Maximum file size: 5MB
 * - Single file per request
 */

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const storage = multer.memoryStorage();

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        `Invalid file type: ${file.mimetype}. Allowed: JPG, PNG, WebP`,
        "INVALID_FILE_TYPE",
      ),
    );
  }
};

export const uploadImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
}).single("image");

/**
 * Parse JSON string fields from multipart form data.
 * When using multer, array/object fields arrive as JSON strings.
 * This middleware parses them before validation.
 */
export function parseMultipartJsonFields(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (req.body) {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === "string") {
        // Strip empty strings — treat as undefined for optional fields
        if (req.body[key] === "") {
          delete req.body[key];
          continue;
        }
        // Try parsing JSON strings (for arrays/objects in multipart form)
        try {
          const parsed = JSON.parse(req.body[key]);
          if (Array.isArray(parsed) || typeof parsed === "object") {
            req.body[key] = parsed;
          }
        } catch {
          // Not JSON, leave as-is
        }
      }
    }

    // Handle explicit image removal flag
    if (req.body.posterRemoved === "true") {
      req.body.posterRemoved = true;
    }
  }
  next();
}
