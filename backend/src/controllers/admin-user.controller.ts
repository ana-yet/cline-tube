import { Request, Response, NextFunction } from "express";
import * as adminUserService from "../services/admin-user.service";
import { sendSuccess } from "../utils/response";

/**
 * Admin User Controller
 */

export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await adminUserService.listUsers(req.query as never);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function getDetail(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await adminUserService.getUserDetail(req.params.id);
    sendSuccess(res, { user });
  } catch (error) {
    next(error);
  }
}

export async function deactivate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await adminUserService.deactivateUser(req.params.id);
    sendSuccess(res, { message: "User deactivated" });
  } catch (error) {
    next(error);
  }
}

export async function reactivate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await adminUserService.reactivateUser(req.params.id);
    sendSuccess(res, { message: "User reactivated" });
  } catch (error) {
    next(error);
  }
}
