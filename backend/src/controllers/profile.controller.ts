import { Request, Response, NextFunction } from "express";
import * as profileService from "../services/profile.service";
import { sendSuccess } from "../utils/response";
import { ApiError } from "../utils/errors";

// ── GET /profile ──────────────────────────────────────────

export async function get(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const profile = await profileService.getProfile(req.user!.id);
    sendSuccess(res, { user: profile });
  } catch (error) {
    next(error);
  }
}

// ── PUT /profile ──────────────────────────────────────────

export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const profile = await profileService.updateProfile(req.user!.id, req.body);
    sendSuccess(res, { user: profile });
  } catch (error) {
    next(error);
  }
}

// ── POST /profile/image ───────────────────────────────────

export async function uploadImage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.file) {
      throw new ApiError(400, "No image file provided", "NO_FILE");
    }
    const profile = await profileService.uploadProfileImage(
      req.user!.id,
      req.file.buffer,
    );
    sendSuccess(res, { user: profile });
  } catch (error) {
    next(error);
  }
}

// ── DELETE /profile/image ─────────────────────────────────

export async function deleteImage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const profile = await profileService.deleteProfileImage(req.user!.id);
    sendSuccess(res, { user: profile });
  } catch (error) {
    next(error);
  }
}
