import { Router } from "express";
import { authRouter } from "./auth.routes";
import { mediaRouter } from "./media.routes";
import { reviewRouter } from "./review.routes";
import { uploadRouter } from "./upload.routes";
import { watchlistRouter } from "./watchlist.routes";
import { profileRouter } from "./profile.routes";
import { adminRouter } from "./admin.routes";

/**
 * API Route Registry
 *
 * Central route file that mounts all feature routers under their respective prefixes.
 *
 * Route Organization:
 * - Each feature module has its own router file in /routes/
 * - Routes are grouped by domain (auth, media, reviews, etc.)
 * - Feature routers are imported and mounted here
 *
 * Feature routes will be added as they are implemented:
 *
 *   import { reviewRouter } from "./review.routes";
 *   import { commentRouter } from "./comment.routes";
 *   import { watchlistRouter } from "./watchlist.routes";
 *   import { paymentRouter } from "./payment.routes";
 *   import { adminRouter } from "./admin.routes";
 *   import { profileRouter } from "./profile.routes";
 *
 * Architectural Decision: Each router file handles its own middleware
 * (auth, authorize, validate) so the main router stays clean.
 */

const router = Router();

// ── Auth Routes ───────────────────────────────────────────
router.use("/auth", authRouter);

// ── Media Routes ──────────────────────────────────────────
router.use("/media", mediaRouter);

// ── Review Routes ─────────────────────────────────────────
router.use("/reviews", reviewRouter);

// ── Upload Routes ─────────────────────────────────────────
router.use("/upload", uploadRouter);

// ── Watchlist Routes ──────────────────────────────────────
router.use("/watchlist", watchlistRouter);

// ── Profile Routes ────────────────────────────────────────
router.use("/profile", profileRouter);

// ── Admin Routes ──────────────────────────────────────────
router.use("/admin", adminRouter);

export const apiRouter = router;
