"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api";
import type { ApiResponse, MediaSummary, PaginatedResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Browse Page — Public Media Catalog
 *
 * Displays media grid with:
 * - Search by title/director/synopsis
 * - Filter by genre, type, pricing, year
 * - Sort by latest, top-rated, popular, most-reviewed
 * - Pagination
 */

export default function BrowsePage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>("all");
  const [pricingType, setPricingType] = useState<string>("all");
  const [sortBy, setSortBy] = useState("latest");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["media", "list", { search, type, pricingType, sortBy, page }],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page,
        limit: 12,
        sortBy,
      };
      if (search) params.search = search;
      if (type !== "all") params.type = type;
      if (pricingType !== "all") params.pricingType = pricingType;

      const { data } = await apiClient.get<
        ApiResponse<MediaSummary[]> & {
          meta: PaginatedResponse<MediaSummary>["meta"];
        }
      >("/media", { params });
      return data;
    },
  });

  const media = data?.data ?? [];
  const meta = data?.meta;

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Browse Movies & Series</h1>
        <p className="text-muted-foreground">
          Discover your next favorite watch
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-8">
        <Input
          placeholder="Search by title, director..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        <Select
          value={type}
          onValueChange={(v) => {
            if (v) {
              setType(v);
              setPage(1);
            }
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="MOVIE">Movies</SelectItem>
            <SelectItem value="SERIES">Series</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={pricingType}
          onValueChange={(v) => {
            if (v) {
              setPricingType(v);
              setPage(1);
            }
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Pricing" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pricing</SelectItem>
            <SelectItem value="FREE">Free</SelectItem>
            <SelectItem value="PREMIUM">Premium</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={sortBy}
          onValueChange={(v) => {
            if (v) {
              setSortBy(v);
              setPage(1);
            }
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">Latest</SelectItem>
            <SelectItem value="top-rated">Top Rated</SelectItem>
            <SelectItem value="popular">Most Popular</SelectItem>
            <SelectItem value="most-reviewed">Most Reviewed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : media.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-lg text-muted-foreground">No media found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {media.map((item) => (
            <Link key={item.id} href={`/browse/${item.slug}`}>
              <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
                <div className="aspect-[2/3] bg-muted flex items-center justify-center">
                  {item.posterUrl ? (
                    <img
                      src={item.posterUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl">🎬</span>
                  )}
                </div>
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-semibold line-clamp-1">{item.title}</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {item.type}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {item.releaseYear}
                    </Badge>
                    {item.pricingType === "PREMIUM" && (
                      <Badge className="text-xs">Premium</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>⭐ {item.averageRating}</span>
                    <span>•</span>
                    <span>{item.reviewsCount} reviews</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {item.genres.map((g) => g.genre.name).join(", ")}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-10">
          <Button
            variant="outline"
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
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </main>
  );
}
