import { Request, Response, NextFunction } from "express";
import * as contactService from "../services/contact.service";
import { sendSuccess } from "../utils/response";

/**
 * Contact Controller
 */

// ── POST /contact (Public) ────────────────────────────────

export async function submit(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const submission = await contactService.submitContact(req.body);
    sendSuccess(res, { submission }, 201);
  } catch (error) {
    next(error);
  }
}

// ── GET /contact (Admin) ──────────────────────────────────

export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await contactService.listContacts(req.query as never);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (error) {
    next(error);
  }
}

// ── PATCH /contact/:id (Admin) ────────────────────────────

export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const submission = await contactService.updateContactStatus(
      req.params.id,
      req.body,
    );
    sendSuccess(res, { submission });
  } catch (error) {
    next(error);
  }
}
