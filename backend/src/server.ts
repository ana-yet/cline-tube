import "dotenv/config";
import app from "./app";
import { env } from "./config/env";
import prisma from "./config/prisma";

/**
 * Server Entry Point
 *
 * Startup sequence:
 * 1. Validate environment variables (crashes if invalid)
 * 2. Connect to PostgreSQL via Prisma
 * 3. Start Express HTTP server
 *
 * Graceful shutdown:
 * - SIGTERM/SIGINT signals disconnect Prisma and close the server
 * - Prevents orphaned database connections on deploy/restart
 */

async function main() {
  try {
    // ── Database Connection ─────────────────────────────
    await prisma.$connect();
    console.log("✅ Database connected successfully");

    // ── Start Server ────────────────────────────────────
    app.listen(env.PORT, () => {
      console.log(`🚀 Server running on http://localhost:${env.PORT}`);
      console.log(`📋 Environment: ${env.NODE_ENV}`);
      console.log(`🔗 API Base: http://localhost:${env.PORT}/api`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// ── Graceful Shutdown ─────────────────────────────────────
const gracefulShutdown = async (signal: string) => {
  console.log(`\n📦 Received ${signal}. Shutting down gracefully...`);
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

main();
