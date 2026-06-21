"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api";
import type { Review } from "@/types";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ReviewForm } from "./review-form";
import { CommentSection } from "./comment-section";

/**
 * Review List Component
 *
 * Displays a list of reviews with:
 * - Rating stars
 * - Spoiler warning toggle
 * - Like button
 * - Edit/Delete for own reviews
 * - Tags display
 */

interface ReviewListProps {
  reviews: Review[];
  mediaId: string;
}

export function ReviewList({ reviews, mediaId }: ReviewListProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      await apiClient.delete(`/reviews/${reviewId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["media"] });
    },
  });

  const likeMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      const { data } = await apiClient.post(`/reviews/${reviewId}/like`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
  });

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          No reviews yet. Be the first to share your thoughts!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => {
        const isOwner = user?.id === review.userId;
        const isEditing = editingId === review.id;

        if (isEditing) {
          return (
            <ReviewForm
              key={review.id}
              mediaId={mediaId}
              existingReview={review}
              onSuccess={() => setEditingId(null)}
              onCancel={() => setEditingId(null)}
            />
          );
        }

        return (
          <Card key={review.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <span
                        key={i}
                        className={
                          i < review.rating
                            ? "text-yellow-500"
                            : "text-muted-foreground/30"
                        }
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <span className="font-semibold text-lg">
                    {review.rating}/10
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {review.spoilerWarning && (
                    <Badge variant="destructive">Spoiler</Badge>
                  )}
                  {review.status === "PENDING" && (
                    <Badge variant="outline">Pending Approval</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {review.user.name || "Anonymous"}
                </span>
                <span>•</span>
                <span>
                  {new Date(review.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Spoiler content */}
              <SpoilerContent
                content={review.content}
                hasSpoiler={review.spoilerWarning}
              />

              {/* Tags */}
              {review.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {review.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2 border-t">
                {user && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => likeMutation.mutate(review.id)}
                  >
                    👍 {review._count?.likes ?? 0}
                  </Button>
                )}

                {isOwner && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingId(review.id)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => {
                        if (confirm("Delete your review?")) {
                          deleteMutation.mutate(review.id);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </>
                )}

                {review._count?.comments ? (
                  <span className="text-sm text-muted-foreground ml-auto">
                    {review._count.comments} comments
                  </span>
                ) : null}
              </div>

              <CommentSection reviewId={review.id} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ── Spoiler Content Component ─────────────────────────────

function SpoilerContent({
  content,
  hasSpoiler,
}: {
  content: string;
  hasSpoiler: boolean;
}) {
  const [revealed, setRevealed] = useState(false);

  if (!hasSpoiler || revealed) {
    return <p className="text-muted-foreground leading-relaxed">{content}</p>;
  }

  return (
    <div className="relative">
      <p className="text-muted-foreground leading-relaxed blur-sm select-none">
        {content}
      </p>
      <div className="absolute inset-0 flex items-center justify-center">
        <Button variant="outline" size="sm" onClick={() => setRevealed(true)}>
          ⚠️ Reveal Spoiler
        </Button>
      </div>
    </div>
  );
}
