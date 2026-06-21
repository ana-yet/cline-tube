"use client";

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api";
import type { ApiResponse } from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Film,
  MessageSquare,
  Clock,
  Heart,
  Star,
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
  Activity,
} from "lucide-react";
import Link from "next/link";

interface KPIs {
  totalUsers: number;
  totalMedia: number;
  totalReviews: number;
  pendingReviews: number;
  totalWatchlists: number;
  averageRating: number;
  totalRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  activeSubscribers: number;
}

const KPI_ICONS = {
  totalUsers: Users,
  totalMedia: Film,
  totalReviews: MessageSquare,
  pendingReviews: Clock,
  totalWatchlists: Heart,
  averageRating: Star,
  totalRevenue: Activity,
  monthlyRevenue: Activity,
  yearlyRevenue: Activity,
  activeSubscribers: ShieldCheck,
};

const KPI_DETAILS = [
  {
    key: "totalUsers" as const,
    label: "Registered Users",
    description: "All active client profiles",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/15",
  },
  {
    key: "totalMedia" as const,
    label: "Total Titles",
    description: "Catalog movies & series",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    border: "border-purple-500/15",
  },
  {
    key: "totalReviews" as const,
    label: "Total Reviews",
    description: "Approved user reviews",
    color: "text-green-500",
    bg: "bg-green-500/10",
    border: "border-green-500/15",
  },
  {
    key: "pendingReviews" as const,
    label: "Pending Reviews",
    description: "Awaiting moderator review",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/15",
  },
  {
    key: "totalWatchlists" as const,
    label: "Saved Titles",
    description: "Items in watchlists",
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    border: "border-pink-500/15",
  },
  {
    key: "averageRating" as const,
    label: "Average Rating",
    description: "Overall catalog score",
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/15",
  },
  {
    key: "totalRevenue" as const,
    label: "Total Revenue",
    description: "All-time earnings",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/15",
  },
  {
    key: "monthlyRevenue" as const,
    label: "Monthly Revenue",
    description: "Current month earnings",
    color: "text-teal-500",
    bg: "bg-teal-500/10",
    border: "border-teal-500/15",
  },
  {
    key: "activeSubscribers" as const,
    label: "Active Subscribers",
    description: "Premium plan users",
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/15",
  },
];

export default function AdminDashboardPage() {
  const { data: kpis, isLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => {
      const { data } =
        await apiClient.get<ApiResponse<{ kpis: KPIs }>>("/admin/dashboard");
      return data.data.kpis;
    },
  });

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/20 border border-zinc-900 p-6 md:p-8 rounded-3xl">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <span>Control Center</span>
          </h1>
          <p className="text-zinc-500 text-sm max-w-lg leading-relaxed">
            Welcome to the CineTube control desk. Manage content releases,
            moderate reviews, and monitor key platform engagement KPIs.
          </p>
        </div>
        {kpis && kpis.pendingReviews > 0 && (
          <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl shrink-0">
            <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-amber-400">
                {kpis.pendingReviews} pending reviews
              </p>
              <Link
                href="/admin/reviews"
                className="underline font-medium text-zinc-300 hover:text-white block mt-0.5"
              >
                Review queue &rarr;
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card
              key={i}
              className="bg-zinc-900/30 border-zinc-900 overflow-hidden"
            >
              <CardContent className="p-6">
                <div className="h-20 bg-zinc-900 animate-pulse rounded-xl" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : kpis ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {KPI_DETAILS.map((detail) => {
            const Icon = KPI_ICONS[detail.key];
            const val = kpis[detail.key];

            // Format values nicely
            const displayVal =
              detail.key === "averageRating"
                ? typeof val === "number"
                  ? val.toFixed(1)
                  : val
                : ["totalRevenue", "monthlyRevenue", "yearlyRevenue"].includes(
                      detail.key,
                    )
                  ? `$${Number(val).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                  : val;

            return (
              <Card
                key={detail.key}
                className="bg-zinc-900/30 border-zinc-900 overflow-hidden hover:border-zinc-800 transition-all shadow-md"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div className="space-y-0.5">
                    <CardTitle className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      {detail.label}
                    </CardTitle>
                    <CardDescription className="text-[10px] text-zinc-650 leading-none">
                      {detail.description}
                    </CardDescription>
                  </div>
                  <div
                    className={`h-8 w-8 rounded-lg ${detail.bg} ${detail.border} border flex items-center justify-center`}
                  >
                    <Icon className={`h-4.5 w-4.5 ${detail.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-extrabold text-white tracking-tight">
                    {displayVal}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="bg-zinc-900/30 border-zinc-900">
          <CardContent className="py-12 text-center">
            <p className="text-zinc-500 text-sm">
              Dashboard data not available. Check network connectivity or admin
              session.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quick links & Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        {/* Actions panel */}
        <Card className="bg-zinc-900/30 border-zinc-900 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="h-4.5 w-4.5 text-red-500" />
              <span>Administrative Operations</span>
            </CardTitle>
            <CardDescription className="text-zinc-500 text-xs">
              Direct access links to configuration controls.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/admin/media"
              className="flex items-center justify-between p-3 bg-zinc-900/50 hover:bg-zinc-900/80 border border-zinc-900 rounded-xl transition-all group"
            >
              <div className="text-xs">
                <p className="font-bold text-zinc-200">
                  Catalog Content Control
                </p>
                <p className="text-zinc-500 text-[10px] mt-0.5">
                  Upload new releases, update synopsis & stream URL
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-zinc-500 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/admin/reviews"
              className="flex items-center justify-between p-3 bg-zinc-900/50 hover:bg-zinc-900/80 border border-zinc-900 rounded-xl transition-all group"
            >
              <div className="text-xs">
                <p className="font-bold text-zinc-200">
                  Review Moderation Console
                </p>
                <p className="text-zinc-500 text-[10px] mt-0.5">
                  Approve pending viewer feedback or delete offensive reviews
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-zinc-500 group-hover:translate-x-1 transition-transform" />
            </Link>
          </CardContent>
        </Card>

        {/* System activity */}
        <Card className="bg-zinc-900/30 border-zinc-900 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="h-4.5 w-4.5 text-zinc-400" />
              <span>Platform Health</span>
            </CardTitle>
            <CardDescription className="text-zinc-500 text-xs">
              Platform service metrics and configurations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="flex justify-between border-b border-zinc-900/80 pb-2">
              <span className="text-zinc-500">API Server Status</span>
              <span className="text-emerald-500 font-bold flex items-center gap-1.5">
                <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                ONLINE
              </span>
            </div>
            <div className="flex justify-between border-b border-zinc-900/80 pb-2">
              <span className="text-zinc-500">Cloudinary Upload Service</span>
              <span className="text-emerald-500 font-bold flex items-center gap-1.5">
                <span className="h-2 w-2 bg-emerald-500 rounded-full" />
                READY
              </span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-zinc-500">Node Environment</span>
              <span className="text-zinc-300 font-mono">production</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
