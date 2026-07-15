import crypto from "crypto";
import Stripe from "stripe";
import {
  CheckoutAttemptStatus,
  PaymentAdjustmentStatus,
  PaymentAdjustmentType,
  Prisma,
  StripeEventStatus,
  SubscriptionStatus,
  SubscriptionTier,
  TransactionStatus,
} from "@prisma/client";
import prisma from "../config/prisma";
import { env } from "../config/env";
import { ApiError } from "../utils/errors";
import {
  computePremiumEntitlement,
  type PremiumEntitlement,
} from "./entitlement.service";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-05-27.dahlia",
});

type PaidPlan = Exclude<SubscriptionTier, "FREE">;

const PLAN_PRICES: Record<
  PaidPlan,
  {
    amountMinor: number;
    currency: "USD";
    interval: "month" | "year";
    label: string;
    lookupKey: string;
    features: string[];
  }
> = {
  MONTHLY: {
    amountMinor: 999,
    currency: "USD",
    interval: "month",
    label: "CinePass Monthly",
    lookupKey: "cinetube_monthly",
    features: [
      "Premium catalog access",
      "Ad-free browsing",
      "HD streaming links",
      "Cancel at period end",
    ],
  },
  YEARLY: {
    amountMinor: 9999,
    currency: "USD",
    interval: "year",
    label: "CinePass Annual",
    lookupKey: "cinetube_yearly",
    features: [
      "Everything in Monthly",
      "Annual price savings",
      "Priority streaming servers",
      "Cancel at period end",
    ],
  },
};

const DEFAULT_CHECKOUT_RETURN_PATH = "/profile";
const CHECKOUT_ATTEMPT_TTL_MS = 24 * 60 * 60 * 1000;
const WEBHOOK_LEASE_MS = 5 * 60 * 1000;

const ALLOWED_RETURN_EXACT = new Set([
  "/",
  DEFAULT_CHECKOUT_RETURN_PATH,
  "/pricing",
  "/watchlist",
]);
const ALLOWED_RETURN_PREFIXES = ["/browse/"];

type SubscriptionDto = {
  id: string | null;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  renewsAt: string | null;
  cancelsAt: string | null;
  entitlement: PremiumEntitlement;
  createdAt: string | null;
};

type CheckoutStatus = "active" | "pending" | "canceled" | "failed" | "expired";

function sanitizeReturnPath(returnPath?: string): string {
  if (!returnPath || typeof returnPath !== "string") {
    return DEFAULT_CHECKOUT_RETURN_PATH;
  }

  const trimmed = returnPath.trim();

  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.includes("\\") ||
    /[\r\n]/.test(trimmed)
  ) {
    return DEFAULT_CHECKOUT_RETURN_PATH;
  }

  try {
    const appOrigin = new URL(env.FRONTEND_URL).origin;
    const url = new URL(trimmed, appOrigin);

    if (url.origin !== appOrigin || !isAllowedReturnPath(url.pathname)) {
      return DEFAULT_CHECKOUT_RETURN_PATH;
    }

    return `${url.pathname}${url.search}`;
  } catch {
    return DEFAULT_CHECKOUT_RETURN_PATH;
  }
}

