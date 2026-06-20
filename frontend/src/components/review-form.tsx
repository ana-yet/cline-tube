"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api";
import { reviewSchema } from "@/lib/validations";
import type { ReviewFormData } from "@/lib/validations";
import type { ApiResponse, Review } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Review Form Component
 *
 * Used for creating and editing reviews.
 * Integrates with React Hook Form + Zod for validation.
 */

interface ReviewFormProps {
  mediaId: string;
  existingReview?: Review | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ReviewForm({
  mediaId,
  existingReview,
  onSuccess,
  onCancel,
}: ReviewFormProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const isEditing = !!existingReview;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema) as never,
    defaultValues: {
      mediaId,
      rating: existingReview?.rating ?? 5,
      content: existingReview?.content ?? "",
      tags: existingReview?.tags ?? [],
      spoilerWarning: existingReview?.spoilerWarning ?? false,
    },
  });

  const currentTags = watch("tags") ?? [];
  const currentRating = watch("rating");
  const currentSpoiler = watch("spoilerWarning");

  const mutation = useMutation({
    mutationFn: async (data: ReviewFormData) => {
      if (isEditing) {
        const { data: res } = await apiClient.put<
          ApiResponse<{ review: Review }>
        >(`/reviews/${existingReview.id}`, data);
        return res;
      } else {
        const { data: res } = await apiClient.post<
          ApiResponse<{ review: Review }>
        >("/reviews", data);
        return res;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["media"] });
      onSuccess?.();
    },
    onError: (err: unknown) => {
      const apiError = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      setError(
        apiError.response?.data?.error?.message || "Failed to submit review",
      );
    },
  });

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !currentTags.includes(tag) && currentTags.length < 5) {
      setValue("tags", [...currentTags, tag]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setValue(
      "tags",
      currentTags.filter((t) => t !== tag),
    );
  };

  const onSubmit = (data: ReviewFormData) => {
    setError(null);
    mutation.mutate({ ...data, mediaId });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Review" : "Write a Review"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit as never)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Rating */}
          <div className="space-y-2">
            <Label>Rating: {currentRating}/10</Label>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              {...register("rating", { valueAsNumber: true })}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 — Poor</span>
              <span>10 — Masterpiece</span>
            </div>
            {errors.rating && (
              <p className="text-sm text-destructive">
                {errors.rating.message}
              </p>
            )}
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Your Review</Label>
            <Textarea
              id="content"
              rows={4}
              placeholder="Share your thoughts..."
              {...register("content")}
            />
            {errors.content && (
              <p className="text-sm text-destructive">
                {errors.content.message}
              </p>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags (optional, max 5)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={addTag}>
                Add
              </Button>
            </div>
            {currentTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {currentTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => removeTag(tag)}
                  >
                    {tag} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Spoiler Warning */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={currentSpoiler}
              onChange={(e) => setValue("spoilerWarning", e.target.checked)}
              className="rounded border-input"
            />
            <span className="text-sm">This review contains spoilers</span>
          </label>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? "Submitting..."
                : isEditing
                  ? "Update Review"
                  : "Submit Review"}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>

          {isEditing && (
            <p className="text-xs text-muted-foreground">
              Editing your review will reset it to pending approval.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
