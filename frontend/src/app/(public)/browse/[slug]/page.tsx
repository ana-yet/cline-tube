"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api";
import { buildPricingHref } from "@/lib/checkout";
import type {
  ApiResponse,
  Media,
  Review,
  PaginatedResponse,
  MediaSummary,
} from "@/types";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ReviewForm } from "@/components/review-form";
import { ReviewList } from "@/components/review-list";
import {
  Star,
  Play,
  Check,
  Plus,
  Calendar,
  Eye,
  Users,
  Film,
  ArrowLeft,
} from "lucide-react";
import { motion } from "framer-motion";

interface MediaDetail extends Media {
  genres: { genre: { id: string; name: string } }[];
}

export default function MediaDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const searchParams = useSearchParams();
  const checkoutSuccess = searchParams.get("success") === "true";
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [premiumUnlocked, setPremiumUnlocked] = useState(false);

  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const { data } = await apiClient.get<
        ApiResponse<{
          subscription: { tier: string; status: string };
        }>
      >("/payments/subscription");
      return data.data.subscription;
    },
    enabled: isAuthenticated,
    refetchInterval: (query) => {
      if (!checkoutSuccess) return false;
      const tier = query.state.data?.tier;
      if (tier && tier !== "FREE") return false;
      return 2000;
    },
  });

  // 1. Fetch Media details (refetch when auth or subscription changes)
  const {
    data: media,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      "media",
      "detail",
      slug,
      isAuthenticated,
      subscription?.tier ?? "FREE",
    ],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<{ media: MediaDetail }>>(
        `/media/${slug}`,
      );
      return data.data.media;
    },
  });

  // 2. Fetch User's watchlist to check if this item is added
  const { data: watchlist } = useQuery({
    queryKey: ["watchlist"],
    queryFn: async () => {
      const { data } =
        await apiClient.get<ApiResponse<{ items: MediaSummary[] }>>(
          "/watchlist",
        );
      return data.data.items;
    },
    enabled: isAuthenticated,
  });

  const isInWatchlist =
    watchlist?.some((item) => item.id === media?.id) ?? false;

  // 3. Toggle Watchlist mutation
  const toggleWatchlist = useMutation({
    mutationFn: async () => {
      if (!media) return;
      if (isInWatchlist) {
        await apiClient.delete(`/watchlist/${media.id}`);
      } else {
        await apiClient.post("/watchlist", { mediaId: media.id });
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["watchlist"] });
      const previousWatchlist = queryClient.getQueryData<MediaSummary[]>([
        "watchlist",
      ]);

      queryClient.setQueryData<MediaSummary[]>(["watchlist"], (old) => {
        if (!media) return old;
        if (isInWatchlist) {
          return old?.filter((item) => item.id !== media.id) ?? [];
        } else {
          const newItem: MediaSummary = {
            id: media.id,
            title: media.title,
            slug: media.slug,
            type: media.type,
            posterUrl: media.posterUrl,
            releaseYear: media.releaseYear,
            averageRating: media.averageRating,
            reviewsCount: media.reviewsCount,
            genres: media.genres,
            pricingType: media.pricingType,
          };
          return old ? [...old, newItem] : [newItem];
        }
      });

      return { previousWatchlist };
    },
    onError: (err, variables, context) => {
      if (context?.previousWatchlist) {
        queryClient.setQueryData(["watchlist"], context.previousWatchlist);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    },
  });

  // 4. Fetch reviews for this media
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
  const myReview = user ? reviews.find((r) => r.userId === user.id) : null;

  useEffect(() => {
    if (checkoutSuccess && isAuthenticated) {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    }
  }, [checkoutSuccess, isAuthenticated, queryClient]);

  useEffect(() => {
    if (
      checkoutSuccess &&
      subscription?.tier &&
      subscription.tier !== "FREE" &&
      !media?.accessRestricted
    ) {
      setPremiumUnlocked(true);
      queryClient.invalidateQueries({ queryKey: ["media", "detail", slug] });
    }
  }, [
    checkoutSuccess,
    subscription?.tier,
    media?.accessRestricted,
    queryClient,
    slug,
  ]);

  // Record view count after 5 seconds of engagement
  useEffect(() => {
    if (!media) return;
    const timer = setTimeout(() => {
      apiClient.post(`/media/${slug}/view`).catch(() => {});
    }, 5000);
    return () => clearTimeout(timer);
  }, [media, slug]);

  if (isLoading) {
    return (
      <main className="flex items-center justify-center min-h-[70vh] bg-zinc-950">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
      </main>
    );
  }

  if (error || !media) {
    return (
      <main className="container mx-auto px-4 py-24 text-center bg-zinc-950 min-h-[70vh] flex flex-col items-center justify-center space-y-6">
        <div className="h-16 w-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center justify-center">
          <Film className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Cinematic Work Not Found
        </h1>
        <p className="text-zinc-500 max-w-sm">
          The movie or series you are trying to view does not exist in our
          catalog or may have been removed.
        </p>
        <Link href="/browse">
          <Button className="bg-red-600 hover:bg-red-700">
            Back to Catalog
          </Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="bg-zinc-950 min-h-screen text-white pb-20">
      {/* Banner / Backdrop Header */}
      <div className="relative w-full h-[55vh] min-h-[350px] md:h-[65vh] overflow-hidden">
        {media.backdropUrl ? (
          <img
            src={media.backdropUrl}
            alt={media.title}
            className="w-full h-full object-cover scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-zinc-950 to-zinc-900" />
        )}
        {/* Dynamic vignette gradients to blend in poster and information overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-transparent to-zinc-950/20" />

        <div className="absolute bottom-0 left-0 right-0 py-8 z-10">
          <div className="container mx-auto px-4 flex items-end gap-6 md:gap-8">
            {/* Floating Poster Overlay */}
            <div className="hidden md:block w-[240px] aspect-[2/3] shrink-0 rounded-2xl overflow-hidden bg-zinc-900 border-2 border-zinc-800 shadow-2xl shadow-black/80 translate-y-16">
              {media.posterUrl ? (
                <img
                  src={media.posterUrl}
                  alt={media.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl bg-zinc-900">
                  🎬
                </div>
              )}
            </div>

            {/* Media Information */}
            <div className="space-y-4 max-w-3xl flex-1">
              <Link
                href="/browse"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors mb-2"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Catalog</span>
              </Link>

              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-none">
                {media.title}
              </h1>

              <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm pt-1">
                <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/10 font-semibold uppercase tracking-wider text-[10px]">
                  {media.type}
                </Badge>
                <Badge
                  variant="outline"
                  className="border-zinc-800 text-zinc-400 bg-zinc-900/30"
                >
                  <Calendar className="h-3.5 w-3.5 text-zinc-500 mr-1 inline" />
                  {media.releaseYear}
                </Badge>
                <Badge
                  variant="outline"
                  className="border-zinc-800 text-zinc-400 bg-zinc-900/30 uppercase tracking-wider text-[10px]"
                >
                  {media.pricingType}
                </Badge>
                {media.genres.map((g) => (
                  <Badge
                    key={g.genre.id}
                    className="bg-zinc-900 border-zinc-800 text-zinc-300 font-normal hover:bg-zinc-850"
                  >
                    {g.genre.name}
                  </Badge>
                ))}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6 text-sm text-zinc-400 pt-1">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-bold text-white text-base">
                    {media.averageRating || "N/A"}
                  </span>
                  <span className="text-xs text-zinc-500">/10</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-zinc-500" />
                  <span className="font-semibold text-zinc-300">
                    {media.reviewsCount} reviews
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4 text-zinc-500" />
                  <span className="font-semibold text-zinc-300">
                    {media.viewCount} views
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-8 md:mt-24">
        {premiumUnlocked && (
          <Alert className="mb-6 border-emerald-500/30 bg-emerald-950/20 text-emerald-400">
            <AlertDescription className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              <span>Premium unlocked! You can watch this title now.</span>
            </AlertDescription>
          </Alert>
        )}
        {checkoutSuccess &&
          isAuthenticated &&
          media?.accessRestricted &&
          subscription?.tier === "FREE" && (
            <Alert className="mb-6 border-amber-500/30 bg-amber-950/20 text-amber-300">
              <AlertDescription>
                Payment received. Activating premium access — this usually takes
                a few seconds...
              </AlertDescription>
            </Alert>
          )}

        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 md:gap-12">
          {/* Left Column: Mobile Poster & CTA buttons */}
          <div className="space-y-4">
            {/* Mobile Poster */}
            <div className="md:hidden w-full max-w-[200px] mx-auto aspect-[2/3] rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-xl">
              {media.posterUrl ? (
                <img
                  src={media.posterUrl}
                  alt={media.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl bg-zinc-900">
                  🎬
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2.5 max-w-[300px] mx-auto md:max-w-none">
              {media.accessRestricted ? (
                isAuthenticated ? (
                  <Link href={buildPricingHref(`/browse/${slug}`)} className="w-full">
                    <Button
                      size="lg"
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-xl h-12 text-sm font-semibold"
                    >
                      Upgrade to Premium
                    </Button>
                  </Link>
                ) : (
                  <Link href={`/login?redirect=/browse/${slug}`} className="w-full">
                    <Button
                      size="lg"
                      className="w-full bg-red-650 hover:bg-red-700 text-white rounded-xl h-12 text-sm font-semibold gap-2"
                    >
                      <Play className="h-4 w-4 fill-white" />
                      <span>Sign in to Watch</span>
                    </Button>
                  </Link>
                )
              ) : media.streamingLink ? (
                <a
                  href={media.streamingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full"
                >
                  <Button
                    size="lg"
                    className="w-full bg-red-650 hover:bg-red-700 text-white rounded-xl shadow-lg hover:shadow-red-600/20 transition-all font-semibold gap-2 h-12 text-sm"
                  >
                    <Play className="h-4 w-4 fill-white" />
                    <span>Watch Now</span>
                  </Button>
                </a>
              ) : null}

              {isAuthenticated && (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => toggleWatchlist.mutate()}
                  disabled={toggleWatchlist.isPending}
                  className={`w-full rounded-xl border-zinc-850 hover:bg-zinc-900 hover:text-white font-semibold transition-all h-12 text-sm gap-2 ${
                    isInWatchlist
                      ? "border-emerald-500/20 bg-emerald-950/15 text-emerald-400 hover:bg-emerald-950/25 hover:text-emerald-300"
                      : "bg-zinc-900/60"
                  }`}
                >
                  {toggleWatchlist.isPending ? (
                    "Syncing..."
                  ) : isInWatchlist ? (
                    <>
                      <Check className="h-4.5 w-4.5 text-emerald-400" />
                      <span>In Watchlist</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4.5 w-4.5" />
                      <span>Add to Watchlist</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Right Column: Synopsis, Director, Cast, Reviews */}
          <div className="space-y-10">
            {/* Description */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold uppercase tracking-wider text-zinc-400">
                Synopsis
              </h2>
              <p className="text-zinc-300 text-sm md:text-base leading-relaxed font-light">
                {media.synopsis}
              </p>
            </div>

            {/* Crew Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-900/20 border border-zinc-900 p-6 rounded-2xl">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
                  Director
                </h3>
                <p className="text-zinc-200 text-sm font-semibold">
                  {media.director}
                </p>
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
                  Cast
                </h3>
                <p className="text-zinc-200 text-sm font-light leading-relaxed">
                  {media.cast.join(", ")}
                </p>
              </div>
            </div>

            {/* Reviews list header */}
            <div className="space-y-6 pt-4 border-t border-zinc-900">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span>User Reviews</span>
                  <Badge
                    variant="secondary"
                    className="bg-zinc-900 border-zinc-800 text-zinc-400 text-xs"
                  >
                    {reviews.length}
                  </Badge>
                </h2>
              </div>

              {/* Form to submit review */}
              {isAuthenticated && !myReview && (
                <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-6">
                  <ReviewForm mediaId={media.id} />
                </div>
              )}

              {/* Notification if already reviewed */}
              {isAuthenticated && myReview && (
                <div className="bg-zinc-900/30 border border-zinc-850 p-4 rounded-xl text-xs text-zinc-400">
                  You have already shared a review for this title. Review
                  management options are available in your review post below.
                </div>
              )}

              {/* Sign in reminder to submit review */}
              {!isAuthenticated && (
                <Card className="bg-zinc-900/30 border-zinc-900 rounded-2xl overflow-hidden">
                  <CardContent className="py-8 text-center space-y-4">
                    <p className="text-zinc-400 text-sm">
                      Sign in to CineTube to write a review and rate this title.
                    </p>
                    <Link href={`/login?redirect=/browse/${slug}`}>
                      <Button className="bg-red-650 hover:bg-red-700 text-white font-medium rounded-lg text-xs px-6">
                        Sign In
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}

              {/* Reviews List */}
              <div className="space-y-4">
                <ReviewList reviews={reviews} mediaId={media.id} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
