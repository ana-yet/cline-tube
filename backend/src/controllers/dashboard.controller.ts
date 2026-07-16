import { Request, Response, NextFunction } from "express";
import * as dashboardService from "../services/dashboard.service";
import { sendSuccess } from "../utils/response";

/**
 * Dashboard Controller — User dashboard
 */

export async function overview(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const stats = await dashboardService.getUserDashboard(req.user!.id);
    sendSuccess(res, stats);
  } catch (error) {
    next(error);
  }
}
