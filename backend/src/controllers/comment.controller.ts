import { Request, Response, NextFunction } from "express";
import * as commentService from "../services/comment.service";
import { sendSuccess } from "../utils/response";

export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const comments = await commentService.getCommentsByReview(req.params.id);
    sendSuccess(res, { comments });
  } catch (error) {
    next(error);
  }
}

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const comment = await commentService.createComment(
      req.user!.id,
      req.params.id,
      req.body,
    );
    sendSuccess(res, { comment }, 201);
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
    await commentService.deleteComment(
      req.user!.id,
      req.user!.role,
      req.params.id,
      req.params.commentId,
    );
    sendSuccess(res, { message: "Comment deleted successfully" });
  } catch (error) {
    next(error);
  }
}
