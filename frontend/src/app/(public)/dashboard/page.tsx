"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api";
import type { ApiResponse } from "@/types";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Film, Bookmark, Star, Clock, ArrowRight, Plus } from "lucide-react";

/**
 * User Dashboard Page
 *
 * Personal overview showing:
 * - Stats cards (reviews, watchlist, pending reviews)
 * - Recent reviews with status badges
 * - Quick actions
 */

interface DashboardData {
  reviewCount: number;
  watchlistCount: number;
  pendingReviews: number;
  recentReviews: {
    id: string;
    rating: number;
    content: string;
    status: string;
    createdAt: string;
    media: {
      id: string;
      title: string;
      slug: string;
      posterUrl: string | null;
    };
  }[];
}

export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const { data } =
        await apiClient.get<ApiResponse<DashboardData>>("/dashboard");
      return data.data;
    },
    enabled: isAuthenticated,
  });

  if (authLoading || isLoading) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
        <p className="text-muted-foreground mb-8">
          Sign in to view your dashboard
        </p>
        <Link href="/login">
          <Button>Sign In</Button>
        </Link>
      </main>
    );
  }

  const stats = data ?? {
    reviewCount: 0,
    watchlistCount: 0,
    pendingReviews: 0,
    recentReviews: [],
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-3xl font-bold mb-8">My Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Reviews
            </CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.reviewCount}</div>
            <Link
              href="/browse"
              className="text-xs text-primary hover:underline mt-1 inline-block"
            >
              Write a review →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Watchlist
            </CardTitle>
            <Bookmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.watchlistCount}</div>
            <Link
              href="/watchlist"
              className="text-xs text-primary hover:underline mt-1 inline-block"
            >
              View watchlist →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Reviews
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.pendingReviews}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting moderation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mb-10">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/browse">
              <Button variant="outline" size="sm">
                <Film className="h-4 w-4 mr-2" /> Browse Media
              </Button>
            </Link>
            <Link href="/watchlist">
              <Button variant="outline" size="sm">
                <Bookmark className="h-4 w-4 mr-2" /> My Watchlist
              </Button>
            </Link>
            <Link href="/profile">
              <Button variant="outline" size="sm">
                Edit Profile
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Reviews */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentReviews.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                You haven&apos;t written any reviews yet.
              </p>
              <Link href="/browse">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" /> Write Your First Review
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.recentReviews.map((review) => (
                <div key={review.id}>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-16 rounded bg-muted flex-shrink-0 overflow-hidden">
                      {review.media.posterUrl ? (
                        <img
                          src={review.media.posterUrl}
                          alt={review.media.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg">
                          🎬
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Link
                          href={`/browse/${review.media.slug}`}
                          className="font-medium text-sm hover:underline truncate"
                        >
                          {review.media.title}
                        </Link>
                        <Badge
                          variant={
                            review.status === "APPROVED"
                              ? "default"
                              : review.status === "PENDING"
                                ? "outline"
                                : "destructive"
                          }
                          className="text-[10px]"
                        >
                          {review.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <span>⭐ {review.rating}/10</span>
                        <span>•</span>
                        <span>
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {review.content}
                      </p>
                    </div>
                  </div>
                  <Separator className="mt-4" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
