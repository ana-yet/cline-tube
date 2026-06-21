"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import apiClient from "@/lib/api";
import type { ApiResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, X, Sparkles, HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ_ITEMS = [
  {
    q: "How do I upgrade to a premium plan?",
    a: "To upgrade, select your desired plan (Monthly or Annual) and follow the secure checkout instructions. If you already have a free account, the subscription will link directly to your existing credentials.",
  },
  {
    q: "Can I cancel my subscription at any time?",
    a: "Yes, absolutely. You can cancel your subscription from your profile billing settings. You will retain access to your premium features until the end of your current billing cycle.",
  },
  {
    q: "What is the refund policy?",
    a: "We offer a 7-day money-back guarantee for monthly plans and a 14-day refund period for annual plans if you are unsatisfied with the premium content experience.",
  },
  {
    q: "Is there a difference in content quality between plans?",
    a: "Both Monthly and Annual plans offer the identical high-fidelity ad-free catalog access and Ultra-HD streaming playback. The Annual plan simply offers a 17% overall discount.",
  },
];

export default function PricingPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const checkoutReady = !authLoading && isAuthenticated;

  // Handle success/cancel from Stripe redirect
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setMessage("Subscription activated! Welcome to premium.");
    } else if (searchParams.get("canceled") === "true") {
      setMessage("Checkout canceled. No charges were made.");
    }
  }, [searchParams]);

  // Fetch current subscription
  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const { data } = await apiClient.get<
        ApiResponse<{ subscription: { tier: string; status: string } }>
      >("/payments/subscription");
      return data.data.subscription;
    },
    enabled: checkoutReady,
  });

  const currentPlan = subscription?.tier || "FREE";

  const handleCheckout = async (plan: "MONTHLY" | "YEARLY") => {
    if (authLoading) return;

    if (!isAuthenticated) {
      window.location.href = "/register";
      return;
    }

    setLoading(plan);
    try {
      const { data } = await apiClient.post<ApiResponse<{ url: string }>>(
        "/payments/checkout",
        { plan },
      );
      if (data.data.url) {
        window.location.href = data.data.url;
      } else {
        setMessage("Checkout failed. Please try again.");
        setLoading(null);
      }
    } catch (err: unknown) {
      const apiError = err as {
        response?: { status?: number; data?: { error?: { message?: string } } };
      };
      if (apiError.response?.status === 401) {
        setMessage("Your session expired. Please sign in again to subscribe.");
      } else {
        setMessage(
          apiError.response?.data?.error?.message ||
            "Checkout failed. Please try again.",
        );
      }
      setLoading(null);
    }
  };
  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-20 overflow-hidden">
      {/* Success/Cancel Message */}
      {message && (
        <div className="container mx-auto px-4 pt-6 max-w-3xl relative z-20">
          <Alert
            className={
              searchParams.get("success") === "true"
                ? "border-emerald-500/50 bg-emerald-500/10"
                : "border-zinc-700 bg-zinc-900"
            }
          >
            <AlertDescription
              className={
                searchParams.get("success") === "true"
                  ? "text-emerald-400"
                  : "text-zinc-400"
              }
            >
              {message}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Background radial highlight */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] bg-red-950/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Header section */}
      <section className="container mx-auto px-4 pt-20 pb-16 text-center max-w-3xl space-y-4 relative z-10">
        <div className="inline-flex items-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1 rounded-full text-xs font-semibold mb-2">
          <Sparkles className="h-3.5 w-3.5 text-red-500" />
          <span>Access Plans</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-none">
          Choose Your CinePass
        </h1>
        <p className="text-zinc-400 text-base md:text-lg max-w-xl mx-auto font-light leading-relaxed">
          Upgrade to unlock premium movies, series, priority streaming servers,
          and complete ad-free viewing.
        </p>
      </section>

      {/* Pricing cards grid */}
      <section className="container mx-auto px-4 max-w-5xl relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {/* Free Tier */}
          <Card className="bg-zinc-900/60 border-zinc-800/80 rounded-2xl overflow-hidden hover:border-zinc-700/80 transition-all flex flex-col justify-between">
            <CardContent className="pt-8 px-8 text-center flex-1">
              <h3 className="text-lg font-bold text-zinc-300">Free Pass</h3>
              {currentPlan === "FREE" && (
                <Badge
                  variant="outline"
                  className="mt-2 border-emerald-500 text-emerald-400"
                >
                  Current Plan
                </Badge>
              )}
              <div className="mt-4 flex items-baseline justify-center text-white">
                <span className="text-5xl font-extrabold tracking-tight">
                  $0
                </span>
                <span className="ml-1 text-sm text-zinc-500">/ forever</span>
              </div>
              <ul className="mt-8 space-y-4 text-sm text-zinc-400 text-left border-t border-zinc-800/60 pt-6">
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-red-500 shrink-0" />
                  <span>Browse free media catalog</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-red-500 shrink-0" />
                  <span>Submit rating reviews</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-red-500 shrink-0" />
                  <span>Personalized watchlist</span>
                </li>
                <li className="flex items-center gap-2.5 opacity-40">
                  <X className="h-4 w-4 text-zinc-650 shrink-0" />
                  <span className="line-through text-zinc-650">
                    No ads interruption
                  </span>
                </li>
                <li className="flex items-center gap-2.5 opacity-40">
                  <X className="h-4 w-4 text-zinc-650 shrink-0" />
                  <span className="line-through text-zinc-650">
                    Priority servers access
                  </span>
                </li>
              </ul>
            </CardContent>
            <div className="p-8 pt-0">
              <Link href="/register" className="block w-full">
                <Button className="w-full bg-zinc-800 hover:bg-zinc-750 text-white rounded-xl h-11 border border-zinc-700/50">
                  Get Started
                </Button>
              </Link>
            </div>
          </Card>

          {/* Premium Monthly Tier */}
          <Card className="bg-zinc-900 border-red-650 rounded-2xl overflow-hidden relative shadow-xl shadow-red-950/10 flex flex-col justify-between scale-105 border-2 z-20">
            <Badge className="absolute top-4 right-4 bg-red-600 text-white border-0 font-semibold text-xs tracking-wider">
              POPULAR
            </Badge>
            <CardContent className="pt-8 px-8 text-center flex-1">
              <h3 className="text-lg font-bold text-white">CinePass Monthly</h3>
              {currentPlan === "MONTHLY" && (
                <Badge
                  variant="outline"
                  className="mt-2 border-emerald-500 text-emerald-400"
                >
                  Current Plan
                </Badge>
              )}
              <div className="mt-4 flex items-baseline justify-center text-white">
                <span className="text-5xl font-extrabold tracking-tight">
                  $9.99
                </span>
                <span className="ml-1 text-sm text-zinc-500">/ month</span>
              </div>
              <ul className="mt-8 space-y-4 text-sm text-zinc-300 text-left border-t border-zinc-850 pt-6">
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-red-550 shrink-0" />
                  <span>Access all premium content</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-red-550 shrink-0" />
                  <span>Completely ad-free UI/UX</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-red-550 shrink-0" />
                  <span>Full High-Definition (HD) playback</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-red-550 shrink-0" />
                  <span>Cancel subscription anytime</span>
                </li>
                <li className="flex items-center gap-2.5 opacity-40">
                  <X className="h-4 w-4 text-zinc-600 shrink-0" />
                  <span className="line-through text-zinc-500">
                    Priority support access
                  </span>
                </li>
              </ul>
            </CardContent>
            <div className="p-8 pt-0">
              <Button
                className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl h-11 shadow-lg hover:shadow-red-600/20 transition-all font-semibold"
                onClick={() => handleCheckout("MONTHLY")}
                disabled={
                  authLoading ||
                  loading === "MONTHLY" ||
                  currentPlan === "MONTHLY"
                }
              >
                {authLoading
                  ? "Loading..."
                  : currentPlan === "MONTHLY"
                    ? "Current Plan"
                    : loading === "MONTHLY"
                      ? "Redirecting..."
                      : "Subscribe Now"}
              </Button>
            </div>
          </Card>

          {/* Premium Yearly Tier */}
          <Card className="bg-zinc-900/60 border-zinc-800/80 rounded-2xl overflow-hidden hover:border-zinc-700/80 transition-all flex flex-col justify-between">
            <CardContent className="pt-8 px-8 text-center flex-1">
              <h3 className="text-lg font-bold text-zinc-300">
                CinePass Annual
              </h3>
              {currentPlan === "YEARLY" && (
                <Badge
                  variant="outline"
                  className="mt-2 border-emerald-500 text-emerald-400"
                >
                  Current Plan
                </Badge>
              )}
              <div className="mt-4 flex items-baseline justify-center text-white">
                <span className="text-5xl font-extrabold tracking-tight">
                  $99.99
                </span>
                <span className="ml-1 text-sm text-zinc-500">/ year</span>
              </div>
              <div className="mt-2 text-xs font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 inline-block px-2.5 py-0.5 rounded-full">
                SAVE 17% (2 MONTHS FREE)
              </div>
              <ul className="mt-6 space-y-4 text-sm text-zinc-400 text-left border-t border-zinc-800/60 pt-6">
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-red-500 shrink-0" />
                  <span>Everything in Monthly plan</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-red-500 shrink-0" />
                  <span>Priority servers for streaming</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-red-500 shrink-0" />
                  <span>Early access review system</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-red-500 shrink-0" />
                  <span>Exclusive badges for profile</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-red-500 shrink-0" />
                  <span>Dedicated priority support</span>
                </li>
              </ul>
            </CardContent>
            <div className="p-8 pt-0">
              <Button
                className="w-full bg-zinc-800 hover:bg-zinc-750 text-white rounded-xl h-11 border border-zinc-700/50"
                onClick={() => handleCheckout("YEARLY")}
                disabled={
                  authLoading ||
                  loading === "YEARLY" ||
                  currentPlan === "YEARLY"
                }
              >
                {authLoading
                  ? "Loading..."
                  : currentPlan === "YEARLY"
                    ? "Current Plan"
                    : loading === "YEARLY"
                      ? "Redirecting..."
                      : "Subscribe Now"}
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* FAQ accordion */}
      <section className="container mx-auto px-4 max-w-3xl pt-24 space-y-12 relative z-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1 rounded-full text-xs font-semibold">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Billing FAQs</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-zinc-500 text-sm max-w-md mx-auto">
            Got questions about CinePass renewals, refunds, or payment
            processing? We are here to help.
          </p>
        </div>

        <Accordion className="w-full space-y-4">
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="border border-zinc-800 bg-zinc-900/40 rounded-xl px-4 py-1.5 focus-within:ring-2 focus-within:ring-red-500/20 transition-all"
            >
              <AccordionTrigger className="text-left font-semibold text-zinc-200 hover:text-white hover:no-underline py-4">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-zinc-400 leading-relaxed pb-4 text-sm">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
