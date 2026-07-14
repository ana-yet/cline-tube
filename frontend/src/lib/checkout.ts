import apiClient from "@/lib/api";
import type { ApiResponse } from "@/types";

export type CheckoutPlan = "MONTHLY" | "YEARLY";

export const DEFAULT_CHECKOUT_RETURN_PATH = "/profile";

export async function startStripeCheckout(
  plan: CheckoutPlan,
  returnPath: string = DEFAULT_CHECKOUT_RETURN_PATH,
): Promise<string | null> {
  const { data } = await apiClient.post<ApiResponse<{ url: string }>>(
    "/payments/checkout",
    { plan, returnPath },
  );

  return data.data.url ?? null;
}

export function buildPricingHref(returnPath: string): string {
  if (returnPath === DEFAULT_CHECKOUT_RETURN_PATH) {
    return "/pricing";
  }

  return `/pricing?return=${encodeURIComponent(returnPath)}`;
}
