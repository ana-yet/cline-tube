import { Request, Response, NextFunction } from "express";
import * as watchlistService from "../services/watchlist.service";
import { sendSuccess } from "../utils/response";

export async function add(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await watchlistService.addToWatchlist(req.user!.id, req.body.mediaId);
    sendSuccess(res, { message: "Added to watchlist" }, 201);
  } catch (error) {
    next(error);
  }
}

export async function remove(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await watchlistService.removeFromWatchlist(
      req.user!.id,
      req.params.mediaId,
    );
    sendSuccess(res, { message: "Removed from watchlist" });
  } catch (error) {
    next(error);
  }
}

export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const media = await watchlistService.getWatchlist(req.user!.id);
    sendSuccess(res, { items: media });
  } catch (error) {
    next(error);
  }
}
