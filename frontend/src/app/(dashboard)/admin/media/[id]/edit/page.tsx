"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api";
import type { ApiResponse, Media } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/image-upload";
import { useAuth } from "@/providers/auth-provider";

/**
 * Admin Edit Media Page
 *
 * Pre-filled form to update an existing media entry.
 * Supports replacing the poster image via Cloudinary upload.
 */

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
}

export default function EditMediaPage() {
  const router = useRouter();
  const params = useParams();
  const mediaId = params.id as string;
  const [error, setError] = useState<string | null>(null);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [currentPosterUrl, setCurrentPosterUrl] = useState<string | null>(null);
  const [posterRemoved, setPosterRemoved] = useState(false);

  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Fetch genres
  const { data: genresData } = useQuery({
    queryKey: ["genres"],
    queryFn: async () => {
      const { data } =
        await apiClient.get<ApiResponse<{ genres: GenreOption[] }>>(
          "/media/genres",
        );
      return data.data.genres;
    },
    enabled: isAuthenticated,
  });

  // Fetch existing media data
  const { data: mediaData, isLoading: isLoadingMedia } = useQuery({
    queryKey: ["admin", "media", mediaId],
    queryFn: async () => {
      const { data } = await apiClient.get<
        ApiResponse<{
          media: Media & { genres: { genre: { id: string; name: string } }[] };
        }>
      >(`/media/by-id/${mediaId}`);
      return data.data.media;
    },
    enabled: !!mediaId && isAuthenticated,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<MediaFormData>({
    defaultValues: {
      title: "",
      synopsis: "",
      type: "MOVIE",
      pricingType: "FREE",
      streamingLink: "",
      releaseYear: 2024,
      director: "",
      cast: "",
    },
  });

  // Pre-fill form when data loads
  useEffect(() => {
    if (mediaData) {
      reset({
        title: mediaData.title,
        synopsis: mediaData.synopsis,
        type: mediaData.type as "MOVIE" | "SERIES",
        pricingType: mediaData.pricingType as "FREE" | "PREMIUM",
        streamingLink: mediaData.streamingLink,
        releaseYear: mediaData.releaseYear,
        director: mediaData.director,
        cast: mediaData.cast.join(", "),
      });
      setSelectedGenres(mediaData.genres.map((g) => g.genre.id));
      setCurrentPosterUrl(mediaData.posterUrl);
    }
  }, [mediaData, reset]);

  const updateMutation = useMutation({
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
            .filter(Boolean),
        ),
      );
      formData.append("genreIds", JSON.stringify(selectedGenres));

      if (imageFile) {
        formData.append("image", imageFile);
      }
      if (posterRemoved) {
        formData.append("posterRemoved", "true");
      }

      await apiClient.put(`/media/${mediaId}`, formData, {
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
        apiError.response?.data?.error?.message || "Failed to update media",
      );
    },
  });

  const toggleGenre = (genreId: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genreId)
        ? prev.filter((id) => id !== genreId)
        : [...prev, genreId],
    );
  };

  const onSubmit = (data: MediaFormData) => {
    setError(null);
    updateMutation.mutate(data);
  };

  if (authLoading || isLoadingMedia) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Media</h1>
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{mediaData?.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={watch("type")}
                  onValueChange={(v) =>
                    setValue("type", v as "MOVIE" | "SERIES")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MOVIE">Movie</SelectItem>
                    <SelectItem value="SERIES">Series</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Pricing</Label>
                <Select
                  value={watch("pricingType")}
                  onValueChange={(v) =>
                    setValue("pricingType", v as "FREE" | "PREMIUM")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FREE">Free</SelectItem>
                    <SelectItem value="PREMIUM">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                {...register("title", { required: "Title is required" })}
              />
              {errors.title && (
                <p className="text-sm text-destructive">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Synopsis</Label>
              <Textarea
                rows={4}
                {...register("synopsis", { required: "Synopsis is required" })}
              />
              {errors.synopsis && (
                <p className="text-sm text-destructive">
                  {errors.synopsis.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Director</Label>
                <Input
                  {...register("director", {
                    required: "Director is required",
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Release Year</Label>
                <Input
                  type="number"
                  {...register("releaseYear", { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cast (comma-separated)</Label>
              <Input {...register("cast")} />
            </div>

            <div className="space-y-2">
              <Label>Streaming Link</Label>
              <Input {...register("streamingLink", { required: "Required" })} />
            </div>

            <div className="space-y-2">
              <Label>Poster Image</Label>
              <ImageUpload
                currentImageUrl={posterRemoved ? null : currentPosterUrl}
                onFileSelect={(file) => {
                  setImageFile(file);
                  if (file) setPosterRemoved(false);
                }}
                onRemove={() => {
                  setPosterRemoved(true);
                  setImageFile(null);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Genres</Label>
              <div className="flex flex-wrap gap-2">
                {genresData?.map((genre) => (
                  <Badge
                    key={genre.id}
                    variant={
                      selectedGenres.includes(genre.id) ? "default" : "outline"
                    }
                    className="cursor-pointer"
                    onClick={() => toggleGenre(genre.id)}
                  >
                    {genre.name}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
