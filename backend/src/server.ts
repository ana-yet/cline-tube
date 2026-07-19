import "dotenv/config";
import app from "./app";
import { env } from "./config/env";
import prisma from "./config/prisma";
import { markNotReady, markReady } from "./ops/readiness";
import { logger } from "./utils/logger";

let server: ReturnType<typeof app.listen>;

async function main() {
  try {
    await prisma.$connect();
    markReady();
    logger.info("Database connected");

    server = app.listen(env.PORT, () => {
      logger.info("Server started", {
        port: env.PORT,
        environment: env.NODE_ENV,
        apiBase: `http://localhost:${env.PORT}/api`,
      });
    });
  } catch (error) {
    logger.error("Failed to start server", {
      error: error instanceof Error ? error.message : String(error),
    });
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Drain in-flight requests, disconnect Prisma, then exit.
const gracefulShutdown = async (signal: string) => {
  markNotReady();
  logger.info(`Received ${signal}, draining connections...`);
  if (server) {
    server.close(async () => {
      logger.info("HTTP server closed");
      await prisma.$disconnect();
      process.exit(0);
    });
    // Force exit if drain takes too long
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10_000);
  } else {
    await prisma.$disconnect();
    process.exit(0);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
});
process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", {
    error: error.message,
    stack: error.stack,
  });
  gracefulShutdown("uncaughtException");
});

main();
