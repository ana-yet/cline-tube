import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.spec.ts"],
    // Global setup sets required env vars before any module loads
    setupFiles: ["src/__tests__/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.spec.ts",
        "src/__tests__/setup.ts",
        "src/server.ts", // Entry point — tested via integration
      ],
    },
    // Phase 1: deterministic tests — no real DB, no real providers
    testTimeout: 10_000,
  },
});
