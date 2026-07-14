import { SubscriptionStatus, SubscriptionTier } from "@prisma/client";
import prisma from "../config/prisma";

type EntitlementSubscription = {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodEnd: Date;
  gracePeriodEnd?: Date | null;
  revokedAt?: Date | null;
};

export type PremiumEntitlement = {
  active: boolean;
  reason:
    | "FREE_PLAN"
    | "NO_SUBSCRIPTION"
    | "ACTIVE_PERIOD"
    | "TRIAL_PERIOD"
    | "PAST_DUE_GRACE"
    | "REVOKED"
    | "EXPIRED"
    | "INACTIVE_STATUS";
};

export function computePremiumEntitlement(
  subscription: EntitlementSubscription | null,
  now = new Date(),
): PremiumEntitlement {
  if (!subscription) {
    return { active: false, reason: "NO_SUBSCRIPTION" };
  }

  if (subscription.tier === SubscriptionTier.FREE) {
    return { active: false, reason: "FREE_PLAN" };
  }

  if (subscription.revokedAt && subscription.revokedAt <= now) {
    return { active: false, reason: "REVOKED" };
  }

  if (subscription.currentPeriodEnd <= now) {
    return { active: false, reason: "EXPIRED" };
  }

  if (subscription.status === SubscriptionStatus.ACTIVE) {
    return { active: true, reason: "ACTIVE_PERIOD" };
  }

  if (subscription.status === SubscriptionStatus.TRIALING) {
    return { active: true, reason: "TRIAL_PERIOD" };
  }

  if (
    subscription.status === SubscriptionStatus.PAST_DUE &&
    subscription.gracePeriodEnd &&
    subscription.gracePeriodEnd > now
  ) {
    return { active: true, reason: "PAST_DUE_GRACE" };
  }

  return { active: false, reason: "INACTIVE_STATUS" };
}

export async function userHasPremiumAccess(
  userId?: string,
  now = new Date(),
): Promise<boolean> {
  if (!userId) {
    return false;
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: {
      tier: true,
      status: true,
      currentPeriodEnd: true,
      gracePeriodEnd: true,
      revokedAt: true,
    },
  });

  return computePremiumEntitlement(subscription, now).active;
}
