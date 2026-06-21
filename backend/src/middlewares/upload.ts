import multer from "multer";
import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/errors";

// In-memory multipart handling so uploads stream straight to Cloudinary.
// Accepts a single image up to 5MB.
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

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

export const uploadMediaImages = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
}).fields([
  { name: "image", maxCount: 1 },
  { name: "backdropImage", maxCount: 1 },
]);

/** @deprecated Use uploadMediaImages — kept as alias for existing imports */
export const uploadImage = uploadMediaImages;

// Multipart sends arrays/objects as JSON strings; parse them back before
// validation and drop empty strings so optional fields stay undefined.
export function parseMultipartJsonFields(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (req.body) {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === "string") {
        if (req.body[key] === "") {
          delete req.body[key];
          continue;
        }
        try {
          const parsed = JSON.parse(req.body[key]);
          if (Array.isArray(parsed) || typeof parsed === "object") {
            req.body[key] = parsed;
          }
        } catch {
          // leave non-JSON strings untouched
        }
      }
    }

    if (req.body.posterRemoved === "true") {
      req.body.posterRemoved = true;
    }
    if (req.body.backdropRemoved === "true") {
      req.body.backdropRemoved = true;
    }
  }
  next();
}
