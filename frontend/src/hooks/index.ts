"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api";
import type {
  ApiResponse,
  Media,
  MediaSummary,
  MediaQueryParams,
  Review,
  ReviewQueryParams,
  Comment,
  PaginatedResponse,
} from "@/types";

/**
 * TanStack Query Hooks
 *
 * Custom hooks that wrap TanStack Query's useQuery and useMutation
 * for type-safe data fetching.
 *
 * Architectural Decisions:
 * - Each hook encapsulates its own query key, fetcher, and configuration
 * - Query keys are structured arrays for easy cache invalidation
 * - Mutations automatically invalidate related queries on success
 * - Types are inferred from the API response shape
 */

// ── Query Keys ────────────────────────────────────────────

export const queryKeys = {
  media: {
    all: ["media"] as const,
    list: (params: MediaQueryParams) => ["media", "list", params] as const,
    detail: (slug: string) => ["media", "detail", slug] as const,
  },
  reviews: {
    all: ["reviews"] as const,
    list: (params: ReviewQueryParams) => ["reviews", "list", params] as const,
    detail: (id: string) => ["reviews", "detail", id] as const,
  },
  comments: {
    byReview: (reviewId: string) => ["comments", reviewId] as const,
  },
  watchlist: {
    all: ["watchlist"] as const,
  },
  profile: {
    me: ["profile", "me"] as const,
  },
  admin: {
    analytics: ["admin", "analytics"] as const,
    pendingReviews: ["admin", "reviews", "pending"] as const,
    reports: ["admin", "reports"] as const,
  },
};

// ── Media Hooks ───────────────────────────────────────────

export function useMediaList(params: MediaQueryParams) {
  return useQuery({
    queryKey: queryKeys.media.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<MediaSummary[]>>(
        "/media",
        { params },
      );
      return data;
    },
  });
}

export function useMediaDetail(slug: string) {
  return useQuery({
    queryKey: queryKeys.media.detail(slug),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Media>>(
        `/media/${slug}`,
      );
      return data;
    },
    enabled: !!slug,
  });
}

// ── Review Hooks ──────────────────────────────────────────

export function useReviews(params: ReviewQueryParams) {
  return useQuery({
    queryKey: queryKeys.reviews.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Review[]>>("/reviews", {
        params,
      });
      return data;
    },
  });
}

// ── Comment Hooks ─────────────────────────────────────────

export function useComments(reviewId: string) {
  return useQuery({
    queryKey: queryKeys.comments.byReview(reviewId),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Comment[]>>(
        `/reviews/${reviewId}/comments`,
      );
      return data;
    },
    enabled: !!reviewId,
  });
}

// ── Watchlist Hooks ───────────────────────────────────────

export function useWatchlist() {
  return useQuery({
    queryKey: queryKeys.watchlist.all,
    queryFn: async () => {
      const { data } =
        await apiClient.get<ApiResponse<MediaSummary[]>>("/watchlist");
      return data;
    },
  });
}

export function useAddToWatchlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mediaId: string) => apiClient.post("/watchlist", { mediaId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlist.all });
    },
  });
}

export function useRemoveFromWatchlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mediaId: string) => apiClient.delete(`/watchlist/${mediaId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlist.all });
    },
  });
}

// ── Profile Hooks ─────────────────────────────────────────

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile.me,
    queryFn: async () => {
      const { data } = await apiClient.get("/profile");
      return data;
    },
  });
}
