import { Request, Response, NextFunction } from "express";
import * as adminService from "../services/admin.service";
import { sendSuccess } from "../utils/response";

/**
 * Admin Controller — Dashboard
 */

export async function dashboard(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const kpis = await adminService.getDashboardKPIs();
    sendSuccess(res, { kpis });
  } catch (error) {
    next(error);
  }
}
