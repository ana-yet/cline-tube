"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api";
import type { ApiResponse, MediaSummary, PaginatedResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Plus, Film, Star, MessageSquare, Edit2, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

export default function AdminMediaPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "media", { search, page }],
    queryFn: async () => {
      const { data } = await apiClient.get<
        ApiResponse<MediaSummary[]> & {
          meta: PaginatedResponse<MediaSummary>["meta"];
        }
      >("/media", {
        params: { search: search || undefined, page, limit: 20 },
      });
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/media/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "media"] });
      queryClient.invalidateQueries({ queryKey: ["media"] });
    },
  });

  const media = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Film className="h-6 w-6 text-red-500" />
            <span>Media Library</span>
          </h1>
          <p className="text-zinc-500 text-xs mt-1">
            Create, update, and manage title releases and parameters across the catalog.
          </p>
        </div>
        <Link href="/admin/media/create" className="self-start sm:self-center">
          <Button className="bg-red-650 hover:bg-red-700 text-white rounded-xl font-semibold text-xs h-10 px-4 gap-1.5 shadow-lg shadow-red-950/20">
            <Plus className="h-4 w-4" />
            <span>Add Media Title</span>
          </Button>
        </Link>
      </div>

      <Card className="bg-zinc-900/30 border-zinc-900 overflow-hidden shadow-lg">
        {/* Search header bar */}
        <div className="p-4 md:p-6 border-b border-zinc-900/80 bg-zinc-900/10">
          <div className="relative max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search catalog titles..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10 bg-zinc-950 border-zinc-850 h-10 text-white placeholder-zinc-500"
            />
          </div>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
            </div>
          ) : media.length === 0 ? (
            <div className="py-20 text-center text-zinc-500 text-sm italic font-light">
              No media titles found. Try modifying your search or create a new release.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-900 text-zinc-500 font-bold uppercase tracking-wider bg-zinc-900/10">
                    <th className="py-4 px-6">Title Info</th>
                    <th className="py-4 px-6">Type</th>
                    <th className="py-4 px-6">Pricing</th>
                    <th className="py-4 px-6">Release Year</th>
                    <th className="py-4 px-6">Average Rating</th>
                    <th className="py-4 px-6">Reviews</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/60">
                  {media.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-900/20 transition-colors">
                      <td className="py-4 px-6">
                        <div className="space-y-0.5">
                          <p className="font-bold text-zinc-200 text-sm">{item.title}</p>
                          <p className="text-[10px] text-zinc-500">
                            {item.genres.map((g) => g.genre.name).join(", ")}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <Badge
                          className={`text-[9px] font-bold tracking-wider py-0.5 px-2 ${
                            item.type === "MOVIE"
                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                              : "bg-zinc-800 text-zinc-400 border border-zinc-750"
                          }`}
                        >
                          {item.type}
                        </Badge>
                      </td>
                      <td className="py-4 px-6">
                        <Badge
                          className={`text-[9px] font-bold tracking-wider py-0.5 px-2 ${
                            item.pricingType === "FREE"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-550/15 text-amber-400 border border-amber-550/20"
                          }`}
                        >
                          {item.pricingType}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-zinc-400 font-medium">{item.releaseYear}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1 text-amber-400 font-bold">
                          <Star className="h-3.5 w-3.5 fill-amber-400" />
                          <span>{item.averageRating || "0.0"}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1 text-zinc-400 font-medium">
                          <MessageSquare className="h-3.5 w-3.5 text-zinc-550" />
                          <span>{item.reviewsCount}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <Link href={`/admin/media/${item.id}/edit`}>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8.5 w-8.5 rounded-lg border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white"
                              title="Edit Media"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => {
                              if (confirm(`Are you sure you want to permanently delete "${item.title}"?`)) {
                                deleteMutation.mutate(item.id);
                              }
                            }}
                            className="h-8.5 w-8.5 rounded-lg bg-red-650 hover:bg-red-750 text-white"
                            title="Delete Media"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Table pagination bar */}
          {meta && meta.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 md:p-6 border-t border-zinc-900/80 bg-zinc-900/5">
              <p className="text-zinc-500 text-xs font-medium">
                Showing page <span className="text-zinc-300 font-bold">{meta.page}</span> of <span className="text-zinc-300 font-bold">{meta.totalPages}</span> ({meta.total} releases total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="border-zinc-800 hover:bg-zinc-900 text-zinc-300 rounded-lg h-9 text-xs gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="border-zinc-800 hover:bg-zinc-900 text-zinc-300 rounded-lg h-9 text-xs gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
