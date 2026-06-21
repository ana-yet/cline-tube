import Stripe from "stripe";
import prisma from "../config/prisma";
import { env } from "../config/env";
import { ApiError } from "../utils/errors";

/**
 * Payment Service
 *
 * Handles Stripe integration for subscriptions.
 *
 * Plans:
 * - MONTHLY: $9.99/month
 * - YEARLY: $99.99/year (17% discount)
 *
 * Security:
 * - Prices are server-side only (never trust client)
 * - Webhook signature verification required
 * - Stripe customer created on first checkout
 */

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-05-27.dahlia",
});

// ── Plan Pricing (server-side, never trust client) ────────

const PLAN_PRICES: Record<
  string,
  { amount: number; interval: "month" | "year" }
> = {
  MONTHLY: { amount: 999, interval: "month" }, // $9.99
  YEARLY: { amount: 9999, interval: "year" }, // $99.99
};

// ── Create or Get Stripe Customer ─────────────────────────

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

  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });

  return customer.id;
}

// ── Create Checkout Session ───────────────────────────────

export async function createCheckoutSession(
  userId: string,
  email: string,
  plan: string,
) {
  const planConfig = PLAN_PRICES[plan];
  if (!planConfig) {
    throw new ApiError(
      400,
      "Invalid plan. Must be MONTHLY or YEARLY",
      "INVALID_PLAN",
    );
  }

  const customerId = await getOrCreateStripeCustomer(userId, email);

  // Create or get subscription record
  const now = new Date();
  await prisma.subscription.upsert({
    where: { userId },
    update: { stripeCustomerId: customerId },
    create: {
      userId,
      tier: "FREE",
      status: "ACTIVE",
      stripeCustomerId: customerId,
      currentPeriodStart: now,
      currentPeriodEnd: now,
    },
  });

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `CineTube ${plan === "MONTHLY" ? "Monthly" : "Annual"} Plan`,
            description: "Access to all premium movies and series",
          },
          unit_amount: planConfig.amount,
          recurring: { interval: planConfig.interval },
        },
        quantity: 1,
      },
    ],
    success_url: `${env.FRONTEND_URL}/profile?success=true`,
    cancel_url: `${env.FRONTEND_URL}/pricing?canceled=true`,
    metadata: { userId, plan },
    subscription_data: {
      metadata: { userId, plan },
    },
  });

  return { sessionId: session.id, url: session.url };
}

// ── Get User Subscription ─────────────────────────────────

export async function getSubscription(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: {
      id: true,
      tier: true,
      status: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      createdAt: true,
    },
  });

  if (!subscription) {
    // Create default FREE subscription
    const now = new Date();
    return prisma.subscription.create({
      data: {
        userId,
        tier: "FREE",
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: now,
      },
    });
  }

  return subscription;
}

// ── Cancel Subscription ───────────────────────────────────

export async function cancelSubscription(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: {
      id: true,
      stripeSubscriptionId: true,
      tier: true,
      status: true,
    },
  });

  if (!subscription) {
    throw new ApiError(404, "No subscription found", "NOT_FOUND");
  }

  if (subscription.tier === "FREE") {
    throw new ApiError(400, "Cannot cancel a free plan", "ALREADY_FREE");
  }

  if (!subscription.stripeSubscriptionId) {
    throw new ApiError(400, "No active Stripe subscription", "NO_STRIPE_SUB");
  }

  // Cancel at period end (user keeps access until then)
  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  await prisma.subscription.update({
    where: { userId },
    data: { status: "CANCELED" },
  });

  return {
    message: "Subscription will cancel at the end of the billing period",
  };
}

// ── Handle Webhook Events ─────────────────────────────────

