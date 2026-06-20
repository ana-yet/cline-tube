"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api";
import type { ApiResponse, MediaSummary, PaginatedResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star, Search, SlidersHorizontal, Eye, Film, Grid, DollarSign, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Genre catalog for filtering
const GENRES = [
  "Action", "Comedy", "Drama", "Sci-Fi", "Thriller", 
  "Horror", "Romance", "Adventure", "Fantasy", "Mystery"
];

function BrowseContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Load initial states from URL params for search, genre, etc.
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [type, setType] = useState(searchParams.get("type") || "all");
  const [pricingType, setPricingType] = useState(searchParams.get("pricingType") || "all");
  const [genre, setGenre] = useState(searchParams.get("genre") || "");
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "latest");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  // Sync state with URL search params changes
  useEffect(() => {
    setSearch(searchParams.get("search") || "");
    setGenre(searchParams.get("genre") || "");
    setType(searchParams.get("type") || "all");
    setPricingType(searchParams.get("pricingType") || "all");
    setSortBy(searchParams.get("sortBy") || "latest");
    setPage(Number(searchParams.get("page")) || 1);
  }, [searchParams]);

  // Update URL search parameters helper
  const updateUrlParams = (newParams: Record<string, string | number | null>) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === null || val === "all" || val === "") {
        nextParams.delete(key);
      } else {
        nextParams.set(key, String(val));
      }
    });
    // Reset page to 1 on filter changes unless specifying page
    if (!newParams.page) {
      nextParams.delete("page");
    }
    router.push(`/browse?${nextParams.toString()}`);
  };

  const { data, isLoading } = useQuery({
    queryKey: ["media", "list", { search, type, pricingType, genre, sortBy, page }],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page,
        limit: 12,
        sortBy,
      };
      if (search) params.search = search;
      if (type !== "all") params.type = type;
      if (pricingType !== "all") params.pricingType = pricingType;
      if (genre) params.genre = genre;

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

  const handleResetFilters = () => {
    setSearch("");
    setType("all");
    setPricingType("all");
    setGenre("");
    setSortBy("latest");
    setPage(1);
    router.push("/browse");
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 border-b border-zinc-900 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Film className="h-7 w-7 text-red-500 fill-red-500/10" />
            <span>Discover Cinema</span>
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Browse, filter, and discover your next favorite movie or series from our catalog.
          </p>
        </div>
        
        {/* Mobile Filters Toggle & Sorting */}
        <div className="flex items-center gap-3 self-start md:self-end">
          <Button
            variant="outline"
            className="md:hidden border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300 text-xs py-5 px-4 gap-2"
            onClick={() => setShowFiltersMobile(!showFiltersMobile)}
          >
            <SlidersHorizontal className="h-4 w-4 text-red-500" />
            <span>Filters</span>
          </Button>

          <Select
            value={sortBy}
            onValueChange={(val) => {
              setSortBy(val || "latest");
              updateUrlParams({ sortBy: val || "latest" });
            }}
          >
            <SelectTrigger className="w-[170px] bg-zinc-900 border-zinc-800 text-zinc-300 h-10 focus:ring-red-500/20">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-300">
              <SelectItem value="latest">Latest Releases</SelectItem>
              <SelectItem value="top-rated">Highest Rated</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="most-reviewed">Most Reviewed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden lg:block space-y-6 self-start sticky top-24">
          <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <span className="font-bold text-zinc-200 text-sm flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-red-500" />
                Filters
              </span>
              {(search || type !== "all" || pricingType !== "all" || genre) && (
                <button
                  onClick={handleResetFilters}
                  className="text-xs text-red-500 hover:text-red-400 font-medium hover:underline transition-all"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Title Search */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Search</label>
              <div className="relative">
                <Input
                  placeholder="Title, director..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    updateUrlParams({ search: e.target.value });
                  }}
                  className="bg-zinc-900/60 border-zinc-800 text-zinc-100 pl-9 pr-4 h-10 rounded-lg placeholder:text-zinc-600 focus-visible:border-red-500 focus-visible:ring-red-500/20"
                />
                <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
              </div>
            </div>

            {/* Media Type */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                <Film className="h-3 w-3" /> Type
              </label>
              <div className="grid grid-cols-3 gap-1 bg-zinc-900/80 p-1 rounded-lg border border-zinc-850">
                {["all", "MOVIE", "SERIES"].map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setType(t);
                      updateUrlParams({ type: t });
                    }}
                    className={`py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      type === t
                        ? "bg-red-650 text-white shadow-sm"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {t === "all" ? "All" : t === "MOVIE" ? "Movies" : "Series"}
                  </button>
                ))}
              </div>
            </div>

            {/* Pricing Type */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Pricing
              </label>
              <div className="grid grid-cols-3 gap-1 bg-zinc-900/80 p-1 rounded-lg border border-zinc-850">
                {["all", "FREE", "PREMIUM"].map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setPricingType(p);
                      updateUrlParams({ pricingType: p });
                    }}
                    className={`py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      pricingType === p
                        ? "bg-red-650 text-white shadow-sm"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {p === "all" ? "All" : p === "FREE" ? "Free" : "Prem"}
                  </button>
                ))}
              </div>
            </div>

            {/* Genres list */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                <Grid className="h-3 w-3" /> Genres
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                {GENRES.map((g) => {
                  const isSelected = genre === g;
                  return (
                    <button
                      key={g}
                      onClick={() => {
                        const val = isSelected ? "" : g;
                        setGenre(val);
                        updateUrlParams({ genre: val });
                      }}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                        isSelected
                          ? "bg-red-500/10 border-red-500/40 text-red-400 font-semibold"
                          : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-white hover:border-zinc-700"
                      }`}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile slide-down filters panel */}
        <AnimatePresence>
          {showFiltersMobile && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 mb-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="font-bold text-sm text-zinc-200">Filters</span>
                <button
                  onClick={handleResetFilters}
                  className="text-xs text-red-500 font-semibold hover:underline"
                >
                  Reset
                </button>
              </div>

              {/* Title Search Mobile */}
              <div className="space-y-1">
                <label className="text-xs text-zinc-500 uppercase tracking-wider">Search</label>
                <Input
                  placeholder="Search by title, director..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    updateUrlParams({ search: e.target.value });
                  }}
                  className="bg-zinc-950 border-zinc-800 text-zinc-100"
                />
              </div>

              {/* Media Type Mobile */}
              <div className="space-y-1">
                <label className="text-xs text-zinc-500 uppercase tracking-wider">Type</label>
                <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-lg">
                  {["all", "MOVIE", "SERIES"].map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setType(t);
                        updateUrlParams({ type: t });
                      }}
                      className={`py-1 rounded text-xs transition-colors ${
                        type === t ? "bg-red-600 text-white font-medium" : "text-zinc-400"
                      }`}
                    >
                      {t === "all" ? "All" : t === "MOVIE" ? "Movies" : "Series"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Genres list Mobile */}
              <div className="space-y-2">
                <label className="text-xs text-zinc-500 uppercase tracking-wider">Genres</label>
                <div className="flex flex-wrap gap-1">
                  {GENRES.map((g) => {
                    const isSelected = genre === g;
                    return (
                      <button
                        key={g}
                        onClick={() => {
                          const val = isSelected ? "" : g;
                          setGenre(val);
                          updateUrlParams({ genre: val });
                        }}
                        className={`text-xs px-2.5 py-1 rounded-full border ${
                          isSelected
                            ? "bg-red-500/10 border-red-500/35 text-red-400"
                            : "border-zinc-800 bg-zinc-950 text-zinc-400"
                        }`}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Media Grid & Main Content */}
        <div className="lg:col-span-3 space-y-8">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[2/3] rounded-2xl bg-zinc-900 animate-pulse border border-zinc-800/40"
                />
              ))}
            </div>
          ) : media.length === 0 ? (
            <div className="text-center py-24 border border-zinc-900 border-dashed rounded-3xl bg-zinc-900/15">
              <Film className="h-10 w-10 text-zinc-600 mx-auto mb-4 stroke-1" />
              <p className="text-lg font-semibold text-zinc-400">No cinematic works found</p>
              <p className="text-zinc-600 text-sm mt-1 max-w-xs mx-auto">
                Try clearing your active filters or checking for typos in search queries.
              </p>
              <Button onClick={handleResetFilters} variant="outline" className="mt-6 border-zinc-850 bg-zinc-900 hover:bg-zinc-800">
                Clear Filters
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                {media.map((item) => (
                  <motion.div
                    key={item.id}
                    whileHover={{ y: -5, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="group/card"
                  >
                    <Link href={`/browse/${item.slug}`}>
                      <Card className="overflow-hidden bg-zinc-900/40 border-zinc-900 rounded-2xl hover:border-red-500/50 hover:shadow-lg hover:shadow-red-950/10 transition-all duration-300 h-full flex flex-col justify-between">
                        <div className="aspect-[2/3] bg-zinc-950 flex items-center justify-center relative overflow-hidden">
                          {item.posterUrl ? (
                            <img
                              src={item.posterUrl}
                              alt={item.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <span className="text-4xl text-zinc-700">🎬</span>
                          )}

                          {/* Glossy hover gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <Button size="sm" className="bg-red-650 hover:bg-red-700 rounded-full h-10 w-10 p-0 shadow-lg shadow-red-950/40 translate-y-4 group-hover/card:translate-y-0 transition-transform duration-300">
                              <Eye className="h-4.5 w-4.5 text-white fill-white/10" />
                            </Button>
                          </div>

                          {/* Star Rating Badge */}
                          <div className="absolute top-3 right-3 bg-zinc-950/80 backdrop-blur-md border border-zinc-800 px-2 py-0.5 rounded-full text-xs font-semibold text-amber-400 flex items-center gap-1 shadow-sm">
                            <Star className="h-3.5 w-3.5 fill-amber-400" />
                            <span>{item.averageRating || "N/A"}</span>
                          </div>

                          {/* Year Badge */}
                          <div className="absolute bottom-3 left-3 bg-zinc-950/80 backdrop-blur-md border border-zinc-800 px-2 py-0.5 rounded-full text-xs font-semibold text-zinc-300 flex items-center gap-1 shadow-sm">
                            <Calendar className="h-3 w-3 text-zinc-400" />
                            <span>{item.releaseYear}</span>
                          </div>
                        </div>

                        <CardContent className="p-4 space-y-2 border-t border-zinc-900/60 bg-zinc-900/20">
                          <div className="flex items-center justify-between gap-1">
                            <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] hover:bg-red-500/10">
                              {item.type}
                            </Badge>
                            {item.pricingType === "PREMIUM" && (
                              <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] hover:bg-amber-500/10">
                                Premium
                              </Badge>
                            )}
                          </div>
                          
                          <h3 className="font-bold text-sm text-zinc-200 line-clamp-1 group-hover/card:text-red-500 transition-colors">
                            {item.title}
                          </h3>
                          
                          <div className="flex items-center justify-between text-xs text-zinc-500">
                            <span>{item.reviewsCount} reviews</span>
                            <span className="truncate max-w-[100px] text-right font-light">
                              {item.genres.map((g) => g.genre.name).join(", ")}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* Pagination controls */}
              {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 border-t border-zinc-900 pt-8 mt-10">
                  <Button
                    variant="outline"
                    className="border-zinc-850 hover:bg-zinc-900 text-zinc-300 text-xs"
                    disabled={page <= 1}
                    onClick={() => {
                      setPage((p) => p - 1);
                      updateUrlParams({ page: page - 1 });
                    }}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-zinc-400 font-semibold">
                    Page {meta.page} of {meta.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    className="border-zinc-850 hover:bg-zinc-900 text-zinc-300 text-xs"
                    disabled={page >= meta.totalPages}
                    onClick={() => {
                      setPage((p) => p + 1);
                      updateUrlParams({ page: page + 1 });
                    }}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8 max-w-7xl text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent mx-auto" />
      </div>
    }>
      <BrowseContent />
    </Suspense>
  );
}
