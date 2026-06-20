import { Request, Response, NextFunction } from "express";
import * as profileService from "../services/profile.service";
import { sendSuccess } from "../utils/response";

/**
 * Profile Controller
 */

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
