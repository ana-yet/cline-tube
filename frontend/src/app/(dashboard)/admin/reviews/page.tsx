"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api";
import type { ApiResponse, Review, PaginatedResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

/**
 * Admin Review Moderation Page
 *
 * Displays pending reviews with:
 * - Approve/Reject actions
 * - Review content preview
 * - User info and media reference
 * - Pagination
 */

interface ReviewWithMedia extends Review {
  media: {
    id: string;
    title: string;
    slug: string;
    posterUrl: string | null;
    type: string;
  };
}

export default function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "reviews", filter, page],
    queryFn: async () => {
      const endpoint =
        filter === "pending" ? "/reviews/pending" : "/reviews/mine";
      const { data } = await apiClient.get<
        ApiResponse<ReviewWithMedia[]> & {
          meta: PaginatedResponse<ReviewWithMedia>["meta"];
        }
      >(endpoint, { params: { page, limit: 20 } });
      return data;
    },
  });

  const reviews = data?.data ?? [];
  const meta = data?.meta;

  const approveMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      await apiClient.post(`/reviews/${reviewId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["media"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      await apiClient.post(`/reviews/${reviewId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["media"] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Review Moderation</h1>
        <div className="flex gap-2">
          <Button
            variant={filter === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setFilter("pending");
              setPage(1);
            }}
          >
            Pending
          </Button>
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setFilter("all");
              setPage(1);
            }}
          >
            All
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {filter === "pending"
                ? "No pending reviews. All caught up!"
                : "No reviews found."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {review.media?.title ?? "Unknown Media"}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      by {review.user.name || "Anonymous"} •{" "}
                      {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        review.status === "APPROVED"
                          ? "default"
                          : review.status === "REJECTED"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {review.status}
                    </Badge>
                    <span className="font-semibold">{review.rating}/10</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground leading-relaxed">
                  {review.content}
                </p>

                {review.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {review.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {review.spoilerWarning && (
                  <Badge variant="destructive" className="text-xs">
                    ⚠️ Contains Spoilers
                  </Badge>
                )}

                <Separator />

                <div className="flex items-center gap-3">
                  {review.status !== "APPROVED" && (
                    <Button
                      size="sm"
                      onClick={() => approveMutation.mutate(review.id)}
                      disabled={approveMutation.isPending}
                    >
                      Approve
                    </Button>
                  )}
                  {review.status !== "REJECTED" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => rejectMutation.mutate(review.id)}
                      disabled={rejectMutation.isPending}
                    >
                      Reject
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {meta.page} of {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