function isAllowedReturnPath(pathname: string): boolean {
  return (
    ALLOWED_RETURN_EXACT.has(pathname) ||
    ALLOWED_RETURN_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

function buildCheckoutReturnUrl(canceled = false): string {
  const base = new URL("/checkout/return", env.FRONTEND_URL).href;
  const suffix = canceled ? "&canceled=true" : "";
  return `${base}?session_id={CHECKOUT_SESSION_ID}${suffix}`;
}

function decimalFromMinor(amountMinor: number): Prisma.Decimal {
  return new Prisma.Decimal(amountMinor).div(100);
}

function dateFromStripeSeconds(value?: number | null): Date | null {
  return typeof value === "number" ? new Date(value * 1000) : null;
}

function getObjectId(object: unknown): string | null {
  if (object && typeof object === "object" && "id" in object) {
    const id = (object as { id?: unknown }).id;
    return typeof id === "string" ? id : null;
  }

  return null;
}

function getSubscriptionId(value: unknown): string | null {
  if (typeof value === "string") return value;
  return getObjectId(value);
}

function getPaymentIntentId(value: unknown): string | null {
  if (typeof value === "string") return value;
  return getObjectId(value);
}

function subscriptionPeriod(subscription: Stripe.Subscription): {
  periodStart: Date;
  periodEnd: Date;
} {
  const item = subscription.items.data[0] as
    | (Stripe.SubscriptionItem & {
        current_period_start?: number;
        current_period_end?: number;
      })
    | undefined;
  const fallback = subscription as Stripe.Subscription & {
    current_period_start?: number;
    current_period_end?: number;
  };

  const periodStart =
    dateFromStripeSeconds(item?.current_period_start) ??
    dateFromStripeSeconds(fallback.current_period_start) ??
    new Date();
  const periodEnd =
    dateFromStripeSeconds(item?.current_period_end) ??
    dateFromStripeSeconds(fallback.current_period_end) ??
    periodStart;

  return { periodStart, periodEnd };
}

function invoicePeriod(
  invoice: Stripe.Invoice,
  subscription: Stripe.Subscription,
): { periodStart: Date; periodEnd: Date } {
  const line = invoice.lines?.data?.[0];
  const periodStart = dateFromStripeSeconds(line?.period?.start);
  const periodEnd = dateFromStripeSeconds(line?.period?.end);

  if (periodStart && periodEnd) {
    return { periodStart, periodEnd };
  }

  return subscriptionPeriod(subscription);
}

function planFromSubscription(subscription: Stripe.Subscription): PaidPlan {
  const metadataPlan = subscription.metadata?.plan;
  if (metadataPlan === "MONTHLY" || metadataPlan === "YEARLY") {
    return metadataPlan;
  }

  const interval = subscription.items.data[0]?.price?.recurring?.interval;
  return interval === "year" ? "YEARLY" : "MONTHLY";
}

function mapStripeSubscriptionStatus(status: string): SubscriptionStatus {
  switch (status) {
    case "active":
      return SubscriptionStatus.ACTIVE;
    case "trialing":
      return SubscriptionStatus.TRIALING;
    case "past_due":
      return SubscriptionStatus.PAST_DUE;
    case "canceled":
    case "unpaid":
      return SubscriptionStatus.CANCELED;
    default:
      return SubscriptionStatus.INCOMPLETE;
  }
}

function toEventTime(event: Stripe.Event): Date {
  return new Date(event.created * 1000);
}

function hashEvent(event: Stripe.Event): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(event.data.object))
    .digest("hex");
}

function truncateErrorMessage(message: string): string {
  return message.length > 1000 ? `${message.slice(0, 997)}...` : message;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

function serializeSubscription(
  subscription: {
    id: string;
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    cancelAtPeriodEnd: boolean;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    gracePeriodEnd: Date | null;
    revokedAt: Date | null;
    createdAt: Date;
  } | null,
): SubscriptionDto {
  const entitlement = computePremiumEntitlement(subscription);

  if (!subscription) {
    return {
      id: null,
      tier: SubscriptionTier.FREE,
      status: SubscriptionStatus.ACTIVE,
      cancelAtPeriodEnd: false,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      renewsAt: null,
      cancelsAt: null,
      entitlement,
      createdAt: null,
    };
  }

  return {
    id: subscription.id,
    tier: subscription.tier,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    currentPeriodStart: subscription.currentPeriodStart.toISOString(),
    currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
    renewsAt:
      entitlement.active && !subscription.cancelAtPeriodEnd
        ? subscription.currentPeriodEnd.toISOString()
        : null,
    cancelsAt: subscription.cancelAtPeriodEnd
      ? subscription.currentPeriodEnd.toISOString()
      : null,
    entitlement,
    createdAt: subscription.createdAt.toISOString(),
  };
}

export function listPlans() {
  return [
    {
      tier: SubscriptionTier.FREE,
      label: "Free Pass",
      amountMinor: 0,
      currency: "USD",
      interval: null,
      features: ["Browse free titles", "Reviews", "Watchlist"],
    },
    ...Object.entries(PLAN_PRICES).map(([tier, config]) => ({
      tier,
      label: config.label,
      amountMinor: config.amountMinor,
      currency: config.currency,
      interval: config.interval,
      features: config.features,
    })),
  ];
}

async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
): Promise<string> {
  const existing = await prisma.subscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  });

  if (existing?.stripeCustomerId) {
    return existing.stripeCustomerId;
  }

  const customer = await stripe.customers.create(
    {
      email,
      metadata: { userId },
    },
    { idempotencyKey: `customer:${userId}` },
  );

  const now = new Date();
  await prisma.subscription.upsert({
    where: { userId },
    update: { stripeCustomerId: customer.id },
    create: {
      userId,
      tier: SubscriptionTier.FREE,
      status: SubscriptionStatus.INCOMPLETE,
      stripeCustomerId: customer.id,
      providerStatus: "customer_created",
      currentPeriodStart: now,
      currentPeriodEnd: now,
    },
  });

  return customer.id;
}

