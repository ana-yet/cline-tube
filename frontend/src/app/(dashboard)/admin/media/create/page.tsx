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
 * Admin Create Media Page
 *
 * Form to create a new movie/series with Cloudinary image upload.
 * Image is uploaded as multipart/form-data alongside the form fields.
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
  genreIds: string[];
}

export default function CreateMediaPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const { isAuthenticated } = useAuth();

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
      // Build multipart/form-data
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
        apiError.response?.data?.error?.message || "Failed to create media",
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
    if (selectedGenres.length === 0) {
      setError("Select at least one genre");
      return;
    }
    createMutation.mutate(data);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Add New Media</h1>
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Media Details</CardTitle>
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
                <Label htmlFor="type">Type</Label>
                <Select
                  defaultValue="MOVIE"
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
                <Label htmlFor="pricingType">Pricing</Label>
                <Select
                  defaultValue="FREE"
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
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                {...register("title", { required: "Title is required" })}
              />
              {errors.title && (
                <p className="text-sm text-destructive">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="synopsis">Synopsis</Label>
              <Textarea
                id="synopsis"
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
                <Label htmlFor="director">Director</Label>
                <Input
                  id="director"
                  {...register("director", {
                    required: "Director is required",
                  })}
                />
                {errors.director && (
                  <p className="text-sm text-destructive">
                    {errors.director.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="releaseYear">Release Year</Label>
                <Input
                  id="releaseYear"
                  type="number"
                  {...register("releaseYear", {
                    valueAsNumber: true,
                    required: "Year is required",
                  })}
                />
                {errors.releaseYear && (
                  <p className="text-sm text-destructive">
                    {errors.releaseYear.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cast">Cast (comma-separated)</Label>
              <Input
                id="cast"
                placeholder="Actor One, Actor Two, ..."
                {...register("cast", { required: "Cast is required" })}
              />
              {errors.cast && (
                <p className="text-sm text-destructive">
                  {errors.cast.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="streamingLink">Streaming Link</Label>
              <Input
                id="streamingLink"
                placeholder="https://..."
                {...register("streamingLink", {
                  required: "Streaming link is required",
                })}
              />
              {errors.streamingLink && (
                <p className="text-sm text-destructive">
                  {errors.streamingLink.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Poster Image</Label>
              <ImageUpload onFileSelect={setImageFile} error={imageError} />
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
              {selectedGenres.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Select at least one genre
                </p>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={
                  createMutation.isPending || selectedGenres.length === 0
                }
              >
                {createMutation.isPending ? "Creating..." : "Create Media"}
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