export async function handleWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan;

      if (!userId || !plan) break;

      const subscriptionId = session.subscription as string;
      const stripeSubscription =
        await stripe.subscriptions.retrieve(subscriptionId);

      const periodStart = new Date(
        stripeSubscription.items.data[0].current_period_start * 1000,
      );
      const periodEnd = new Date(
        stripeSubscription.items.data[0].current_period_end * 1000,
      );

      await prisma.$transaction([
        prisma.subscription.update({
          where: { userId },
          data: {
            tier: plan as "MONTHLY" | "YEARLY",
            status: "ACTIVE",
            stripeSubscriptionId: subscriptionId,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
          },
        }),
        prisma.transaction.create({
          data: {
            userId,
            amount: (session.amount_total ?? 0) / 100,
            currency: session.currency?.toUpperCase() ?? "USD",
            status: "SUCCESS",
            provider: "stripe",
            providerTxnId: (session.payment_intent as string) || session.id,
            type: "SUBSCRIPTION",
          },
        }),
      ]);
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = (invoice as unknown as Record<string, unknown>)
        .subscription as string;

      if (!subscriptionId) break;

      const stripeSubscription =
        await stripe.subscriptions.retrieve(subscriptionId);
      const userId = stripeSubscription.metadata?.userId;

      if (!userId) break;

      const periodStart = new Date(
        stripeSubscription.items.data[0].current_period_start * 1000,
      );
      const periodEnd = new Date(
        stripeSubscription.items.data[0].current_period_end * 1000,
      );

      await prisma.$transaction([
        prisma.subscription.update({
          where: { userId },
          data: {
            status: "ACTIVE",
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
          },
        }),
        prisma.transaction.create({
          data: {
            userId,
            amount: (invoice.amount_paid ?? 0) / 100,
            currency: invoice.currency?.toUpperCase() ?? "USD",
            status: "SUCCESS",
            provider: "stripe",
            providerTxnId: invoice.id,
            type: "SUBSCRIPTION",
          },
        }),
      ]);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = (invoice as unknown as Record<string, unknown>)
        .subscription as string;

      if (!subscriptionId) break;

      const stripeSubscription =
        await stripe.subscriptions.retrieve(subscriptionId);
      const userId = stripeSubscription.metadata?.userId;

      if (!userId) break;

      await prisma.subscription.update({
        where: { userId },
        data: { status: "PAST_DUE" },
      });
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;

      if (!userId) break;

      const periodStart = new Date(
        subscription.items.data[0].current_period_start * 1000,
      );
      const periodEnd = new Date(
        subscription.items.data[0].current_period_end * 1000,
      );

      let status: "ACTIVE" | "CANCELED" | "PAST_DUE" = "ACTIVE";
      if (subscription.cancel_at_period_end) status = "CANCELED";
      if (subscription.status === "past_due") status = "PAST_DUE";

      await prisma.subscription.update({
        where: { userId },
        data: {
          status,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;

      if (!userId) break;

      await prisma.subscription.update({
        where: { userId },
        data: {
          tier: "FREE",
          status: "ACTIVE",
          stripeSubscriptionId: null,
        },
      });
      break;
    }
  }
}

// ── Verify Webhook Signature ──────────────────────────────

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

// ── Admin: Get Revenue Stats ──────────────────────────────

export async function getRevenueStats() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [
    totalRevenue,
    monthlyRevenue,
    yearlyRevenue,
    activeSubscribers,
    recentTransactions,
  ] = await Promise.all([
    prisma.transaction.aggregate({
      where: { status: "SUCCESS" },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { status: "SUCCESS", createdAt: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { status: "SUCCESS", createdAt: { gte: yearStart } },
      _sum: { amount: true },
    }),
    prisma.subscription.count({
      where: {
        tier: { not: "FREE" },
        status: "ACTIVE",
      },
    }),
    prisma.transaction.findMany({
      where: { status: "SUCCESS" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        amount: true,
        currency: true,
        type: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
    }),
  ]);

  return {
    totalRevenue: Number(totalRevenue._sum.amount ?? 0),
    monthlyRevenue: Number(monthlyRevenue._sum.amount ?? 0),
    yearlyRevenue: Number(yearlyRevenue._sum.amount ?? 0),
    activeSubscribers,
    recentTransactions: recentTransactions.map((t) => ({
      ...t,
      amount: Number(t.amount),
    })),
  };
}