export async function createCheckoutSession(
  userId: string,
  email: string,
  plan: string,
  returnPath?: string,
) {
  if (plan !== "MONTHLY" && plan !== "YEARLY") {
    throw new ApiError(
      400,
      "Invalid plan. Must be MONTHLY or YEARLY",
      "INVALID_PLAN",
    );
  }

  const existingSubscription = await prisma.subscription.findUnique({
    where: { userId },
    select: {
      tier: true,
      status: true,
      currentPeriodEnd: true,
      gracePeriodEnd: true,
      revokedAt: true,
    },
  });

  if (computePremiumEntitlement(existingSubscription).active) {
    throw new ApiError(
      409,
      "You already have an active premium subscription",
      "ACTIVE_SUBSCRIPTION_EXISTS",
    );
  }

  const safeReturnPath = sanitizeReturnPath(returnPath);
  const now = new Date();
  const existingAttempt = await prisma.checkoutAttempt.findFirst({
    where: {
      userId,
      plan,
      returnPath: safeReturnPath,
      status: CheckoutAttemptStatus.PENDING,
      expiresAt: { gt: now },
      checkoutUrl: { not: null },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existingAttempt?.checkoutUrl) {
    return {
      attemptId: existingAttempt.id,
      sessionId: existingAttempt.stripeCheckoutSessionId,
      url: existingAttempt.checkoutUrl,
    };
  }

  const customerId = await getOrCreateStripeCustomer(userId, email);
  const expiresAt = new Date(now.getTime() + CHECKOUT_ATTEMPT_TTL_MS);
  const attempt = await prisma.checkoutAttempt.create({
    data: {
      userId,
      plan,
      returnPath: safeReturnPath,
      stripeCustomerId: customerId,
      expiresAt,
    },
  });

  const planConfig = PLAN_PRICES[plan];

  try {
    const session = await stripe.checkout.sessions.create(
      {
        customer: customerId,
        mode: "subscription",
        payment_method_types: ["card"],
        client_reference_id: attempt.id,
        line_items: [
          {
            price_data: {
              currency: planConfig.currency.toLowerCase(),
              product_data: {
                name: planConfig.label,
                description: "Access to CineTube premium movies and series",
              },
              unit_amount: planConfig.amountMinor,
              recurring: { interval: planConfig.interval },
            },
            quantity: 1,
          },
        ],
        success_url: buildCheckoutReturnUrl(),
        cancel_url: buildCheckoutReturnUrl(true),
        metadata: {
          userId,
          plan,
          checkoutAttemptId: attempt.id,
          returnPath: safeReturnPath,
        },
        subscription_data: {
          metadata: {
            userId,
            plan,
            checkoutAttemptId: attempt.id,
          },
        },
      },
      { idempotencyKey: `checkout:${attempt.id}` },
    );

    await prisma.checkoutAttempt.update({
      where: { id: attempt.id },
      data: {
        stripeCheckoutSessionId: session.id,
        checkoutUrl: session.url,
        expiresAt: dateFromStripeSeconds(session.expires_at) ?? expiresAt,
      },
    });

    return { attemptId: attempt.id, sessionId: session.id, url: session.url };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout failed";
    await prisma.checkoutAttempt.update({
      where: { id: attempt.id },
      data: {
        status: CheckoutAttemptStatus.FAILED,
        failureCode: "STRIPE_CHECKOUT_CREATE_FAILED",
        failureMessage: truncateErrorMessage(message),
      },
    });
    throw error;
  }
}

export async function getSubscription(userId: string): Promise<SubscriptionDto> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: {
      id: true,
      tier: true,
      status: true,
      cancelAtPeriodEnd: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      gracePeriodEnd: true,
      revokedAt: true,
      createdAt: true,
    },
  });

  return serializeSubscription(subscription);
}

