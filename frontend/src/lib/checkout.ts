import apiClient from "@/lib/api";
import type { ApiResponse, Subscription, SubscriptionTier } from "@/types";

export type CheckoutPlan = "MONTHLY" | "YEARLY";

export const DEFAULT_CHECKOUT_RETURN_PATH = "/profile";

export type CheckoutStatus =
  | "active"
  | "pending"
  | "canceled"
  | "failed"
  | "expired";

export type PlanInfo = {
  tier: SubscriptionTier;
  label: string;
  amountMinor: number;
  currency: string;
  interval: "month" | "year" | null;
  features: string[];
};

export type CheckoutOutcome = {
  checkoutStatus: CheckoutStatus;
  returnPath: string;
  sessionId: string;
  subscription: Subscription;
};

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

export async function fetchCheckoutOutcome(
  sessionId: string,
  canceled = false,
): Promise<CheckoutOutcome> {
  const { data } = await apiClient.get<ApiResponse<CheckoutOutcome>>(
    "/payments/checkout/outcome",
    {
      params: {
        sessionId,
        canceled: canceled ? "true" : undefined,
      },
    },
  );

  return data.data;
}

export async function fetchPlans(): Promise<PlanInfo[]> {
  const { data } =
    await apiClient.get<ApiResponse<{ plans: PlanInfo[] }>>("/payments/plans");
  return data.data.plans;
}

export function buildPricingHref(returnPath: string): string {
  if (returnPath === DEFAULT_CHECKOUT_RETURN_PATH) {
    return "/pricing";
  }

  return `/pricing?return=${encodeURIComponent(returnPath)}`;
}

export function appendCheckoutStatus(
  returnPath: string,
  status: CheckoutStatus,
): string {
  const [path, query = ""] = returnPath.split("?");
  const params = new URLSearchParams(query);
  params.set("checkout", status);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}
