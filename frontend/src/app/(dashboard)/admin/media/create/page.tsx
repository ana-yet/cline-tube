"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api";
import type { ApiResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ImageUpload } from "@/components/image-upload";
import { useAuth } from "@/providers/auth-provider";
import { Film, AlertCircle } from "lucide-react";
import Link from "next/link";

interface GenreOption {
  id: string;
  name: string;
}

interface MediaFormData {
  title: string;
  synopsis: string;
  type: "MOVIE" | "SERIES";
  pricingType: "FREE" | "PREMIUM";
  streamingLink: string;
  releaseYear: number;
  director: string;
  cast: string;
  genreIds: string[];
}

export default function CreateMediaPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [backdropFile, setBackdropFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const { isAuthenticated } = useAuth();

  const { data: genresData } = useQuery({
    queryKey: ["genres"],
    queryFn: async () => {
      const { data } =
        await apiClient.get<ApiResponse<{ genres: GenreOption[] }>>(
          "/media/genres"
        );
      return data.data.genres;
    },
    enabled: isAuthenticated,
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<MediaFormData>({
    defaultValues: {
      type: "MOVIE",
      pricingType: "FREE",
      releaseYear: new Date().getFullYear(),
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: MediaFormData) => {
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("synopsis", data.synopsis);
      formData.append("type", data.type);
      formData.append("pricingType", data.pricingType);
      formData.append("streamingLink", data.streamingLink);
      formData.append("releaseYear", String(data.releaseYear));
      formData.append("director", data.director);
      formData.append(
        "cast",
        JSON.stringify(
          data.cast
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        )
      );
      formData.append("genreIds", JSON.stringify(selectedGenres));

      if (imageFile) {
        formData.append("image", imageFile);
      }
      if (backdropFile) {
        formData.append("backdropImage", backdropFile);
      }

      await apiClient.post("/media", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      router.push("/admin/media");
    },
    onError: (err: unknown) => {
      const apiError = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      setError(
        apiError.response?.data?.error?.message || "Failed to create media"
      );
    },
  });

  const toggleGenre = (genreId: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genreId)
        ? prev.filter((id) => id !== genreId)
        : [...prev, genreId]
    );
  };

  const onSubmit = (data: MediaFormData) => {
    setError(null);
    if (selectedGenres.length === 0) {
      setError("Select at least one genre parameter");
      return;
    }
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-8">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Film className="h-6 w-6 text-red-500" />
            <span>Add New Title</span>
          </h1>
          <p className="text-zinc-500 text-xs mt-1">
            Register a movie or series release to catalog, configure streams and upload artwork.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="border-zinc-800 hover:bg-zinc-900 text-zinc-300 h-10 rounded-xl"
        >
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <Alert variant="destructive" className="border-red-500/20 bg-red-950/20">
            <AlertDescription className="flex items-center gap-2 text-xs">
              <AlertCircle className="h-4.5 w-4.5 text-red-500" />
              <span>{error}</span>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start">
          {/* Left Column: Parameters & Poster */}
          <div className="space-y-6">
            <Card className="bg-zinc-900/30 border-zinc-900 overflow-hidden shadow-lg p-5 space-y-5">
              <h3 className="font-bold text-xs uppercase text-zinc-500 tracking-wider">Release Parameters</h3>
              
              {/* Type Selection */}
              <div className="space-y-2">
                <Label htmlFor="type" className="text-xs text-zinc-400 font-semibold">Title Type</Label>
                <Select
                  defaultValue="MOVIE"
                  onValueChange={(v) => setValue("type", v as "MOVIE" | "SERIES")}
                >
                  <SelectTrigger className="bg-zinc-950 border-zinc-850 h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-zinc-900 text-white text-xs">
                    <SelectItem value="MOVIE">Movie</SelectItem>
                    <SelectItem value="SERIES">Series</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Pricing Selection */}
              <div className="space-y-2">
                <Label htmlFor="pricingType" className="text-xs text-zinc-400 font-semibold">Tier Pricing</Label>
                <Select
                  defaultValue="FREE"
                  onValueChange={(v) => setValue("pricingType", v as "FREE" | "PREMIUM")}
                >
                  <SelectTrigger className="bg-zinc-950 border-zinc-850 h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-zinc-900 text-white text-xs">
                    <SelectItem value="FREE">Free Pass</SelectItem>
                    <SelectItem value="PREMIUM">Premium CinePass</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Year Selection */}
              <div className="space-y-2">
                <Label htmlFor="releaseYear" className="text-xs text-zinc-400 font-semibold">Release Year</Label>
                <Input
                  id="releaseYear"
                  type="number"
                  {...register("releaseYear", {
                    valueAsNumber: true,
                    required: "Year is required",
                  })}
                  className="bg-zinc-950 border-zinc-850 h-10 text-xs text-white"
                />
                {errors.releaseYear && (
                  <p className="text-[10px] text-red-500">{errors.releaseYear.message}</p>
                )}
              </div>

              {/* Poster Image */}
              <div className="space-y-2.5">
                <Label className="text-xs text-zinc-400 font-semibold">Poster Artwork</Label>
                <ImageUpload onFileSelect={setImageFile} error={imageError} />
              </div>

              {/* Backdrop Image */}
              <div className="space-y-2.5">
                <Label className="text-xs text-zinc-400 font-semibold">
                  Backdrop Image
                </Label>
                <p className="text-[10px] text-zinc-500 leading-relaxed">
                  Wide hero image shown on the movie details page. Recommended
                  16:9 aspect ratio.
                </p>
                <ImageUpload
                  variant="backdrop"
                  onFileSelect={setBackdropFile}
                />
              </div>
            </Card>
          </div>

          {/* Right Column: Descriptions & Details */}
          <div className="space-y-6">
            <Card className="bg-zinc-900/30 border-zinc-900 shadow-lg p-6 space-y-6">
              <h3 className="font-bold text-xs uppercase text-zinc-500 tracking-wider">Descriptive Information</h3>
              
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-xs text-zinc-400 font-semibold">Title Name</Label>
                <Input
                  id="title"
                  placeholder="e.g. Inception"
                  {...register("title", { required: "Title name is required" })}
                  className="bg-zinc-950 border-zinc-850 h-11 text-sm text-white"
                />
                {errors.title && (
                  <p className="text-xs text-red-500">{errors.title.message}</p>
                )}
              </div>

              {/* Synopsis */}
              <div className="space-y-2">
                <Label htmlFor="synopsis" className="text-xs text-zinc-400 font-semibold">Plot Synopsis</Label>
                <Textarea
                  id="synopsis"
                  rows={5}
                  placeholder="Provide a compelling overview of the cinematic release..."
                  {...register("synopsis", { required: "Synopsis plot is required" })}
                  className="bg-zinc-950 border-zinc-850 text-sm text-white resize-none"
                />
                {errors.synopsis && (
                  <p className="text-xs text-red-500">{errors.synopsis.message}</p>
                )}
              </div>

              {/* Director & Cast */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="director" className="text-xs text-zinc-400 font-semibold">Director</Label>
                  <Input
                    id="director"
                    placeholder="e.g. Christopher Nolan"
                    {...register("director", { required: "Director is required" })}
                    className="bg-zinc-950 border-zinc-850 h-11 text-sm text-white"
                  />
                  {errors.director && (
                    <p className="text-xs text-red-500">{errors.director.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cast" className="text-xs text-zinc-400 font-semibold">Cast List (comma-separated)</Label>
                  <Input
                    id="cast"
                    placeholder="e.g. Leonardo DiCaprio, Joseph Gordon-Levitt"
                    {...register("cast", { required: "Cast is required" })}
                    className="bg-zinc-950 border-zinc-850 h-11 text-sm text-white"
                  />
                  {errors.cast && (
                    <p className="text-xs text-red-500">{errors.cast.message}</p>
                  )}
                </div>
              </div>

              {/* Streaming Link */}
              <div className="space-y-2">
                <Label htmlFor="streamingLink" className="text-xs text-zinc-400 font-semibold">Streaming Link URL</Label>
                <Input
                  id="streamingLink"
                  placeholder="https://streamingprovider.com/watch/slug"
                  {...register("streamingLink", { required: "Streaming URL is required" })}
                  className="bg-zinc-950 border-zinc-850 h-11 text-sm text-white"
                />
                {errors.streamingLink && (
                  <p className="text-xs text-red-500">{errors.streamingLink.message}</p>
                )}
              </div>

              {/* Genres Badge selectors */}
              <div className="space-y-3.5 pt-2">
                <Label className="text-xs text-zinc-400 font-semibold flex items-center gap-1.5">
                  <span>Genres Classification</span>
                  <span className="text-[10px] text-zinc-550 font-normal italic">(select at least one)</span>
                </Label>
                <div className="flex flex-wrap gap-2">
                  {genresData?.map((genre) => {
                    const isSelected = selectedGenres.includes(genre.id);
                    return (
                      <button
                        key={genre.id}
                        type="button"
                        onClick={() => toggleGenre(genre.id)}
                        className={`text-xs px-3.5 py-1.5 rounded-full border transition-all ${
                          isSelected
                            ? "bg-red-500/10 border-red-500/40 text-red-400 font-semibold"
                            : "border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
                        }`}
                      >
                        {genre.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Separator className="border-zinc-900/60" />

              {/* Submit Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={createMutation.isPending || selectedGenres.length === 0}
                  className="bg-red-650 hover:bg-red-700 text-white px-6 h-11 rounded-xl shadow-lg hover:shadow-red-600/10 font-semibold"
                >
                  {createMutation.isPending ? "Creating Release..." : "Create Release"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="border-zinc-800 hover:bg-zinc-900 text-zinc-300 h-11 rounded-xl"
                >
                  Cancel
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
