import { Role } from "@prisma/client";

/**
 * Shared Type Definitions
 *
 * Centralized types used across the backend application.
 * Extends Express Request type to include authenticated user data.
 *
 * Architectural Decision: Types are co-located in a single file
 * rather than scattered across modules. This prevents circular
 * import issues and provides a single source of truth.
 */

// ── JWT Payload ───────────────────────────────────────────
export interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: string;
  iat?: number; // Issued at (auto-added by jwt.sign)
  exp?: number; // Expiry (auto-added by jwt.sign)
}

// ── Token Pair ────────────────────────────────────────────
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// ── Authenticated User (attached to req.user) ─────────────
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: Role | string;
}

// ── Pagination Query Parameters ───────────────────────────
export interface PaginationQuery {
  page?: number;
  limit?: number;
}

// ── Paginated Response ────────────────────────────────────
export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ── API Response Envelope ─────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
