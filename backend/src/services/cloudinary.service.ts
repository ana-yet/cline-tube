import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env";
import { ApiError } from "../utils/errors";

/**
 * Cloudinary Service
 *
 * Handles image upload and deletion via the Cloudinary API.
 *
 * Security:
 * - Credentials loaded from environment variables (never exposed to frontend)
 * - Uploads go to a dedicated `cinetube/media` folder
 * - Only image file types are accepted
 */

// ── Configure Cloudinary ──────────────────────────────────

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

// ── Upload Result Type ────────────────────────────────────

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

// ── Upload Image ──────────────────────────────────────────

/**
 * Upload an image buffer to Cloudinary.
 * @param fileBuffer — The file buffer from multer
 * @param folder — Cloudinary folder path (default: "cinetube/media")
 * @returns Upload result with URL, public ID, and metadata
 */
export async function uploadImage(
  fileBuffer: Buffer,
  folder: string = "cinetube/media",
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        transformation: [{ quality: "auto", fetch_format: "auto" }],
      },
      (error, result) => {
        if (error || !result) {
          reject(
            new ApiError(
              500,
              error?.message || "Cloudinary upload failed",
              "CLOUDINARY_UPLOAD_ERROR",
            ),
          );
          return;
        }

        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
        });
      },
    );

    uploadStream.end(fileBuffer);
  });
}

// ── Delete Image ──────────────────────────────────────────

/**
 * Delete an image from Cloudinary by its public ID.
 * @param publicId — The Cloudinary public ID to delete
 */
export async function deleteImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    // Log but don't throw — image may already be deleted
    console.warn(`Failed to delete Cloudinary image: ${publicId}`);
  }
}
