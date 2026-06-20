import { AuthUser } from "./index";

/**
 * Express Type Augmentation
 *
 * Extends the Express Request interface to include the `user` property
 * set by the authentication middleware, and `requestId` from the request ID middleware.
 *
 * This file MUST be included in tsconfig.json's "include" array
 * for TypeScript to recognize the augmented types globally.
 */

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      requestId?: string;
    }
  }
}

export {};