export async function getCheckoutOutcome(
  userId: string,
  sessionId: string,
  canceled: boolean,
) {
  const attempt = await prisma.checkoutAttempt.findUnique({
    where: { stripeCheckoutSessionId: sessionId },
  });

  if (!attempt) {
    throw new ApiError(404, "Checkout attempt not found", "CHECKOUT_NOT_FOUND");
  }

  if (attempt.userId !== userId) {
    throw new ApiError(403, "Checkout attempt does not belong to this user", "FORBIDDEN");
  }

  let nextStatus = attempt.status;
  let stripeSubscriptionId = attempt.stripeSubscriptionId;

  if (canceled && attempt.status !== CheckoutAttemptStatus.COMPLETED) {
    nextStatus = CheckoutAttemptStatus.CANCELED;
    await prisma.checkoutAttempt.update({
      where: { id: attempt.id },
      data: { status: nextStatus, canceledAt: new Date() },
    });
  } else if (attempt.status === CheckoutAttemptStatus.PENDING) {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    stripeSubscriptionId = getSubscriptionId(session.subscription);

    if (session.status === "complete") {
      nextStatus = CheckoutAttemptStatus.COMPLETED;
      await prisma.checkoutAttempt.update({
        where: { id: attempt.id },
        data: {
          status: nextStatus,
          completedAt: new Date(),
          stripeSubscriptionId,
        },
      });
    } else if (session.status === "expired") {
      nextStatus = CheckoutAttemptStatus.EXPIRED;
      await prisma.checkoutAttempt.update({
        where: { id: attempt.id },
        data: { status: nextStatus },
      });
    }
  }

  const subscription = await getSubscription(userId);
  const checkoutStatus: CheckoutStatus = subscription.entitlement.active
    ? "active"
    : nextStatus === CheckoutAttemptStatus.CANCELED
      ? "canceled"
      : nextStatus === CheckoutAttemptStatus.FAILED
        ? "failed"
        : nextStatus === CheckoutAttemptStatus.EXPIRED
          ? "expired"
          : "pending";

  return {
    checkoutStatus,
    returnPath: attempt.returnPath,
    sessionId,
    subscription,
  };
}

export async function cancelSubscription(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: {
      id: true,
      stripeSubscriptionId: true,
      tier: true,
      status: true,
      cancelAtPeriodEnd: true,
    },
  });

  if (!subscription || subscription.tier === SubscriptionTier.FREE) {
    throw new ApiError(400, "No paid subscription found", "NO_PAID_SUBSCRIPTION");
  }

  if (!subscription.stripeSubscriptionId) {
    throw new ApiError(400, "No active Stripe subscription", "NO_STRIPE_SUB");
  }

  if (subscription.cancelAtPeriodEnd) {
    return {
      message: "Subscription is already scheduled to cancel at period end",
    };
  }

  const stripeSubscription = await stripe.subscriptions.update(
    subscription.stripeSubscriptionId,
    { cancel_at_period_end: true },
    {
      idempotencyKey: `cancel:${subscription.id}:${subscription.stripeSubscriptionId}`,
    },
  );

  await applySubscriptionProjection(stripeSubscription, new Date(), {
    force: true,
  });

  return {
    message: "Subscription will cancel at the end of the billing period",
  };
}

export async function resumeSubscription(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: {
      id: true,
      stripeSubscriptionId: true,
      tier: true,
      cancelAtPeriodEnd: true,
    },
  });

  if (!subscription || subscription.tier === SubscriptionTier.FREE) {
    throw new ApiError(400, "No paid subscription found", "NO_PAID_SUBSCRIPTION");
  }

  if (!subscription.stripeSubscriptionId) {
    throw new ApiError(400, "No active Stripe subscription", "NO_STRIPE_SUB");
  }

  if (!subscription.cancelAtPeriodEnd) {
    return { message: "Subscription is already active" };
  }

  const stripeSubscription = await stripe.subscriptions.update(
    subscription.stripeSubscriptionId,
    { cancel_at_period_end: false },
    {
      idempotencyKey: `resume:${subscription.id}:${subscription.stripeSubscriptionId}`,
    },
  );

  await applySubscriptionProjection(stripeSubscription, new Date(), {
    force: true,
  });

  return { message: "Subscription renewal resumed" };
}

