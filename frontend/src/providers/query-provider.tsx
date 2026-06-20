"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";
import { makeQueryClient } from "@/lib/query-client";

/**
 * TanStack Query Provider
 *
 * Provides the QueryClient to the entire application.
 *
 * Architectural Decision: Creates a new QueryClient per request on the server
 * but reuses a single instance on the client. This prevents data leakage
 * between requests in SSR while maintaining cache on the client.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
