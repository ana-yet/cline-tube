import { Request, Response, NextFunction } from "express";
import * as mediaService from "../services/media.service";
import * as cloudinaryService from "../services/cloudinary.service";
import { sendSuccess } from "../utils/response";

/**
 * Media Controller
 *
 * Handles media CRUD with Cloudinary image uploads.
 * When a file is present in the request, it's uploaded to Cloudinary
 * and the resulting URL + public ID are passed to the service.
 */

// ── POST /media (Admin) ──────────────────────────────────

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // If a file was uploaded, send it to Cloudinary
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

// ── PUT /media/:id (Admin) ───────────────────────────────

export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // If a new file was uploaded, send it to Cloudinary
    if (req.file) {
      const result = await cloudinaryService.uploadImage(req.file.buffer);
      req.body.posterUrl = result.secure_url;
      req.body.posterPublicId = result.public_id;
    }

    // If poster was explicitly removed (no new file), clear the fields
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

// ── DELETE /media/:id (Admin) ────────────────────────────

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

// ── GET /media (Public) ──────────────────────────────────

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

// ── GET /media/genres (Public) ───────────────────────────

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

// ── GET /media/:slug (Public) ────────────────────────────

export async function getBySlug(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const media = await mediaService.getMediaBySlug(req.params.slug);
    // View count NOT incremented here — handled by POST /media/:slug/view
    // after the frontend confirms 5+ seconds of engagement
    sendSuccess(res, { media });
  } catch (error) {
    next(error);
  }
}

// ── POST /media/:slug/view (Public — called by frontend) ──

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

// ── GET /media/admin/:id (Admin) ────────────────────────

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
