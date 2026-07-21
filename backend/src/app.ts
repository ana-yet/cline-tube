import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import { corsOptions } from "./config/cors";
import prisma from "./config/prisma";
import { apiRouter } from "./routes";
import { webhookRouter } from "./routes/webhook.routes";
import { errorHandler } from "./middlewares/errorHandler";
import { requestId } from "./middlewares/requestId";
import { apiLimiter } from "./middlewares/rateLimiter";
import { isAcceptingTraffic } from "./ops/readiness";
import { redactUrl } from "./utils/logger";

const app = express();

// Trust first proxy hop (Render, Vercel, etc.) for accurate req.ip and rate-limit keys
app.set("trust proxy", 1);

app.use(requestId);
app.use(helmet());
app.use(cors(corsOptions));
app.use(compression());

// In production, log requests as structured JSON; in dev, use morgan's colored output
if (process.env.NODE_ENV !== "test") {
  if (process.env.NODE_ENV === "production") {
    app.use(
      morgan((tokens, req, res) => {
        return JSON.stringify({
          level: "info",
          message: "HTTP request",
          method: tokens.method(req, res),
          url: redactUrl(tokens.url(req, res)),
          status: Number(tokens.status(req, res)),
          responseTime: Number(tokens["response-time"](req, res)),
          requestId: (req as unknown as Record<string, unknown>)
            .requestId as string,
          ip: tokens["remote-addr"](req, res),
        });
      }),
    );
  } else {
    app.use(morgan("dev"));
  }
}

// Stripe needs the raw body — register before express.json()
app.use("/api/webhooks", webhookRouter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({
    success: true,
    requestId: req.requestId,
    data: {
      status: "live",
      uptime: process.uptime(),
    },
  });
});

// Readiness probe — checks traffic drain state and the database dependency.
app.get("/api/ready", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (!isAcceptingTraffic()) {
    res.status(503).json({
      success: false,
      requestId: req.requestId,
      data: { status: "not_ready", reason: "draining" },
    });
    return;
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      success: true,
      requestId: req.requestId,
      data: { status: "ready" },
    });
  } catch {
    res.status(503).json({
      success: false,
      requestId: req.requestId,
      data: { status: "not_ready", reason: "database" },
    });
  }
});

app.use("/api", apiLimiter);

app.use("/api", apiRouter);

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    requestId: res.locals.requestId,
    error: {
      message: "Route not found",
      code: "NOT_FOUND",
    },
  });
});

app.use(errorHandler);

export default app;