async function userIdForSubscription(
  subscription: Stripe.Subscription,
): Promise<string | null> {
  if (subscription.metadata?.userId) {
    return subscription.metadata.userId;
  }

  const existing = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
    select: { userId: true },
  });

  return existing?.userId ?? null;
}

async function applySubscriptionProjection(
  subscription: Stripe.Subscription,
  eventTime: Date,
  options: { force?: boolean; checkoutOnly?: boolean } = {},
) {
  const userId = await userIdForSubscription(subscription);

  if (!userId) {
    return null;
  }

  const existing = await prisma.subscription.findUnique({
    where: { userId },
    select: { lastProviderEventTime: true },
  });

  if (
    !options.force &&
    existing?.lastProviderEventTime &&
    existing.lastProviderEventTime > eventTime
  ) {
    return null;
  }

  const { periodStart, periodEnd } = subscriptionPeriod(subscription);
  const plan = planFromSubscription(subscription);
  const providerStatus = subscription.status;
  const cancelAtPeriodEnd = Boolean(subscription.cancel_at_period_end);
  const stripeStatus = mapStripeSubscriptionStatus(subscription.status);
  const status = options.checkoutOnly
    ? SubscriptionStatus.INCOMPLETE
    : cancelAtPeriodEnd && stripeStatus === SubscriptionStatus.CANCELED
      ? SubscriptionStatus.ACTIVE
      : stripeStatus;
  const canceledAt = dateFromStripeSeconds(subscription.canceled_at);
  const cancelAt = dateFromStripeSeconds(subscription.cancel_at);
  const endedAt = dateFromStripeSeconds(subscription.ended_at);

  return prisma.subscription.upsert({
    where: { userId },
    update: {
      tier: plan,
      status,
      stripeCustomerId: getSubscriptionId(subscription.customer),
      stripeSubscriptionId: subscription.id,
      providerStatus,
      cancelAtPeriodEnd,
      canceledAt,
      cancelAt,
      endedAt,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      priceLookupKey: PLAN_PRICES[plan].lookupKey,
      lastProviderEventTime: eventTime,
      revokedAt: status === SubscriptionStatus.ACTIVE ? null : undefined,
      revokedReason: status === SubscriptionStatus.ACTIVE ? null : undefined,
    },
    create: {
      userId,
      tier: plan,
      status,
      stripeCustomerId: getSubscriptionId(subscription.customer),
      stripeSubscriptionId: subscription.id,
      providerStatus,
      cancelAtPeriodEnd,
      canceledAt,
      cancelAt,
      endedAt,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      priceLookupKey: PLAN_PRICES[plan].lookupKey,
      lastProviderEventTime: eventTime,
    },
  });
}

