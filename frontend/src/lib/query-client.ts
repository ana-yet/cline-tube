import { QueryClient } from "@tanstack/react-query";

/**
 * TanStack Query Configuration
 *
 * Centralized QueryClient configuration with sensible defaults.
 *
 * Architectural Decisions:
 * - staleTime: 5 minutes — Data is considered fresh for 5 min, avoiding
 *   unnecessary refetches on every component mount.
 * - gcTime: 10 minutes — Garbage collect unused cache after 10 min (was cacheTime).
 * - refetchOnWindowFocus: false — Prevents aggressive refetching when user
 *   switches tabs (can cause unexpected loading states).
 * - retry: 1 — Retry failed requests once before showing error.
 * - Queries that need different behavior can override these per-query.
 */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        refetchOnWindowFocus: false,
        retry: 1,
      },
      mutations: {
        retry: 0, // Don't retry mutations (they have side effects)
      },
    },
  });
}
