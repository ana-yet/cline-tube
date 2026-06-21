import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env";
import { ApiError } from "../utils/errors";

// Image upload/deletion via Cloudinary. Credentials come from the environment
// and uploads land in the `cinetube/media` folder.

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

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

// Best-effort delete — a missing asset shouldn't fail the request.
export async function deleteImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    console.warn(`Failed to delete Cloudinary image: ${publicId}`);
  }
}