export async function handleWebhookEvent(event: Stripe.Event) {
  const providerObjectId = getObjectId(event.data.object);
  const eventTime = toEventTime(event);
  const payloadHash = hashEvent(event);
  const leaseExpiresAt = new Date(Date.now() + WEBHOOK_LEASE_MS);

  let ledgerId: string | null = null;

  try {
    const ledger = await prisma.processedStripeEvent.create({
      data: {
        providerEventId: event.id,
        type: event.type,
        providerObjectId,
        eventTime,
        payloadHash,
        status: StripeEventStatus.PROCESSING,
        attemptCount: 1,
        leaseExpiresAt,
      },
    });
    ledgerId = ledger.id;
  } catch (error) {
    if (!isUniqueViolation(error)) {
      throw error;
    }

    const existing = await prisma.processedStripeEvent.findUnique({
      where: { providerEventId: event.id },
    });

    if (!existing) {
      throw error;
    }

    if (
      existing.status === StripeEventStatus.PROCESSED ||
      existing.status === StripeEventStatus.SKIPPED
    ) {
      return { duplicate: true, status: existing.status };
    }

    if (
      existing.status === StripeEventStatus.PROCESSING &&
      existing.leaseExpiresAt &&
      existing.leaseExpiresAt > new Date()
    ) {
      return { duplicate: true, status: existing.status };
    }

    const ledger = await prisma.processedStripeEvent.update({
      where: { providerEventId: event.id },
      data: {
        status: StripeEventStatus.PROCESSING,
        attemptCount: { increment: 1 },
        leaseExpiresAt,
        errorClass: null,
        errorMessage: null,
      },
    });
    ledgerId = ledger.id;
  }

  try {
    const result = await processStripeEvent(event);
    await prisma.processedStripeEvent.update({
      where: { id: ledgerId! },
      data: {
        status: result.skipped
          ? StripeEventStatus.SKIPPED
          : StripeEventStatus.PROCESSED,
        processedAt: new Date(),
        leaseExpiresAt: null,
      },
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook failed";
    await prisma.processedStripeEvent.update({
      where: { id: ledgerId! },
      data: {
        status: StripeEventStatus.FAILED,
        leaseExpiresAt: null,
        errorClass: error instanceof Error ? error.name : "Error",
        errorMessage: truncateErrorMessage(message),
      },
    });
    throw error;
  }
}

async function processStripeEvent(event: Stripe.Event): Promise<{
  skipped?: boolean;
}> {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(
        event.data.object as Stripe.Checkout.Session,
        toEventTime(event),
      );
      return {};

    case "invoice.paid":
      await handleInvoicePaid(event.data.object as Stripe.Invoice, toEventTime(event));
      return {};

    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(
        event.data.object as Stripe.Invoice,
        toEventTime(event),
      );
      return {};

    case "customer.subscription.updated":
      await applySubscriptionProjection(
        event.data.object as Stripe.Subscription,
        toEventTime(event),
      );
      return {};

    case "customer.subscription.deleted":
      await applySubscriptionProjection(
        event.data.object as Stripe.Subscription,
        toEventTime(event),
      );
      return {};

    case "charge.refunded":
      await handleChargeRefunded(event.data.object as Stripe.Charge);
      return {};

    case "refund.updated":
      await handleRefundUpdated(event.data.object as Stripe.Refund);
      return {};

    default:
      return { skipped: true };
  }
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  eventTime: Date,
) {
  const attemptId = session.metadata?.checkoutAttemptId ?? session.client_reference_id;
  const stripeSubscriptionId = getSubscriptionId(session.subscription);

  if (attemptId) {
    await prisma.checkoutAttempt.updateMany({
      where: { id: attemptId },
      data: {
        status: CheckoutAttemptStatus.COMPLETED,
        completedAt: new Date(),
        stripeCheckoutSessionId: session.id,
        stripeSubscriptionId,
      },
    });
  }

  if (stripeSubscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    await applySubscriptionProjection(subscription, eventTime, {
      checkoutOnly: true,
    });
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice, eventTime: Date) {
  const subscriptionId = getSubscriptionId(
    (invoice as Stripe.Invoice & { subscription?: unknown }).subscription,
  );

  if (!subscriptionId || !invoice.id) {
    return;
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
  const subscription = await applySubscriptionProjection(stripeSubscription, eventTime);
  const userId = subscription?.userId ?? (await userIdForSubscription(stripeSubscription));

  if (!userId) {
    return;
  }

  const { periodStart, periodEnd } = invoicePeriod(invoice, stripeSubscription);
  const amountMinor = invoice.amount_paid ?? 0;
  const currency = invoice.currency?.toUpperCase() ?? "USD";
  const paymentIntentId = getPaymentIntentId(
    (invoice as Stripe.Invoice & { payment_intent?: unknown }).payment_intent,
  );
  const paidAt =
    dateFromStripeSeconds(invoice.status_transitions?.paid_at) ?? eventTime;

  await prisma.$transaction(async (tx) => {
    const existingTransaction = await tx.transaction.findFirst({
      where: {
        OR: [
          { providerInvoiceId: invoice.id },
          { providerTxnId: invoice.id },
        ],
      },
      select: { id: true },
    });

    const data = {
      userId,
      subscriptionId: subscription?.id ?? null,
      amount: decimalFromMinor(amountMinor),
      amountMinor,
      currency,
      status: TransactionStatus.SUCCESS,
      provider: "stripe",
      providerTxnId: invoice.id,
      providerInvoiceId: invoice.id,
      providerPaymentIntentId: paymentIntentId,
      type: "SUBSCRIPTION",
      servicePeriodStart: periodStart,
      servicePeriodEnd: periodEnd,
      paidAt,
    };

    if (existingTransaction) {
      await tx.transaction.update({
        where: { id: existingTransaction.id },
        data,
      });
      return;
    }

    await tx.transaction.create({ data });
  });
}

async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  eventTime: Date,
) {
  const subscriptionId = getSubscriptionId(
    (invoice as Stripe.Invoice & { subscription?: unknown }).subscription,
  );

  if (!subscriptionId) {
    return;
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
  await applySubscriptionProjection(stripeSubscription, eventTime, {
    force: false,
  });
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const refunds = charge.refunds?.data ?? [];

  for (const refund of refunds) {
    await recordRefundAdjustment(refund, charge);
  }
}

async function handleRefundUpdated(refund: Stripe.Refund) {
  await recordRefundAdjustment(refund);
}

async function recordRefundAdjustment(
  refund: Stripe.Refund,
  charge?: Stripe.Charge,
) {
  const paymentIntentId =
    getPaymentIntentId(refund.payment_intent) ??
    getPaymentIntentId(charge?.payment_intent);
  const transaction = paymentIntentId
    ? await prisma.transaction.findUnique({
        where: { providerPaymentIntentId: paymentIntentId },
        select: {
          id: true,
          userId: true,
          subscriptionId: true,
          amountMinor: true,
          servicePeriodStart: true,
          servicePeriodEnd: true,
        },
      })
    : null;

  const amountMinor = -Math.abs(refund.amount ?? 0);
  const status =
    refund.status === "succeeded"
      ? PaymentAdjustmentStatus.SUCCEEDED
      : refund.status === "failed"
        ? PaymentAdjustmentStatus.FAILED
        : refund.status === "canceled"
          ? PaymentAdjustmentStatus.CANCELED
          : PaymentAdjustmentStatus.PENDING;

  await prisma.paymentAdjustment.upsert({
    where: { providerAdjustmentId: refund.id },
    update: {
      userId: transaction?.userId ?? null,
      transactionId: transaction?.id ?? null,
      status,
      amount: decimalFromMinor(amountMinor),
      amountMinor,
      currency: refund.currency?.toUpperCase() ?? "USD",
      reason: refund.reason ?? null,
      providerCreatedAt: dateFromStripeSeconds(refund.created),
      providerChargeId: getSubscriptionId(refund.charge) ?? charge?.id ?? null,
      providerPaymentIntentId: paymentIntentId,
    },
    create: {
      userId: transaction?.userId ?? null,
      transactionId: transaction?.id ?? null,
      type: PaymentAdjustmentType.REFUND,
      status,
      providerAdjustmentId: refund.id,
      providerChargeId: getSubscriptionId(refund.charge) ?? charge?.id ?? null,
      providerPaymentIntentId: paymentIntentId,
      amount: decimalFromMinor(amountMinor),
      amountMinor,
      currency: refund.currency?.toUpperCase() ?? "USD",
      reason: refund.reason ?? null,
      providerCreatedAt: dateFromStripeSeconds(refund.created),
    },
  });

  if (
    status === PaymentAdjustmentStatus.SUCCEEDED &&
    transaction?.subscriptionId &&
    transaction.amountMinor !== null
  ) {
    await revokeForFullCurrentPeriodRefund(transaction);
  }
}

async function revokeForFullCurrentPeriodRefund(transaction: {
  id: string;
  subscriptionId: string | null;
  amountMinor: number | null;
  servicePeriodStart: Date | null;
  servicePeriodEnd: Date | null;
}) {
  if (!transaction.subscriptionId || transaction.amountMinor === null) {
    return;
  }

  const now = new Date();
  if (
    transaction.servicePeriodStart &&
    transaction.servicePeriodStart > now
  ) {
    return;
  }

  if (transaction.servicePeriodEnd && transaction.servicePeriodEnd <= now) {
    return;
  }

  const adjustments = await prisma.paymentAdjustment.aggregate({
    where: {
      transactionId: transaction.id,
      status: PaymentAdjustmentStatus.SUCCEEDED,
    },
    _sum: { amountMinor: true },
  });

  const refundedMinor = Math.abs(adjustments._sum.amountMinor ?? 0);

  if (refundedMinor >= transaction.amountMinor) {
    await prisma.subscription.update({
      where: { id: transaction.subscriptionId },
      data: {
        revokedAt: now,
        revokedReason: "FULL_REFUND",
      },
    });
  }
}

export function constructWebhookEvent(
  payload: Buffer,
  signature: string,
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    env.STRIPE_WEBHOOK_SECRET,
  );
}

function canonicalRevenueWhere(
  since?: Date,
): Prisma.TransactionWhereInput {
  return {
    status: TransactionStatus.SUCCESS,
    providerInvoiceId: { not: null },
    ...(since ? { paidAt: { gte: since } } : {}),
  };
}

function adjustmentRevenueWhere(
  since?: Date,
): Prisma.PaymentAdjustmentWhereInput {
  return {
    status: PaymentAdjustmentStatus.SUCCEEDED,
    ...(since ? { providerCreatedAt: { gte: since } } : {}),
  };
}

async function netRevenueMinor(since?: Date): Promise<number> {
  const [gross, adjustments] = await Promise.all([
    prisma.transaction.aggregate({
      where: canonicalRevenueWhere(since),
      _sum: { amountMinor: true },
    }),
    prisma.paymentAdjustment.aggregate({
      where: adjustmentRevenueWhere(since),
      _sum: { amountMinor: true },
    }),
  ]);

  return (gross._sum.amountMinor ?? 0) + (adjustments._sum.amountMinor ?? 0);
}

export async function getRevenueStats() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [
    totalRevenueMinor,
    monthlyRevenueMinor,
    yearlyRevenueMinor,
    activeSubscribers,
    recentTransactions,
  ] = await Promise.all([
    netRevenueMinor(),
    netRevenueMinor(monthStart),
    netRevenueMinor(yearStart),
    prisma.subscription.count({
      where: {
        tier: { not: SubscriptionTier.FREE },
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
        currentPeriodEnd: { gt: now },
        revokedAt: null,
      },
    }),
    prisma.transaction.findMany({
      where: canonicalRevenueWhere(),
      orderBy: { paidAt: "desc" },
      take: 10,
      select: {
        id: true,
        amount: true,
        amountMinor: true,
        currency: true,
        type: true,
        paidAt: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
    }),
  ]);

  return {
    totalRevenue: totalRevenueMinor / 100,
    monthlyRevenue: monthlyRevenueMinor / 100,
    yearlyRevenue: yearlyRevenueMinor / 100,
    activeSubscribers,
    recentTransactions: recentTransactions.map((transaction) => ({
      ...transaction,
      amount: Number(transaction.amount),
      amountMinor: transaction.amountMinor ?? Number(transaction.amount) * 100,
    })),
  };
}

export async function getLocalReconciliationReport(days = 30) {
  const windowStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const now = new Date();

  const [
    pendingEvents,
    failedEvents,
    expiredAttempts,
    legacyCheckoutRevenueRows,
    missingInvoiceTransactions,
  ] = await Promise.all([
    prisma.processedStripeEvent.count({
      where: {
        status: StripeEventStatus.PROCESSING,
        createdAt: { gte: windowStart },
      },
    }),
    prisma.processedStripeEvent.count({
      where: {
        status: StripeEventStatus.FAILED,
        createdAt: { gte: windowStart },
      },
    }),
    prisma.checkoutAttempt.count({
      where: {
        status: CheckoutAttemptStatus.PENDING,
        expiresAt: { lt: now },
        createdAt: { gte: windowStart },
      },
    }),
    prisma.transaction.count({
      where: {
        status: TransactionStatus.SUCCESS,
        providerInvoiceId: null,
        createdAt: { gte: windowStart },
      },
    }),
    prisma.processedStripeEvent.count({
      where: {
        type: "invoice.paid",
        status: StripeEventStatus.PROCESSED,
        createdAt: { gte: windowStart },
        providerObjectId: {
          notIn: await prisma.transaction
            .findMany({
              where: {
                providerInvoiceId: { not: null },
                createdAt: { gte: windowStart },
              },
              select: { providerInvoiceId: true },
            })
            .then((rows) =>
              rows
                .map((row) => row.providerInvoiceId)
                .filter((id): id is string => Boolean(id)),
            ),
        },
      },
    }),
  ]);

  return {
    mode: "dry_run",
    windowDays: days,
    checkedAt: now.toISOString(),
    pendingEvents,
    failedEvents,
    expiredAttempts,
    legacyCheckoutRevenueRows,
    missingInvoiceTransactions,
    repairAvailable: false,
  };
}
