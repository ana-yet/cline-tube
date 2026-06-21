"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  Sparkles,
  Crown,
  Bookmark,
  Star,
  ExternalLink,
  ChevronRight,
  Film,
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
  const searchParams = useSearchParams();
  const checkoutSuccess = searchParams.get("success") === "true";
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [subscriptionActivated, setSubscriptionActivated] = useState(false);
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
    refetchInterval: (query) => {
      if (!checkoutSuccess) return false;
      const tier = query.state.data?.tier;
      if (tier && tier !== "FREE") return false;
      return 2000;
    },
  });

  useEffect(() => {
    if (checkoutSuccess && isAuthenticated) {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    }
  }, [checkoutSuccess, isAuthenticated, queryClient]);

  useEffect(() => {
    if (
      checkoutSuccess &&
      subscription?.tier &&
      subscription.tier !== "FREE"
    ) {
      setSubscriptionActivated(true);
      queryClient.invalidateQueries({ queryKey: ["media"] });
    }
  }, [checkoutSuccess, subscription?.tier, queryClient]);

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

  const isPremium =
    subscription?.tier === "MONTHLY" || subscription?.tier === "YEARLY";
  const displayName = profile?.name || "Anonymous User";
  const initials = profile?.name
    ? profile.name.slice(0, 2).toUpperCase()
    : "US";
  const joinedDate = profile
    ? new Date(profile.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      })
    : "";
  const genreCount = profile?.profile?.favoriteGenres?.length ?? 0;
  const profileCompletion = profile
    ? Math.round(
        ([
          !!profile.name,
          !!profile.profile?.bio,
          genreCount > 0,
          !!profile.profile?.website ||
            !!profile.profile?.twitter ||
            !!profile.profile?.github ||
            !!profile.profile?.facebook,
        ].filter(Boolean).length /
          4) *
          100,
      )
    : 0;

  if (authLoading || (isAuthenticated && isLoading)) {
    return (
      <main className="container mx-auto px-4 py-16 text-center min-h-[70vh] flex items-center justify-center bg-zinc-950">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
      </main>
    );
  }

  if (!isAuthenticated || !profile) {
    if (checkoutSuccess) {
      return (
        <main className="container mx-auto px-4 py-24 text-center min-h-[70vh] flex flex-col items-center justify-center space-y-6 bg-zinc-950">
          <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center">
            <Check className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            Payment successful
          </h1>
          <p className="text-zinc-500 max-w-sm">
            Your subscription is being activated. Sign in to view your updated
            account and premium access.
          </p>
          <Link href="/login?redirect=%2Fprofile%3Fsuccess%3Dtrue">
            <Button className="bg-red-600 hover:bg-red-700 text-white px-6">
              Sign in to view profile
            </Button>
          </Link>
        </main>
      );
    }

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
    <main className="min-h-screen bg-zinc-950 pb-16">
      {/* Profile hero */}
      <section className="relative border-b border-zinc-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-950/80 via-zinc-950 to-amber-950/40" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-600/10 via-transparent to-transparent" />
        <div className="container relative mx-auto max-w-6xl px-4 pb-8 pt-10 md:pt-14">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-end">
              <div className="relative shrink-0">
                {profile.image ? (
                  <img
                    src={profile.image}
                    alt={displayName}
                    className="h-24 w-24 rounded-2xl object-cover ring-4 ring-zinc-950 shadow-2xl md:h-28 md:w-28"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-amber-500 text-2xl font-bold text-white ring-4 ring-zinc-950 shadow-2xl md:h-28 md:w-28 md:text-3xl">
                    {initials}
                  </div>
                )}
                {isPremium && (
                  <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-zinc-950 bg-amber-500 text-zinc-950 shadow-lg">
                    <Crown className="h-4 w-4" />
                  </span>
                )}
              </div>

              <div className="space-y-3 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <h1 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">
                    {displayName}
                  </h1>
                  <Badge
                    variant="outline"
                    className="border-red-500/30 bg-red-500/10 text-red-400 text-[10px] uppercase tracking-wider"
                  >
                    <Shield className="mr-1 h-3 w-3" />
                    {profile.role}
                  </Badge>
                  {isPremium && (
                    <Badge className="border-amber-500/30 bg-amber-500/15 text-amber-300 text-[10px] uppercase tracking-wider">
                      <Sparkles className="mr-1 h-3 w-3" />
                      CinePass
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-zinc-400 sm:justify-start">
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-zinc-600" />
                    {profile.email}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-zinc-600" />
                    Member since {joinedDate}
                  </span>
                </div>
              </div>
            </div>

            {!editing && (
              <Button
                onClick={startEditing}
                className="h-11 shrink-0 gap-2 rounded-xl border border-zinc-700/80 bg-zinc-900/80 px-5 text-zinc-100 backdrop-blur hover:bg-zinc-800"
              >
                <Edit3 className="h-4 w-4" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-6xl px-4 py-8">
        {subscriptionActivated && (
          <Alert className="mb-6 border-emerald-500/30 bg-emerald-950/20 text-emerald-400">
            <AlertDescription className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              <span>
                Subscription activated! You now have {subscription?.tier} access.
              </span>
            </AlertDescription>
          </Alert>
        )}
        {checkoutSuccess &&
          isAuthenticated &&
          subscription?.tier === "FREE" && (
            <Alert className="mb-6 border-amber-500/30 bg-amber-950/20 text-amber-300">
              <AlertDescription>
                Payment received. Activating your subscription — this usually
                takes a few seconds...
              </AlertDescription>
            </Alert>
          )}
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

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[300px_1fr]">
          {/* Sidebar */}
          <aside className="space-y-5">
            {/* Activity stats */}
            <Card className="overflow-hidden border-zinc-800/80 bg-zinc-900/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-500">
                  Your Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 pb-5">
                <Link
                  href="/watchlist"
                  className="group rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 transition-colors hover:border-red-500/30 hover:bg-red-500/5"
                >
                  <Bookmark className="mb-2 h-4 w-4 text-red-400" />
                  <p className="text-2xl font-extrabold text-white">
                    {profile._count.watchlist}
                  </p>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 group-hover:text-zinc-400">
                    Watchlist
                  </p>
                </Link>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <Star className="mb-2 h-4 w-4 text-amber-400" />
                  <p className="text-2xl font-extrabold text-white">
                    {profile._count.reviews}
                  </p>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Reviews
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Profile completion */}
            {!editing && profileCompletion < 100 && (
              <Card className="border-zinc-800/80 bg-zinc-900/50 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Profile strength
                  </span>
                  <span className="text-sm font-bold text-red-400">
                    {profileCompletion}%
                  </span>
                </div>
                <div className="mb-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-red-600 to-amber-500 transition-all"
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>
                <p className="text-xs leading-relaxed text-zinc-500">
                  Add a bio, favorite genres, or social links to complete your
                  public profile.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={startEditing}
                  className="mt-3 h-8 px-0 text-red-400 hover:bg-transparent hover:text-red-300"
                >
                  Complete profile
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Card>
            )}

            {/* Subscription */}
            {subscription && (
              <Card
                className={`overflow-hidden border-zinc-800/80 ${
                  isPremium
                    ? "bg-gradient-to-br from-amber-950/30 via-zinc-900/60 to-red-950/20"
                    : "bg-zinc-900/50"
                }`}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-500">
                    {isPremium ? (
                      <Crown className="h-4 w-4 text-amber-400" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-zinc-500" />
                    )}
                    CinePass
                  </CardTitle>
                  <CardDescription className="text-zinc-400">
                    {isPremium
                      ? "Premium streaming and catalog access"
                      : "Upgrade for premium titles and ad-free browsing"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-3 py-2.5">
                    <span className="text-sm text-zinc-400">Plan</span>
                    <Badge
                      className={
                        isPremium
                          ? "border-amber-500/30 bg-amber-500/15 text-amber-300"
                          : "border-zinc-700 bg-zinc-800 text-zinc-300"
                      }
                    >
                      {subscription.tier}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Status</span>
                    <span
                      className={
                        subscription.status === "ACTIVE"
                          ? "font-medium text-emerald-400"
                          : "text-zinc-300"
                      }
                    >
                      {subscription.status}
                    </span>
                  </div>
                  {isPremium && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400">Renews</span>
                      <span className="text-zinc-200">
                        {new Date(
                          subscription.currentPeriodEnd,
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  )}
                  {subscription.tier === "FREE" ? (
                    <Link href="/pricing">
                      <Button className="h-10 w-full rounded-xl bg-red-600 hover:bg-red-700">
                        Upgrade to Premium
                      </Button>
                    </Link>
                  ) : subscription.status !== "CANCELED" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 w-full rounded-xl border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      onClick={() => cancelMutation.mutate()}
                      disabled={cancelMutation.isPending}
                    >
                      {cancelMutation.isPending
                        ? "Canceling..."
                        : "Cancel subscription"}
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            )}

            {/* Quick links */}
            <Card className="border-zinc-800/80 bg-zinc-900/50 p-2">
              <nav className="flex flex-col">
                {[
                  { href: "/browse", label: "Browse catalog", icon: Film },
                  { href: "/watchlist", label: "My watchlist", icon: Bookmark },
                  { href: "/pricing", label: "Plans & pricing", icon: Sparkles },
                ].map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800/60 hover:text-white"
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 text-zinc-600" />
                      {label}
                    </span>
                    <ChevronRight className="h-4 w-4 text-zinc-700" />
                  </Link>
                ))}
              </nav>
            </Card>

            {/* Social sidebar */}
            {!editing &&
              (profile.profile?.website ||
                profile.profile?.twitter ||
                profile.profile?.github ||
                profile.profile?.facebook) && (
                <Card className="border-zinc-800/80 bg-zinc-900/50 p-5">
                  <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Connected
                  </h4>
                  <div className="space-y-3">
                    {profile.profile.website && (
                      <a
                        href={profile.profile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 text-sm text-zinc-400 transition-colors hover:text-white"
                      >
                        <LinkIcon className="h-4 w-4 shrink-0 text-zinc-600" />
                        <span className="truncate">
                          {profile.profile.website.replace(/^https?:\/\//, "")}
                        </span>
                        <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 opacity-50" />
                      </a>
                    )}
                    {profile.profile.twitter && (
                      <div className="flex items-center gap-2.5 text-sm text-zinc-400">
                        <TwitterIcon className="h-4 w-4 shrink-0 text-zinc-600" />
                        @{profile.profile.twitter.replace(/^@/, "")}
                      </div>
                    )}
                    {profile.profile.github && (
                      <div className="flex items-center gap-2.5 text-sm text-zinc-400">
                        <GithubIcon className="h-4 w-4 shrink-0 text-zinc-600" />
                        {profile.profile.github}
                      </div>
                    )}
                    {profile.profile.facebook && (
                      <div className="flex items-center gap-2.5 text-sm text-zinc-400">
                        <FacebookIcon className="h-4 w-4 shrink-0 text-zinc-600" />
                        <span className="truncate">
                          {profile.profile.facebook}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              )}
          </aside>

          {/* Main content */}
          <div className="space-y-6">
            {editing ? (
              <Card className="border-zinc-800/80 bg-zinc-900/40 shadow-xl">
                <CardHeader className="border-b border-zinc-800/60">
                  <CardTitle className="text-lg font-bold text-white">
                    Edit profile
                  </CardTitle>
                  <CardDescription className="text-zinc-500">
                    Update how you appear across CineTube.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 pt-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label
                        htmlFor="edit-name"
                        className="text-xs font-semibold text-zinc-400"
                      >
                        Display name
                      </Label>
                      <Input
                        id="edit-name"
                        value={form.name}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, name: e.target.value }))
                        }
                        className="h-11 border-zinc-800 bg-zinc-950 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-zinc-400">
                        Email
                      </Label>
                      <Input
                        value={profile.email}
                        disabled
                        className="h-11 cursor-not-allowed border-zinc-800 bg-zinc-900 text-zinc-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="edit-bio"
                      className="text-xs font-semibold text-zinc-400"
                    >
                      Bio
                    </Label>
                    <Textarea
                      id="edit-bio"
                      value={form.bio}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, bio: e.target.value }))
                      }
                      rows={4}
                      placeholder="Share your favorite directors, genres, or what you're watching..."
                      className="resize-none border-zinc-800 bg-zinc-950 text-white"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-xs font-semibold text-zinc-400">
                      Favorite genres
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {ALL_GENRES.map((genre) => {
                        const isSelected = selectedGenres.includes(genre);
                        return (
                          <button
                            key={genre}
                            type="button"
                            onClick={() => toggleGenre(genre)}
                            className={`rounded-full border px-3.5 py-1.5 text-xs transition-all ${
                              isSelected
                                ? "border-red-500/40 bg-red-500/10 font-semibold text-red-400"
                                : "border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                            }`}
                          >
                            {genre}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Separator className="bg-zinc-800" />

                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Social links
                    </h4>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label
                          htmlFor="edit-website"
                          className="text-xs font-semibold text-zinc-400"
                        >
                          Website
                        </Label>
                        <Input
                          id="edit-website"
                          value={form.website}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, website: e.target.value }))
                          }
                          placeholder="https://yoursite.com"
                          className="h-11 border-zinc-800 bg-zinc-950 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="edit-twitter"
                          className="text-xs font-semibold text-zinc-400"
                        >
                          Twitter
                        </Label>
                        <Input
                          id="edit-twitter"
                          value={form.twitter}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, twitter: e.target.value }))
                          }
                          placeholder="@username"
                          className="h-11 border-zinc-800 bg-zinc-950 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="edit-github"
                          className="text-xs font-semibold text-zinc-400"
                        >
                          GitHub
                        </Label>
                        <Input
                          id="edit-github"
                          value={form.github}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, github: e.target.value }))
                          }
                          placeholder="username"
                          className="h-11 border-zinc-800 bg-zinc-950 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="edit-facebook"
                          className="text-xs font-semibold text-zinc-400"
                        >
                          Facebook
                        </Label>
                        <Input
                          id="edit-facebook"
                          value={form.facebook}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, facebook: e.target.value }))
                          }
                          placeholder="Profile URL"
                          className="h-11 border-zinc-800 bg-zinc-950 text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 border-t border-zinc-800 pt-6">
                    <Button
                      onClick={() => updateMutation.mutate()}
                      disabled={updateMutation.isPending}
                      className="h-11 rounded-xl bg-red-600 px-6 font-semibold shadow-lg hover:bg-red-700"
                    >
                      {updateMutation.isPending ? "Saving..." : "Save changes"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setEditing(false)}
                      className="h-11 rounded-xl border-zinc-800 text-zinc-300 hover:bg-zinc-900"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="border-zinc-800/80 bg-zinc-900/40">
                  <CardHeader>
                    <CardTitle className="text-base font-bold text-white">
                      About
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-zinc-300">
                      {profile.profile?.bio ||
                        "No bio yet. Tell the community what kind of films and series you love."}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-zinc-800/80 bg-zinc-900/40">
                  <CardHeader>
                    <CardTitle className="text-base font-bold text-white">
                      Favorite genres
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {profile.profile?.favoriteGenres &&
                    profile.profile.favoriteGenres.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {profile.profile.favoriteGenres.map((g) => (
                          <Badge
                            key={g}
                            className="border border-red-500/20 bg-red-500/10 px-3 py-1 text-red-400"
                          >
                            {g}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm italic text-zinc-500">
                        No genres selected. Edit your profile to add favorites.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-zinc-800/80 bg-zinc-900/40">
                  <CardHeader>
                    <CardTitle className="text-base font-bold text-white">
                      Account details
                    </CardTitle>
                    <CardDescription className="text-zinc-500">
                      Private information tied to your CineTube account.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="divide-y divide-zinc-800/80">
                    <div className="flex items-center justify-between py-3 first:pt-0">
                      <span className="text-sm text-zinc-500">Email</span>
                      <span className="text-sm font-medium text-zinc-200">
                        {profile.email}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <span className="text-sm text-zinc-500">Role</span>
                      <span className="text-sm font-medium capitalize text-zinc-200">
                        {profile.role.toLowerCase()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <span className="text-sm text-zinc-500">Member since</span>
                      <span className="text-sm font-medium text-zinc-200">
                        {joinedDate}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3 last:pb-0">
                      <span className="text-sm text-zinc-500">
                        Email verified
                      </span>
                      <span className="text-sm font-medium text-zinc-200">
                        {profile.emailVerified ? "Yes" : "Pending"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-zinc-800/80 bg-zinc-900/40">
                  <CardHeader>
                    <CardTitle className="text-base font-bold text-white">
                      Social profiles
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2">
                    {[
                      {
                        label: "Website",
                        value: profile.profile?.website,
                        icon: LinkIcon,
                        href: profile.profile?.website ?? undefined,
                        display: profile.profile?.website?.replace(
                          /^https?:\/\//,
                          "",
                        ),
                      },
                      {
                        label: "Twitter",
                        value: profile.profile?.twitter,
                        icon: TwitterIcon,
                        display: profile.profile?.twitter
                          ? `@${profile.profile.twitter.replace(/^@/, "")}`
                          : undefined,
                      },
                      {
                        label: "GitHub",
                        value: profile.profile?.github,
                        icon: GithubIcon,
                        display: profile.profile?.github,
                      },
                      {
                        label: "Facebook",
                        value: profile.profile?.facebook,
                        icon: FacebookIcon,
                        display: profile.profile?.facebook?.replace(
                          /^https?:\/\/(www\.)?facebook\.com\//,
                          "",
                        ),
                      },
                    ].map(({ label, value, icon: Icon, href, display }) => (
                      <div
                        key={label}
                        className="flex items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-4 py-3"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900">
                          <Icon className="h-4 w-4 text-zinc-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
                            {label}
                          </p>
                          {value ? (
                            href ? (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="truncate text-sm text-red-400 hover:underline"
                              >
                                {display}
                              </a>
                            ) : (
                              <p className="truncate text-sm text-zinc-300">
                                {display}
                              </p>
                            )
                          ) : (
                            <p className="text-sm italic text-zinc-600">
                              Not linked
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
