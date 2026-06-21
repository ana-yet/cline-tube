"use client";

import { useState } from "react";
import type { Review } from "@/types";
import { ReviewForm } from "@/components/review-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, Clock, Star, XCircle } from "lucide-react";

interface MyReviewPanelProps {
  mediaId: string;
  review: Review;
  onUpdated?: () => void;
}

export function MyReviewPanel({
  mediaId,
  review,
  onUpdated,
}: MyReviewPanelProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <ReviewForm
        mediaId={mediaId}
        existingReview={review}
        onSuccess={() => {
          setEditing(false);
          onUpdated?.();
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  const statusConfig = {
    PENDING: {
      icon: Clock,
      title: "You have submitted a review",
      description:
        "Your review is awaiting moderator approval. It will appear publicly once accepted.",
      alertClass: "border-amber-500/30 bg-amber-950/20 text-amber-300",
      badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-300",
      badgeLabel: "Pending approval",
    },
    APPROVED: {
      icon: Check,
      title: "Your review is live",
      description:
        "You have already reviewed this title. Your review appears in the list below.",
      alertClass: "border-emerald-500/30 bg-emerald-950/20 text-emerald-400",
      badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
      badgeLabel: "Published",
    },
    REJECTED: {
      icon: XCircle,
      title: "Your review was not approved",
      description:
        "You can edit and resubmit your review for another moderation review.",
      alertClass: "border-red-500/30 bg-red-950/20 text-red-400",
      badgeClass: "border-red-500/30 bg-red-500/10 text-red-400",
      badgeLabel: "Not approved",
    },
  } as const;

  const config = statusConfig[review.status];
  const StatusIcon = config.icon;

  if (review.status === "APPROVED") {
    return (
      <Alert className={config.alertClass}>
        <AlertDescription className="flex items-start gap-2">
          <StatusIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold text-white">{config.title}</p>
            <p className="mt-1 text-sm opacity-90">{config.description}</p>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Alert className={config.alertClass}>
        <AlertDescription className="flex items-start gap-2">
          <StatusIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold text-white">{config.title}</p>
            <p className="mt-1 text-sm opacity-90">{config.description}</p>
          </div>
        </AlertDescription>
      </Alert>

      <Card className="border-zinc-800 bg-zinc-900/40">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base font-bold text-white">
              Your review
            </CardTitle>
            <Badge className={config.badgeClass}>{config.badgeLabel}</Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="font-semibold text-white">{review.rating}/10</span>
            <span>•</span>
            <span>
              {new Date(review.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-zinc-300">{review.content}</p>

          {review.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {review.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="border-zinc-700 bg-zinc-800 text-zinc-300"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            Edit review
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
