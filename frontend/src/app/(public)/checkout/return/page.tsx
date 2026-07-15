"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  appendCheckoutStatus,
  fetchCheckoutOutcome,
} from "@/lib/checkout";
import { useAuth } from "@/providers/auth-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function CheckoutReturnPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading } = useAuth();
  const sessionId =
    searchParams.get("session_id") ?? searchParams.get("sessionId") ?? "";
  const canceled = searchParams.get("canceled") === "true";

  const outcomeQuery = useQuery({
    queryKey: ["checkout", "outcome", sessionId, canceled],
    queryFn: () => fetchCheckoutOutcome(sessionId, canceled),
    enabled: Boolean(sessionId) && isAuthenticated,
    retry: 1,
  });

  useEffect(() => {
    if (!outcomeQuery.data) return;

    queryClient.invalidateQueries({ queryKey: ["subscription"] });
    queryClient.invalidateQueries({ queryKey: ["media"] });
    router.replace(
      appendCheckoutStatus(
        outcomeQuery.data.returnPath,
        outcomeQuery.data.checkoutStatus,
      ),
    );
  }, [outcomeQuery.data, queryClient, router]);

  if (!sessionId) {
    return (
      <main className="min-h-[70vh] bg-zinc-950 px-4 py-24 text-center text-white">
        <div className="mx-auto max-w-sm space-y-5">
          <Alert className="border-red-500/30 bg-red-950/20 text-red-200">
            <AlertDescription className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Checkout session is missing.
            </AlertDescription>
          </Alert>
          <Link href="/pricing">
            <Button className="bg-red-600 hover:bg-red-700">
              Back to pricing
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  if (!isLoading && !isAuthenticated) {
    const redirect = `/checkout/return?${searchParams.toString()}`;

    return (
      <main className="min-h-[70vh] bg-zinc-950 px-4 py-24 text-center text-white">
        <div className="mx-auto max-w-sm space-y-5">
          <h1 className="text-2xl font-bold">Confirm your checkout</h1>
          <p className="text-sm leading-relaxed text-zinc-400">
            Sign in to verify this checkout and return to your original page.
          </p>
          <Link href={`/login?redirect=${encodeURIComponent(redirect)}`}>
            <Button className="bg-red-600 hover:bg-red-700">Sign in</Button>
          </Link>
        </div>
      </main>
    );
  }

  if (outcomeQuery.isError) {
    return (
      <main className="min-h-[70vh] bg-zinc-950 px-4 py-24 text-center text-white">
        <div className="mx-auto max-w-sm space-y-5">
          <Alert className="border-red-500/30 bg-red-950/20 text-red-200">
            <AlertDescription className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Unable to verify this checkout.
            </AlertDescription>
          </Alert>
          <Link href="/pricing">
            <Button className="bg-red-600 hover:bg-red-700">
              Back to pricing
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-zinc-950 px-4 text-white">
      <div className="flex items-center gap-3 text-sm text-zinc-300">
        <Loader2 className="h-5 w-5 animate-spin text-red-500" />
        Verifying checkout...
      </div>
    </main>
  );
}
