"use client";

import Link from "next/link";
import { Star, Eye, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import type { MediaSummary } from "@/types";

/**
 * MediaCard Component
 *
 * Reusable card for displaying media items across:
 * - Browse page grid
 * - Related media section
 * - Watchlist grid
 * - Homepage carousels
 *
 * Features: poster with fallback, rating badge, year badge,
 * type/pricing badges, hover animation, responsive sizing.
 */

interface MediaCardProps {
  item: MediaSummary;
  /** Disable hover animation (useful inside carousels) */
  disableAnimation?: boolean;
}

export function MediaCard({ item, disableAnimation = false }: MediaCardProps) {
  const card = (
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

          {/* Hover overlay with view button */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <Button
              size="sm"
              className="bg-red-650 hover:bg-red-700 rounded-full h-10 w-10 p-0 shadow-lg shadow-red-950/40 translate-y-4 group-hover/card:translate-y-0 transition-transform duration-300"
            >
              <Eye className="h-4.5 w-4.5 text-white fill-white/10" />
            </Button>
          </div>

          {/* Rating badge */}
          <div className="absolute top-3 right-3 bg-zinc-950/80 backdrop-blur-md border border-zinc-800 px-2 py-0.5 rounded-full text-xs font-semibold text-amber-400 flex items-center gap-1 shadow-sm">
            <Star className="h-3.5 w-3.5 fill-amber-400" />
            <span>{item.averageRating || "N/A"}</span>
          </div>

          {/* Year badge */}
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
  );

  if (disableAnimation) {
    return <div className="group/card">{card}</div>;
  }

  return <div className="group/card">{card}</div>;
}
