"use client";

import { type ReactNode } from "react";
import { AuthProvider } from "./auth-provider";
import { QueryProvider } from "./query-provider";

/**
 * Root Providers Composition
 *
 * Combines all context providers into a single wrapper.
 * Provider order matters — inner providers can depend on outer ones.
 *
 * Provider Order:
 * 1. QueryProvider (outermost) — TanStack Query available everywhere
 * 2. AuthProvider — Uses TanStack Query for API calls
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>{children}</AuthProvider>
    </QueryProvider>
  );
}
