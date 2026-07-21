import { Router } from "express";
import { authRouter } from "./auth.routes";
import { mediaRouter } from "./media.routes";
import { reviewRouter } from "./review.routes";
import { uploadRouter } from "./upload.routes";
import { watchlistRouter } from "./watchlist.routes";
import { profileRouter } from "./profile.routes";
import { adminRouter } from "./admin.routes";
import { paymentRouter } from "./payment.routes";
import { contactRouter } from "./contact.routes";
import { contentRouter } from "./content.routes";
import { cleanupRouter } from "./cleanup.routes";
import { webhookRouter } from "./webhook.routes";
import { dashboardRouter } from "./dashboard.routes";
import { contractRouter } from "./contract.routes";

const router = Router();

router.use("/", contractRouter);
router.use("/auth", authRouter);
router.use("/media", mediaRouter);
router.use("/reviews", reviewRouter);
router.use("/upload", uploadRouter);
router.use("/watchlist", watchlistRouter);
router.use("/dashboard", dashboardRouter);
router.use("/profile", profileRouter);
router.use("/admin", adminRouter);
router.use("/payments", paymentRouter);
router.use("/contact", contactRouter);
router.use("/content", contentRouter);
router.use("/webhooks", webhookRouter);

// Admin cleanup
router.use("/", cleanupRouter);

export const apiRouter = router;
