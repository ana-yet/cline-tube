import { Router } from "express";
import * as watchlistController from "../controllers/watchlist.controller";
import { authenticate } from "../middlewares/auth";

/**
 * Watchlist Routes
 *
 * All routes require authentication.
 * POST   /watchlist          — Add media to watchlist
 * DELETE /watchlist/:mediaId  — Remove media from watchlist
 * GET    /watchlist           — Get user's watchlist
 */

const router = Router();

router.use(authenticate);

router.post("/", watchlistController.add);
router.delete("/:mediaId", watchlistController.remove);
router.get("/", watchlistController.list);

export const watchlistRouter = router;
