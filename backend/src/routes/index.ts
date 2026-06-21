import { Router } from "express";
import { authRouter } from "./auth.routes";
import { mediaRouter } from "./media.routes";
import { reviewRouter } from "./review.routes";
import { uploadRouter } from "./upload.routes";
import { watchlistRouter } from "./watchlist.routes";
import { profileRouter } from "./profile.routes";
import { adminRouter } from "./admin.routes";
import { paymentRouter } from "./payment.routes";

const router = Router();

router.use("/auth", authRouter);
router.use("/media", mediaRouter);
router.use("/reviews", reviewRouter);
router.use("/upload", uploadRouter);
router.use("/watchlist", watchlistRouter);
router.use("/profile", profileRouter);
router.use("/admin", adminRouter);
router.use("/payments", paymentRouter);

export const apiRouter = router;
