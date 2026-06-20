"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api";
import type { ApiResponse, Media, Review, PaginatedResponse } from "@/types";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ReviewForm } from "@/components/review-form";
import { ReviewList } from "@/components/review-list";

/**
 * Media Detail Page
 *
 * Displays full media details including:
 * - Poster/backdrop
 * - Title, synopsis, director, cast
 * - Genres, rating, reviews count
 * - Streaming link (if available)
 * - Reviews section placeholder
 *
 * View Count: Recorded after 5 seconds of engagement to prevent
 * crawler/refresh inflation. Deduplicated server-side by IP.
 */

interface MediaDetail extends Media {
  genres: { genre: { id: string; name: string } }[];
}

export default function MediaDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { user } = useAuth();

  const {
    data: media,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["media", "detail", slug],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<{ media: MediaDetail }>>(
        `/media/${slug}`,
      );
      return data.data.media;
    },
  });

  // Fetch reviews for this media
  const { data: reviewsData } = useQuery({
    queryKey: ["reviews", "media", slug],
    queryFn: async () => {
      const { data } = await apiClient.get<
        ApiResponse<Review[]> & { meta: PaginatedResponse<Review>["meta"] }
      >(`/reviews/media/${slug}`, { params: { limit: 50 } });
      return data;
    },
    enabled: !!media,
  });

  const reviews = reviewsData?.data ?? [];

  // Check if current user already has a review
  const myReview = user ? reviews.find((r) => r.userId === user.id) : null;

  // Record view after 5 seconds of engagement
  useEffect(() => {
    if (!media) return;
    const timer = setTimeout(() => {
      apiClient.post(`/media/${slug}/view`).catch(() => {});
    }, 5000);
    return () => clearTimeout(timer);
  }, [media, slug]);

  if (isLoading) {
    return (
      <main className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </main>
    );
  }

  if (error || !media) {
    return (
      <main className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold mb-4">Media Not Found</h1>
        <p className="text-muted-foreground mb-8">
          The media you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link href="/browse">
          <Button>Back to Browse</Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Backdrop */}
      {media.backdropUrl && (
        <div className="relative w-full h-[300px] md:h-[400px] rounded-lg overflow-hidden mb-8">
          <img
            src={media.backdropUrl}
            alt={media.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
        {/* Poster */}
        <div>
          <Card className="overflow-hidden">
            <div className="aspect-[2/3] bg-muted flex items-center justify-center">
              {media.posterUrl ? (
                <img
                  src={media.posterUrl}
                  alt={media.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-6xl">🎬</span>
              )}
            </div>
          </Card>
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{media.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge variant={media.type === "MOVIE" ? "default" : "secondary"}>
                {media.type}
              </Badge>
              <Badge variant="outline">{media.releaseYear}</Badge>
              {media.pricingType === "PREMIUM" ? (
                <Badge>Premium</Badge>
              ) : (
                <Badge variant="outline">Free</Badge>
              )}
              {media.genres.map((g) => (
                <Badge key={g.genre.id} variant="secondary">
                  {g.genre.name}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-4 text-lg">
              <span className="font-semibold">⭐ {media.averageRating}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">
                {media.reviewsCount} reviews
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">
                {media.viewCount} views
              </span>
            </div>
          </div>

          <Separator />

          <div>
            <h2 className="text-xl font-semibold mb-3">Synopsis</h2>
            <p className="text-muted-foreground leading-relaxed">
              {media.synopsis}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-1">Director</h3>
              <p className="text-muted-foreground">{media.director}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Cast</h3>
              <p className="text-muted-foreground">{media.cast.join(", ")}</p>
            </div>
          </div>

          {media.streamingLink && (
            <div>
              <a
                href={media.streamingLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="lg">Watch Now</Button>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <Separator className="my-10" />
      <div>
        <h2 className="text-2xl font-bold mb-6">Reviews</h2>

        {/* Review Form (if logged in and no existing review) */}
        {user && !myReview && media && (
          <div className="mb-6">
            <ReviewForm mediaId={media.id} />
          </div>
        )}

        {/* Existing review notice */}
        {user && myReview && (
          <div className="mb-6">
            <p className="text-sm text-muted-foreground mb-4">
              You&apos;ve already reviewed this media. You can edit your review
              below.
            </p>
          </div>
        )}

        {/* Login prompt */}
        {!user && (
          <Card className="mb-6">
            <CardContent className="py-6 text-center">
              <p className="text-muted-foreground mb-3">
                Sign in to share your review.
              </p>
              <Link href={`/login?redirect=/browse/${slug}`}>
                <Button>Sign In</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Reviews List */}
        {media && <ReviewList reviews={reviews} mediaId={media.id} />}
      </div>
    </main>
  );
}
