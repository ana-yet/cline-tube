import "dotenv/config";
import app from "./app";
import { env } from "./config/env";
import prisma from "./config/prisma";

let server: ReturnType<typeof app.listen>;

async function main() {
  try {
    await prisma.$connect();
    console.log("Database connected");

    server = app.listen(env.PORT, () => {
      console.log(`Server running on http://localhost:${env.PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
      console.log(`API base: http://localhost:${env.PORT}/api`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Drain in-flight requests, disconnect Prisma, then exit.
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}, draining connections...`);
  if (server) {
    server.close(async () => {
      console.log("HTTP server closed");
      await prisma.$disconnect();
      process.exit(0);
    });
    // Force exit if drain takes too long
    setTimeout(() => {
      console.error("Forced shutdown after timeout");
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
  console.error("Unhandled rejection:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  gracefulShutdown("uncaughtException");
});

main();
