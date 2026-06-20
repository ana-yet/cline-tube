import { Router } from "express";
import * as uploadController from "../controllers/upload.controller";
import { uploadImage } from "../middlewares/upload";
import { authenticate } from "../middlewares/auth";
import { authorize } from "../middlewares/authorize";

/**
 * Upload Routes
 *
 * POST /upload/image     — Upload an image to Cloudinary (Admin only)
 * DELETE /upload/:publicId — Delete an image from Cloudinary (Admin only)
 *
 * Accepts multipart/form-data with field name "image"
 */

const router = Router();

router.post(
  "/image",
  authenticate,
  authorize({ roles: ["ADMIN"] }),
  uploadImage,
  uploadController.uploadImage,
);

router.delete(
  "/:publicId(*)",
  authenticate,
  authorize({ roles: ["ADMIN"] }),
  uploadController.deleteImage,
);

export const uploadRouter = router;
