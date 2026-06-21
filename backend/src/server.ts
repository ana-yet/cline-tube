import "dotenv/config";
import app from "./app";
import { env } from "./config/env";
import prisma from "./config/prisma";

async function main() {
  try {
    await prisma.$connect();
    console.log("Database connected");

    app.listen(env.PORT, () => {
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

// Disconnect Prisma and exit cleanly on deploy/restart signals.
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}, shutting down`);
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

main();
