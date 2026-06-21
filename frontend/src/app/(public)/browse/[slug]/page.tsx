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
import { MyReviewPanel } from "@/components/my-review-panel";
import {
  Star,
  Play,
  Check,
  Plus,
  Calendar,
  Eye,
  Film,
  ArrowLeft,
  Lock,
  MessageSquare,
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
  const { isAuthenticated } = useAuth();
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

  const { data: myReview } = useQuery({
    queryKey: ["reviews", "mine", slug],
    queryFn: async () => {
      const { data } = await apiClient.get<
        ApiResponse<{ review: Review | null }>
      >(`/reviews/media/${slug}/mine`);
      return data.data.review;
    },
    enabled: isAuthenticated && !!media,
    refetchInterval: (query) => {
      if (query.state.data?.status === "PENDING") return 5000;
      return false;
    },
  });

  const invalidateMyReview = () => {
    queryClient.invalidateQueries({ queryKey: ["reviews", "mine", slug] });
    queryClient.invalidateQueries({ queryKey: ["reviews", "media", slug] });
  };

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

  const ratingValue = Number(media.averageRating) || 0;

  return (
    <main className="bg-zinc-950 min-h-screen text-white pb-24">
      {/* Immersive hero */}
      <section className="relative isolate">
        <div className="absolute inset-0 h-[78vh] min-h-[520px] overflow-hidden">
          {media.backdropUrl ? (
            <img
              src={media.backdropUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : media.posterUrl ? (
            <img
              src={media.posterUrl}
              alt=""
              className="w-full h-full object-cover blur-2xl scale-110 opacity-40"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-zinc-950" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-zinc-950/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/95 via-zinc-950/50 to-transparent" />
        </div>

        <div className="relative container mx-auto px-4 pt-8">
          <Link
            href="/browse"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Catalog</span>
          </Link>

          <div className="mt-[24vh] md:mt-[30vh] flex flex-col md:flex-row gap-7 md:gap-10 items-center md:items-end">
            {/* Poster */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="relative w-[180px] md:w-[260px] aspect-[2/3] shrink-0 rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-2xl shadow-black/70"
            >
              {media.posterUrl ? (
                <img
                  src={media.posterUrl}
                  alt={media.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                  <Film className="h-10 w-10 text-zinc-700" />
                </div>
              )}
              {media.accessRestricted && (
                <div className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/70 backdrop-blur px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-300 border border-amber-500/30">
                  <Lock className="h-3 w-3" />
                  Premium
                </div>
              )}
            </motion.div>

            {/* Title + meta + actions */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut", delay: 0.08 }}
              className="flex-1 space-y-5 text-center md:text-left"
            >
              <div className="space-y-3">
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
                  {media.title}
                </h1>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/10 font-semibold uppercase tracking-wider text-[10px]">
                    {media.type}
                  </Badge>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900/70 border border-zinc-800 px-3 py-1 text-xs font-semibold text-amber-300">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {ratingValue ? ratingValue.toFixed(1) : "N/A"}
                    <span className="text-zinc-500 font-normal">/10</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900/70 border border-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300">
                    <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                    {media.releaseYear}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900/70 border border-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300">
                    <Eye className="h-3.5 w-3.5 text-zinc-500" />
                    {media.viewCount}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900/70 border border-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300">
                    <MessageSquare className="h-3.5 w-3.5 text-zinc-500" />
                    {media.reviewsCount}
                  </span>
                </div>

                {media.genres.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                    {media.genres.map((g) => (
                      <Badge
                        key={g.genre.id}
                        className="bg-zinc-900 border-zinc-800 text-zinc-300 font-normal hover:bg-zinc-800"
                      >
                        {g.genre.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3 pt-1">
                {media.accessRestricted ? (
                  isAuthenticated ? (
                    <Link href={buildPricingHref(`/browse/${slug}`)}>
                      <Button
                        size="lg"
                        className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl h-12 px-7 text-sm font-semibold gap-2"
                      >
                        <Lock className="h-4 w-4" />
                        Upgrade to Premium
                      </Button>
                    </Link>
                  ) : (
                    <Link href={`/login?redirect=/browse/${slug}`}>
                      <Button
                        size="lg"
                        className="bg-red-600 hover:bg-red-700 text-white rounded-xl h-12 px-7 text-sm font-semibold gap-2"
                      >
                        <Play className="h-4 w-4 fill-white" />
                        Sign in to Watch
                      </Button>
                    </Link>
                  )
                ) : media.streamingLink ? (
                  <a
                    href={media.streamingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      size="lg"
                      className="bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg hover:shadow-red-600/25 transition-all font-semibold gap-2 h-12 px-7 text-sm"
                    >
                      <Play className="h-4 w-4 fill-white" />
                      Watch Now
                    </Button>
                  </a>
                ) : null}

                {isAuthenticated && (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => toggleWatchlist.mutate()}
                    disabled={toggleWatchlist.isPending}
                    className={`rounded-xl border-zinc-800 hover:bg-zinc-900 hover:text-white font-semibold transition-all h-12 px-6 text-sm gap-2 ${
                      isInWatchlist
                        ? "border-emerald-500/20 bg-emerald-950/15 text-emerald-400 hover:bg-emerald-950/25 hover:text-emerald-300"
                        : "bg-zinc-900/60"
                    }`}
                  >
                    {toggleWatchlist.isPending ? (
                      "Syncing..."
                    ) : isInWatchlist ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-400" />
                        In Watchlist
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Add to Watchlist
                      </>
                    )}
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 mt-10">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10">
          {/* Main column: synopsis + reviews */}
          <div className="lg:col-span-2 space-y-10">
            <section className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                Synopsis
              </h2>
              <p className="text-zinc-300 text-sm md:text-base leading-relaxed">
                {media.synopsis}
              </p>
            </section>

            <Separator className="bg-zinc-900" />

            <section className="space-y-6">
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>User Reviews</span>
                <Badge
                  variant="secondary"
                  className="bg-zinc-900 border-zinc-800 text-zinc-400 text-xs"
                >
                  {reviews.length}
                </Badge>
              </h2>

              {isAuthenticated && !myReview && (
                <div className="rounded-2xl border border-zinc-900 bg-zinc-900/30 p-6">
                  <ReviewForm mediaId={media.id} onSuccess={invalidateMyReview} />
                </div>
              )}

              {isAuthenticated && myReview && (
                <MyReviewPanel
                  mediaId={media.id}
                  review={myReview}
                  onUpdated={invalidateMyReview}
                />
              )}

              {!isAuthenticated && (
                <Card className="bg-zinc-900/30 border-zinc-900 rounded-2xl overflow-hidden">
                  <CardContent className="py-8 text-center space-y-4">
                    <p className="text-zinc-400 text-sm">
                      Sign in to CineTube to write a review and rate this title.
                    </p>
                    <Link href={`/login?redirect=/browse/${slug}`}>
                      <Button className="bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg text-xs px-6">
                        Sign In
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-4">
                <ReviewList reviews={reviews} mediaId={media.id} />
              </div>
            </section>
          </div>

          {/* Aside: title details */}
          <aside className="lg:sticky lg:top-24 h-fit">
            <div className="rounded-2xl border border-zinc-900 bg-zinc-900/30 p-6 space-y-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                Details
              </h2>
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Director
                  </dt>
                  <dd className="text-zinc-200 mt-0.5">{media.director}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Cast
                  </dt>
                  <dd className="text-zinc-300 mt-0.5 leading-relaxed">
                    {media.cast.join(", ")}
                  </dd>
                </div>
                <Separator className="bg-zinc-900" />
                <div className="flex items-center justify-between">
                  <dt className="text-zinc-500">Type</dt>
                  <dd className="text-zinc-200 font-medium">{media.type}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-zinc-500">Released</dt>
                  <dd className="text-zinc-200 font-medium">
                    {media.releaseYear}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-zinc-500">Access</dt>
                  <dd className="text-zinc-200 font-medium">
                    {media.pricingType}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-zinc-500">Rating</dt>
                  <dd className="text-zinc-200 font-medium inline-flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {ratingValue ? `${ratingValue.toFixed(1)} / 10` : "N/A"}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-zinc-500">Views</dt>
                  <dd className="text-zinc-200 font-medium">{media.viewCount}</dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
