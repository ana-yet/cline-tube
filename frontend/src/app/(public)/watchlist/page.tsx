"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api";
import type { ApiResponse, MediaSummary } from "@/types";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Film, Star, ArrowRight, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function WatchlistPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
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

  const removeMutation = useMutation({
    mutationFn: async (mediaId: string) => {
      await apiClient.delete(`/watchlist/${mediaId}`);
    },
    onMutate: async (mediaId) => {
      await queryClient.cancelQueries({ queryKey: ["watchlist"] });
      const prev = queryClient.getQueryData<MediaSummary[]>(["watchlist"]);
      queryClient.setQueryData<MediaSummary[]>(["watchlist"], (old) =>
        old?.filter((item) => item.id !== mediaId),
      );
      return { prev };
    },
    onError: (_err, _mediaId, context) => {
      if (context?.prev) {
        queryClient.setQueryData(["watchlist"], context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    },
  });

  if (authLoading) {
    return (
      <main className="container mx-auto px-4 py-16 text-center min-h-[60vh] flex items-center justify-center bg-zinc-950">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="container mx-auto px-4 py-24 text-center min-h-[60vh] flex flex-col items-center justify-center space-y-6 bg-zinc-950">
        <div className="h-16 w-16 bg-red-550/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center justify-center">
          <Heart className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Your Watchlist
        </h1>
        <p className="text-zinc-500 max-w-sm">
          Keep track of movies and series you want to watch. Sign in to your
          account to save your watchlist across devices.
        </p>
        <Link href="/login">
          <Button className="bg-red-650 hover:bg-red-700 text-white font-semibold rounded-xl h-11 px-6 shadow-md hover:shadow-red-600/10">
            Sign In to CineTube
          </Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-12 max-w-7xl min-h-[70vh] bg-zinc-950">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 border-b border-zinc-900 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Heart className="h-7 w-7 text-red-500 fill-red-500" />
            <span>My Watchlist</span>
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Manage the list of cinematic releases you plan to watch.
          </p>
        </div>
        {data && data.length > 0 && (
          <span className="text-xs text-zinc-500 font-semibold self-start md:self-end">
            {data.length} {data.length === 1 ? "title" : "titles"} saved
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] rounded-2xl bg-zinc-900 animate-pulse border border-zinc-800/40"
            />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-zinc-900 rounded-3xl bg-zinc-900/15 max-w-lg mx-auto">
          <Heart className="h-10 w-10 text-zinc-650 mx-auto mb-4 stroke-1" />
          <h2 className="text-xl font-bold text-zinc-300">
            Your Watchlist is Empty
          </h2>
          <p className="text-zinc-500 text-sm mt-1 max-w-xs mx-auto leading-relaxed">
            There are no movies or series saved. Explore our catalog to curate
            your viewing plan.
          </p>
          <Link href="/browse" className="inline-block mt-6">
            <Button className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 gap-1.5 h-11">
              <span>Browse Catalog</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          <AnimatePresence>
            {data.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="group relative flex flex-col justify-between h-full"
              >
                <div className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-900 shadow-md group-hover:border-red-500/50 group-hover:shadow-lg transition-all duration-300">
                  {item.posterUrl ? (
                    <img
                      src={item.posterUrl}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl bg-zinc-900 text-zinc-600">
                      🎬
                    </div>
                  )}

                  {/* Remove hover button overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={(e) => {
                        e.preventDefault();
                        removeMutation.mutate(item.id);
                      }}
                      className="h-10 w-10 rounded-full shadow-lg shadow-black/45"
                      title="Remove from Watchlist"
                    >
                      <Trash2 className="h-4.5 w-4.5 text-white" />
                    </Button>
                  </div>

                  {/* Star Rating Badge */}
                  <div className="absolute top-3 right-3 bg-zinc-950/80 backdrop-blur-md border border-zinc-800 px-2 py-0.5 rounded-full text-xs font-semibold text-amber-400 flex items-center gap-1 shadow-sm">
                    <Star className="h-3.5 w-3.5 fill-amber-400" />
                    <span>{item.averageRating || "N/A"}</span>
                  </div>
                </div>

                <div className="mt-3 space-y-1 px-1">
                  <Link href={`/browse/${item.slug}`}>
                    <h3 className="font-bold text-sm text-zinc-200 truncate hover:text-red-500 transition-colors">
                      {item.title}
                    </h3>
                  </Link>
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] hover:bg-red-500/10 py-0 uppercase">
                      {item.type}
                    </Badge>
                    <span>{item.releaseYear}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </main>
  );
}
