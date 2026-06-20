"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api";
import type { ApiResponse, Review, PaginatedResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X, Star, Shield, ChevronLeft, ChevronRight, MessageSquare, AlertTriangle } from "lucide-react";

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
    <div className="space-y-8">
      {/* Header section with tab switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Shield className="h-6 w-6 text-red-500" />
            <span>Review Moderation Queue</span>
          </h1>
          <p className="text-zinc-500 text-xs mt-1">
            Audit and approve or reject submissions from the community.
          </p>
        </div>

        {/* Tab triggers */}
        <div className="inline-flex bg-zinc-900/60 border border-zinc-900 p-1.5 rounded-xl self-start sm:self-center">
          <button
            onClick={() => {
              setFilter("pending");
              setPage(1);
            }}
            className={`text-xs font-semibold px-4 py-2 rounded-lg transition-all ${
              filter === "pending"
                ? "bg-red-500/10 text-red-400 font-bold border border-red-500/10"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Awaiting Moderation
          </button>
          <button
            onClick={() => {
              setFilter("all");
              setPage(1);
            }}
            className={`text-xs font-semibold px-4 py-2 rounded-lg transition-all ${
              filter === "all"
                ? "bg-red-500/10 text-red-400 font-bold border border-red-500/10"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            All Submissions
          </button>
        </div>
      </div>

      {/* Reviews list viewport */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="bg-zinc-900/30 border-zinc-900 overflow-hidden">
              <CardContent className="p-6">
                <div className="h-28 bg-zinc-900 animate-pulse rounded-xl" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <Card className="bg-zinc-900/30 border-zinc-900 border-dashed py-16 text-center max-w-lg mx-auto rounded-3xl">
          <MessageSquare className="h-10 w-10 text-zinc-650 mx-auto mb-4 stroke-1" />
          <h2 className="text-lg font-bold text-zinc-300">
            {filter === "pending" ? "All Caught Up!" : "No Reviews Found"}
          </h2>
          <p className="text-zinc-500 text-xs max-w-xs mx-auto mt-1 leading-relaxed">
            {filter === "pending"
              ? "There are no pending reviews in the queue waiting for moderator approval."
              : "No user reviews are recorded in the database system."}
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <Card key={review.id} className="bg-zinc-900/30 border-zinc-900 overflow-hidden shadow-md hover:border-zinc-800 transition-all">
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left segment: Media details & user */}
                  <div className="flex items-start gap-4">
                    {/* Tiny media poster preview */}
                    <div className="w-[50px] aspect-[2/3] shrink-0 bg-zinc-900 border border-zinc-850 rounded overflow-hidden hidden sm:block">
                      {review.media?.posterUrl ? (
                        <img
                          src={review.media.posterUrl}
                          alt={review.media.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl bg-zinc-900">🎬</div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link href={`/browse/${review.media?.slug}`} className="font-bold text-white hover:text-red-500 transition-colors text-sm md:text-base leading-none">
                          {review.media?.title ?? "Unknown Title"}
                        </Link>
                        <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] uppercase hover:bg-red-500/10 scale-90">
                          {review.media?.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-500 font-light">
                        by <span className="font-semibold text-zinc-300">{review.user.name || "Anonymous"}</span> &bull; {new Date(review.createdAt).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  {/* Right segment: Rating & Approval Status */}
                  <div className="flex items-center gap-3 self-start md:self-center">
                    <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-850/80 px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-400">
                      <Star className="h-3.5 w-3.5 fill-amber-400" />
                      <span>{review.rating}/10</span>
                    </div>

                    <Badge
                      className={`text-[9px] font-bold uppercase tracking-wider py-0.5 px-2.5 ${
                        review.status === "APPROVED"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : review.status === "REJECTED"
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {review.status}
                    </Badge>
                  </div>
                </div>

                {/* Review Message content */}
                <div className="bg-zinc-950/40 border border-zinc-900 p-4 rounded-xl space-y-3">
                  <p className="text-zinc-300 text-xs md:text-sm leading-relaxed font-light whitespace-pre-line">
                    {review.content}
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    {review.spoilerWarning && (
                      <Badge variant="outline" className="border-red-550/30 text-red-400 bg-red-950/10 text-[9px] hover:bg-red-950/10 font-medium">
                        <AlertTriangle className="h-3 w-3 mr-1 inline" />
                        SPOILER WARNING
                      </Badge>
                    )}
                    {review.tags.map((tag) => (
                      <Badge key={tag} className="bg-zinc-900 border-zinc-850 text-zinc-400 text-[10px] hover:bg-zinc-900 font-normal">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Actions bottom bar */}
                <div className="flex items-center gap-2.5 pt-2">
                  {review.status !== "APPROVED" && (
                    <Button
                      size="sm"
                      onClick={() => approveMutation.mutate(review.id)}
                      disabled={approveMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 h-9 font-semibold text-xs gap-1.5 shadow-md shadow-emerald-950/20"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Approve</span>
                    </Button>
                  )}
                  {review.status !== "REJECTED" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => rejectMutation.mutate(review.id)}
                      disabled={rejectMutation.isPending}
                      className="bg-red-650 hover:bg-red-700 text-white rounded-lg px-4 h-9 font-semibold text-xs gap-1.5 shadow-md shadow-red-950/20"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Reject</span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination control */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-6 border-t border-zinc-900">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="border-zinc-800 hover:bg-zinc-900 text-zinc-300 gap-1 rounded-lg h-9 text-xs"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous</span>
          </Button>
          <span className="text-xs text-zinc-500 font-semibold font-mono">
            Page {meta.page} / {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="border-zinc-800 hover:bg-zinc-900 text-zinc-300 gap-1 rounded-lg h-9 text-xs"
          >
            <span>Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
