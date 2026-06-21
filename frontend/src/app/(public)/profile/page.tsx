"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api";
import type { ApiResponse } from "@/types";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Calendar,
  Shield,
  Link as LinkIcon,
  Check,
  AlertCircle,
  Edit3,
} from "lucide-react";

// Inline social SVG icons — lucide-react no longer ships social media icons
const TwitterIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
const FacebookIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);
const GithubIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

interface ProfileData {
  id: string;
  name: string | null;
  email: string;
  role: string;
  image: string | null;
  emailVerified: string | null;
  createdAt: string;
  profile: {
    bio: string | null;
    favoriteGenres: string[];
    website: string | null;
    twitter: string | null;
    facebook: string | null;
    github: string | null;
  } | null;
  _count: {
    reviews: number;
    watchlist: number;
  };
}

const ALL_GENRES = [
  "Action",
  "Adventure",
  "Comedy",
  "Crime",
  "Drama",
  "Fantasy",
  "Horror",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Thriller",
  "Animation",
];

export default function ProfilePage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    name: "",
    bio: "",
    website: "",
    twitter: "",
    facebook: "",
    github: "",
  });
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } =
        await apiClient.get<ApiResponse<{ user: ProfileData }>>("/profile");
      return data.data.user;
    },
    enabled: isAuthenticated,
  });

  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const { data } = await apiClient.get<
        ApiResponse<{
          subscription: {
            tier: string;
            status: string;
            currentPeriodEnd: string;
          };
        }>
      >("/payments/subscription");
      return data.data.subscription;
    },
    enabled: isAuthenticated,
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post("/payments/cancel");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      await apiClient.put("/profile", {
        name: form.name,
        bio: form.bio || null,
        favoriteGenres: selectedGenres,
        website: form.website || null,
        twitter: form.twitter || null,
        facebook: form.facebook || null,
        github: form.github || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    },
    onError: (err: unknown) => {
      const apiError = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      setError(
        apiError.response?.data?.error?.message || "Failed to update profile",
      );
    },
  });

  const startEditing = () => {
    if (profile) {
      setForm({
        name: profile.name || "",
        bio: profile.profile?.bio || "",
        website: profile.profile?.website || "",
        twitter: profile.profile?.twitter || "",
        facebook: profile.profile?.facebook || "",
        github: profile.profile?.github || "",
      });
      setSelectedGenres(profile.profile?.favoriteGenres || []);
    }
    setEditing(true);
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre],
    );
  };

  if (authLoading || isLoading) {
    return (
      <main className="container mx-auto px-4 py-16 text-center min-h-[70vh] flex items-center justify-center bg-zinc-950">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
      </main>
    );
  }

  if (!isAuthenticated || !profile) {
    return (
      <main className="container mx-auto px-4 py-24 text-center min-h-[70vh] flex flex-col items-center justify-center space-y-6 bg-zinc-950">
        <div className="h-16 w-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center justify-center">
          <User className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Access Denied
        </h1>
        <p className="text-zinc-500 max-w-sm">
          Please sign in to view and manage your profile details, favorites, and
          account credentials.
        </p>
        <Link href="/login">
          <Button className="bg-red-600 hover:bg-red-700 text-white px-6">
            Sign In to CineTube
          </Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-12 max-w-6xl min-h-[80vh] bg-zinc-950">
      {/* Title */}
      <div className="mb-10 border-b border-zinc-900 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Account Settings
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Manage your public movie profile, preferences, and linked social
            media channels.
          </p>
        </div>
        {!editing && (
          <Button
            onClick={startEditing}
            className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 gap-1.5 h-10 px-4"
          >
            <Edit3 className="h-4 w-4" />
            <span>Edit Profile</span>
          </Button>
        )}
      </div>

      {success && (
        <Alert className="mb-6 border-emerald-500/30 bg-emerald-950/20 text-emerald-400">
          <AlertDescription className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            <span>Your settings have been saved successfully!</span>
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert
          variant="destructive"
          className="mb-6 border-red-500/20 bg-red-950/20"
        >
          <AlertDescription className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
        {/* Left column: Summary Card */}
        <div className="space-y-6">
          <Card className="bg-zinc-900/40 border-zinc-900 overflow-hidden shadow-lg">
            <div className="h-24 bg-gradient-to-r from-red-900/60 to-amber-800/40 relative" />
            <CardContent className="p-6 relative text-center -mt-12 space-y-4">
              {/* Profile Avatar */}
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 mx-auto flex items-center justify-center text-white text-2xl font-bold ring-4 ring-zinc-900 shadow-md">
                {profile.name ? profile.name.slice(0, 2).toUpperCase() : "US"}
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-lg text-white truncate">
                  {profile.name || "Anonymous User"}
                </h3>
                <span className="inline-flex items-center gap-1.5 bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  <Shield className="h-3 w-3" />
                  {profile.role}
                </span>
              </div>

              {/* Stats blocks */}
              <div className="grid grid-cols-3 gap-2 border-y border-zinc-900 py-4 mt-2">
                <div className="text-center">
                  <p className="text-2xl font-extrabold text-white">
                    {profile._count.reviews}
                  </p>
                  <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                    Reviews
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-extrabold text-white">
                    {profile._count.watchlist}
                  </p>
                  <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                    Watchlist
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-extrabold text-white">
                    {subscription?.tier || "FREE"}
                  </p>
                  <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                    Plan
                  </p>
                </div>
              </div>

              {/* User meta list */}
              <div className="space-y-2.5 text-xs text-zinc-500 text-left pt-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-zinc-600" />
                  <span className="truncate text-zinc-400">
                    {profile.email}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-zinc-600" />
                  <span className="text-zinc-400">
                    Joined{" "}
                    {new Date(profile.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                    })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social connections overview */}
          {!editing &&
            (profile.profile?.website ||
              profile.profile?.twitter ||
              profile.profile?.github ||
              profile.profile?.facebook) && (
              <Card className="bg-zinc-900/40 border-zinc-900 p-6 space-y-4">
                <h4 className="font-bold text-xs uppercase text-zinc-500 tracking-wider">
                  Social Channels
                </h4>
                <div className="space-y-3 text-xs">
                  {profile.profile.website && (
                    <a
                      href={profile.profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 text-zinc-400 hover:text-white transition-colors"
                    >
                      <LinkIcon className="h-4 w-4 text-zinc-600" />
                      <span className="truncate">
                        {profile.profile.website.replace(/^https?:\/\//, "")}
                      </span>
                    </a>
                  )}
                  {profile.profile.twitter && (
                    <div className="flex items-center gap-2.5 text-zinc-400">
                      <TwitterIcon className="h-4 w-4 text-zinc-600" />
                      <span>@{profile.profile.twitter.replace(/^@/, "")}</span>
                    </div>
                  )}
                  {profile.profile.github && (
                    <div className="flex items-center gap-2.5 text-zinc-400">
                      <GithubIcon className="h-4 w-4 text-zinc-600" />
                      <span>{profile.profile.github}</span>
                    </div>
                  )}
                  {profile.profile.facebook && (
                    <div className="flex items-center gap-2.5 text-zinc-400">
                      <FacebookIcon className="h-4 w-4 text-zinc-600" />
                      <span className="truncate">
                        {profile.profile.facebook}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            )}
        </div>

        {/* Subscription Card */}
        {subscription && (
          <Card className="bg-zinc-900/40 border-zinc-900 p-6 space-y-4">
            <h4 className="font-bold text-xs uppercase text-zinc-500 tracking-wider">
              Subscription
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-sm">Current Plan</span>
                <Badge
                  variant={subscription.tier === "FREE" ? "outline" : "default"}
                >
                  {subscription.tier}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-sm">Status</span>
                <span className="text-sm text-emerald-400">
                  {subscription.status}
                </span>
              </div>
              {subscription.tier !== "FREE" && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 text-sm">Renews</span>
                    <span className="text-sm text-zinc-300">
                      {new Date(
                        subscription.currentPeriodEnd,
                      ).toLocaleDateString()}
                    </span>
                  </div>
                  {subscription.status !== "CANCELED" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={() => cancelMutation.mutate()}
                      disabled={cancelMutation.isPending}
                    >
                      {cancelMutation.isPending
                        ? "Canceling..."
                        : "Cancel Subscription"}
                    </Button>
                  )}
                </>
              )}
              {subscription.tier === "FREE" && (
                <Link href="/pricing">
                  <Button
                    size="sm"
                    className="w-full bg-red-600 hover:bg-red-700"
                  >
                    Upgrade Plan
                  </Button>
                </Link>
              )}
            </div>
          </Card>
        )}

        {/* Right column: Edit/View forms */}
        <div className="space-y-6">
          {editing ? (
            <Card className="bg-zinc-900/30 border-zinc-900 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-white">
                  Edit Profile Details
                </CardTitle>
                <CardDescription className="text-zinc-500 text-xs">
                  Modify your personal details and favorite movie genres.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="edit-name"
                      className="text-zinc-400 text-xs font-semibold"
                    >
                      Display Name
                    </Label>
                    <Input
                      id="edit-name"
                      value={form.name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: e.target.value }))
                      }
                      className="bg-zinc-950 border-zinc-800 text-white h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400 text-xs font-semibold">
                      Email Address
                    </Label>
                    <Input
                      value={profile.email}
                      disabled
                      className="bg-zinc-900 border-zinc-800 text-zinc-500 h-11 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="edit-bio"
                    className="text-zinc-400 text-xs font-semibold"
                  >
                    Short Bio
                  </Label>
                  <Textarea
                    id="edit-bio"
                    value={form.bio}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, bio: e.target.value }))
                    }
                    rows={4}
                    placeholder="Tell other movie buffs about yourself, your favorite directors, etc..."
                    className="bg-zinc-950 border-zinc-800 text-white resize-none"
                  />
                </div>

                {/* Genre checklist */}
                <div className="space-y-3">
                  <Label className="text-zinc-400 text-xs font-semibold">
                    Favorite Genres
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_GENRES.map((genre) => {
                      const isSelected = selectedGenres.includes(genre);
                      return (
                        <button
                          key={genre}
                          type="button"
                          onClick={() => toggleGenre(genre)}
                          className={`text-xs px-3.5 py-1.5 rounded-full border transition-all ${
                            isSelected
                              ? "bg-red-500/10 border-red-500/40 text-red-400 font-semibold"
                              : "border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
                          }`}
                        >
                          {genre}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Separator className="border-zinc-900" />

                {/* Social media connections */}
                <div className="space-y-4">
                  <h4 className="font-bold text-xs uppercase text-zinc-500 tracking-wider">
                    Social Links
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="edit-website"
                        className="text-zinc-400 text-xs font-semibold"
                      >
                        Website URL
                      </Label>
                      <Input
                        id="edit-website"
                        value={form.website}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, website: e.target.value }))
                        }
                        placeholder="https://yourwebsite.com"
                        className="bg-zinc-950 border-zinc-800 text-white h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="edit-twitter"
                        className="text-zinc-400 text-xs font-semibold"
                      >
                        Twitter Username
                      </Label>
                      <Input
                        id="edit-twitter"
                        value={form.twitter}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, twitter: e.target.value }))
                        }
                        placeholder="@username"
                        className="bg-zinc-950 border-zinc-800 text-white h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="edit-github"
                        className="text-zinc-400 text-xs font-semibold"
                      >
                        GitHub Username
                      </Label>
                      <Input
                        id="edit-github"
                        value={form.github}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, github: e.target.value }))
                        }
                        placeholder="github_username"
                        className="bg-zinc-950 border-zinc-800 text-white h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="edit-facebook"
                        className="text-zinc-400 text-xs font-semibold"
                      >
                        Facebook URL
                      </Label>
                      <Input
                        id="edit-facebook"
                        value={form.facebook}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, facebook: e.target.value }))
                        }
                        placeholder="https://facebook.com/profile"
                        className="bg-zinc-950 border-zinc-800 text-white h-11"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-zinc-900">
                  <Button
                    onClick={() => updateMutation.mutate()}
                    disabled={updateMutation.isPending}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 h-11 rounded-xl shadow-lg font-semibold"
                  >
                    {updateMutation.isPending ? "Saving..." : "Save Settings"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditing(false)}
                    className="border-zinc-800 hover:bg-zinc-900 text-zinc-300 h-11 rounded-xl"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-zinc-900/30 border-zinc-900 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-900/60 pb-4">
                <div>
                  <CardTitle className="text-lg font-bold text-white">
                    Public Profile
                  </CardTitle>
                  <CardDescription className="text-zinc-500 text-xs">
                    Information visible to the CineTube community.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Bio info */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Biography
                  </h4>
                  <p className="text-zinc-300 text-sm leading-relaxed font-light">
                    {profile.profile?.bio ||
                      "No biography provided. Tell the community about your film and series tastes!"}
                  </p>
                </div>

                <Separator className="border-zinc-900" />

                {/* Genre badges list */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Favorite Genres
                  </h4>
                  {profile.profile?.favoriteGenres &&
                  profile.profile.favoriteGenres.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {profile.profile.favoriteGenres.map((g) => (
                        <Badge
                          key={g}
                          className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/15"
                        >
                          {g}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-zinc-500 text-xs italic font-light">
                      No genres selected yet. Edit your profile to select your
                      favorites.
                    </p>
                  )}
                </div>

                <Separator className="border-zinc-900" />

                {/* Social connections details */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Linked Social Accounts
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm pt-1">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <LinkIcon className="h-4 w-4 text-zinc-600 shrink-0" />
                      <span className="text-zinc-500 text-xs">Website:</span>
                      {profile.profile?.website ? (
                        <a
                          href={profile.profile.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline text-red-400 truncate"
                        >
                          {profile.profile.website.replace(/^https?:\/\//, "")}
                        </a>
                      ) : (
                        <span className="text-zinc-600 text-xs italic">
                          Not linked
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-zinc-400">
                      <TwitterIcon className="h-4 w-4 text-zinc-600 shrink-0" />
                      <span className="text-zinc-500 text-xs">Twitter:</span>
                      {profile.profile?.twitter ? (
                        <span className="text-zinc-300">
                          @{profile.profile.twitter.replace(/^@/, "")}
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-xs italic">
                          Not linked
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-zinc-400">
                      <GithubIcon className="h-4 w-4 text-zinc-600 shrink-0" />
                      <span className="text-zinc-500 text-xs">GitHub:</span>
                      {profile.profile?.github ? (
                        <span className="text-zinc-300">
                          {profile.profile.github}
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-xs italic">
                          Not linked
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-zinc-400">
                      <FacebookIcon className="h-4 w-4 text-zinc-600 shrink-0" />
                      <span className="text-zinc-500 text-xs">Facebook:</span>
                      {profile.profile?.facebook ? (
                        <span className="text-zinc-300 truncate max-w-[150px]">
                          {profile.profile.facebook.replace(
                            /^https?:\/\/(www\.)?facebook\.com\//,
                            "",
                          )}
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-xs italic">
                          Not linked
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
