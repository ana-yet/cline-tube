import { Request, Response, NextFunction } from "express";
import * as mediaService from "../services/media.service";
import * as cloudinaryService from "../services/cloudinary.service";
import { sendSuccess } from "../utils/response";

// Media CRUD. When a file is attached it's uploaded to Cloudinary first and
// the resulting URL + public ID are forwarded to the service layer.

// POST /media (admin)
export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (req.file) {
      const result = await cloudinaryService.uploadImage(req.file.buffer);
      req.body.posterUrl = result.secure_url;
      req.body.posterPublicId = result.public_id;
    }

    const media = await mediaService.createMedia(req.body);
    sendSuccess(res, { media }, 201);
  } catch (error) {
    next(error);
  }
}

// PUT /media/:id (admin)
export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (req.file) {
      const result = await cloudinaryService.uploadImage(req.file.buffer);
      req.body.posterUrl = result.secure_url;
      req.body.posterPublicId = result.public_id;
    }

    // Poster cleared without a replacement — remove the existing Cloudinary asset.
    if (req.body.posterRemoved === true && !req.file) {
      const existing = await mediaService.getMediaById(req.params.id);
      if (existing.posterPublicId) {
        cloudinaryService.deleteImage(existing.posterPublicId).catch(() => {});
      }
      req.body.posterUrl = null;
      req.body.posterPublicId = null;
    }
    delete req.body.posterRemoved;

    const media = await mediaService.updateMedia(req.params.id, req.body);
    sendSuccess(res, { media });
  } catch (error) {
    next(error);
  }
}

// DELETE /media/:id (admin)
export async function remove(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await mediaService.deleteMedia(req.params.id);
    sendSuccess(res, { message: "Media deleted successfully" });
  } catch (error) {
    next(error);
  }
}

// GET /media (public)
export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await mediaService.listMedia(req.query as never);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (error) {
    next(error);
  }
}

// GET /media/genres (public)
export async function genres(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const genreList = await mediaService.listGenres();
    sendSuccess(res, { genres: genreList });
  } catch (error) {
    next(error);
  }
}

// GET /media/:slug (public)
export async function getBySlug(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const viewer = req.user
      ? { id: req.user.id, role: req.user.role }
      : undefined;
    const media = await mediaService.getMediaBySlug(req.params.slug, viewer);
    sendSuccess(res, { media });
  } catch (error) {
    next(error);
  }
}

// GET /media/:slug/stream (authenticated)
export async function getStream(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const stream = await mediaService.getStreamLink(
      req.params.slug,
      req.user!.id,
      req.user!.role,
    );
    sendSuccess(res, stream);
  } catch (error) {
    next(error);
  }
}

// POST /media/:slug/view (public)
export async function recordView(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await mediaService.recordView(req.params.slug, req.ip);
    sendSuccess(res, { recorded: true });
  } catch (error) {
    next(error);
  }
}

// GET /media/admin/:id (admin)
export async function getById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const media = await mediaService.getMediaById(req.params.id);
    sendSuccess(res, { media });
  } catch (error) {
    next(error);
  }
}
