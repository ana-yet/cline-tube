import { PrismaClient } from "@prisma/client";

/**
 * Prisma Client Singleton
 *
 * In development, Next.js/Node hot-reloads create a new module instance
 * on every save, which spawns a new PrismaClient and exhausts the
 * PostgreSQL connection pool. This pattern reuses a single instance.
 *
 * Architectural Decision: Global singleton prevents connection exhaustion.
 * The `global` cast is safe because this file only runs server-side.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
