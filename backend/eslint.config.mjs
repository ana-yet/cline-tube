import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Phase 1: baseline the existing codebase without blocking merges.
      // Ratchet to stricter rules after debt is triaged.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": "off", // Allowed until structured logging replaces it
    },
  },
  {
    ignores: ["dist/", "node_modules/", "prisma/", "phase0-verify.ts"],
  },
);
