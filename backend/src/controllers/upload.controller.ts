import { Request, Response, NextFunction } from "express";
import * as cloudinaryService from "../services/cloudinary.service";
import { sendSuccess } from "../utils/response";
import { ApiError } from "../utils/errors";

// Standalone image upload/delete endpoints used outside of media CRUD.

// POST /upload/image
export async function uploadImage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.file) {
      throw new ApiError(400, "No image file provided", "NO_FILE");
    }

    const result = await cloudinaryService.uploadImage(req.file.buffer);

    sendSuccess(res, {
      secure_url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /upload/:publicId
export async function deleteImage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // publicId can contain slashes (e.g. "cinetube/media/abc123"), so decode it.
    const publicId = decodeURIComponent(req.params.publicId);

    await cloudinaryService.deleteImage(publicId);

    sendSuccess(res, { message: "Image deleted successfully" });
  } catch (error) {
    next(error);
  }
}
