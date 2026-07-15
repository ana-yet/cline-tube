-- Phase 4 billing expansion: durable Stripe event ledger, checkout attempts,
-- invoice-led transactions, subscription lifecycle fields, and adjustments.
-- This is expand-only; historical financial rows are retained for review.

CREATE TYPE "CheckoutAttemptStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELED', 'FAILED', 'EXPIRED');
CREATE TYPE "StripeEventStatus" AS ENUM ('PROCESSING', 'PROCESSED', 'FAILED', 'SKIPPED');
CREATE TYPE "PaymentAdjustmentType" AS ENUM ('REFUND', 'DISPUTE');
CREATE TYPE "PaymentAdjustmentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELED');

ALTER TABLE "Subscription"
  ADD COLUMN "providerStatus" TEXT,
  ADD COLUMN "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canceledAt" TIMESTAMP(3),
  ADD COLUMN "cancelAt" TIMESTAMP(3),
  ADD COLUMN "endedAt" TIMESTAMP(3),
  ADD COLUMN "gracePeriodEnd" TIMESTAMP(3),
  ADD COLUMN "revokedAt" TIMESTAMP(3),
  ADD COLUMN "revokedReason" TEXT,
  ADD COLUMN "priceLookupKey" TEXT,
  ADD COLUMN "lastProviderEventTime" TIMESTAMP(3);

ALTER TABLE "Transaction"
  ADD COLUMN "amountMinor" INTEGER,
  ADD COLUMN "providerInvoiceId" TEXT,
  ADD COLUMN "providerPaymentIntentId" TEXT,
  ADD COLUMN "servicePeriodStart" TIMESTAMP(3),
  ADD COLUMN "servicePeriodEnd" TIMESTAMP(3),
  ADD COLUMN "paidAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3);

UPDATE "Transaction"
SET
  "amountMinor" = ROUND(("amount" * 100)::numeric)::integer,
  "providerInvoiceId" = CASE
    WHEN "providerTxnId" LIKE 'in\_%' ESCAPE '\' THEN "providerTxnId"
    ELSE "providerInvoiceId"
  END,
  "updatedAt" = "createdAt",
  "paidAt" = CASE WHEN "status" = 'SUCCESS' THEN "createdAt" ELSE NULL END
WHERE "amountMinor" IS NULL OR "updatedAt" IS NULL;

ALTER TABLE "Transaction"
  ALTER COLUMN "updatedAt" SET NOT NULL;

CREATE TABLE "CheckoutAttempt" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "plan" "SubscriptionTier" NOT NULL,
  "returnPath" VARCHAR(2048) NOT NULL,
  "status" "CheckoutAttemptStatus" NOT NULL DEFAULT 'PENDING',
  "stripeCustomerId" TEXT,
  "stripeCheckoutSessionId" TEXT,
  "stripeSubscriptionId" TEXT,
  "checkoutUrl" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "failureCode" TEXT,
  "failureMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CheckoutAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProcessedStripeEvent" (
  "id" TEXT NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "type" VARCHAR(120) NOT NULL,
  "providerObjectId" TEXT,
  "eventTime" TIMESTAMP(3) NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "status" "StripeEventStatus" NOT NULL DEFAULT 'PROCESSING',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "leaseExpiresAt" TIMESTAMP(3),
  "processedAt" TIMESTAMP(3),
  "errorClass" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProcessedStripeEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentAdjustment" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "transactionId" TEXT,
  "type" "PaymentAdjustmentType" NOT NULL,
  "status" "PaymentAdjustmentStatus" NOT NULL,
  "provider" VARCHAR(50) NOT NULL DEFAULT 'stripe',
  "providerAdjustmentId" TEXT NOT NULL,
  "providerChargeId" TEXT,
  "providerPaymentIntentId" TEXT,
  "amount" DECIMAL(10,2) NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
  "reason" TEXT,
  "providerCreatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PaymentAdjustment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Transaction_providerInvoiceId_key" ON "Transaction"("providerInvoiceId");
CREATE UNIQUE INDEX "Transaction_providerPaymentIntentId_key" ON "Transaction"("providerPaymentIntentId");
CREATE INDEX "Transaction_providerInvoiceId_idx" ON "Transaction"("providerInvoiceId");
CREATE INDEX "Transaction_providerPaymentIntentId_idx" ON "Transaction"("providerPaymentIntentId");

CREATE INDEX "Subscription_stripeSubscriptionId_idx" ON "Subscription"("stripeSubscriptionId");
CREATE INDEX "Subscription_lastProviderEventTime_idx" ON "Subscription"("lastProviderEventTime");

CREATE UNIQUE INDEX "CheckoutAttempt_stripeCheckoutSessionId_key" ON "CheckoutAttempt"("stripeCheckoutSessionId");
CREATE INDEX "CheckoutAttempt_userId_createdAt_idx" ON "CheckoutAttempt"("userId", "createdAt");
CREATE INDEX "CheckoutAttempt_status_expiresAt_idx" ON "CheckoutAttempt"("status", "expiresAt");
CREATE INDEX "CheckoutAttempt_stripeCheckoutSessionId_idx" ON "CheckoutAttempt"("stripeCheckoutSessionId");

CREATE UNIQUE INDEX "ProcessedStripeEvent_providerEventId_key" ON "ProcessedStripeEvent"("providerEventId");
CREATE INDEX "ProcessedStripeEvent_status_leaseExpiresAt_idx" ON "ProcessedStripeEvent"("status", "leaseExpiresAt");
CREATE INDEX "ProcessedStripeEvent_providerObjectId_eventTime_idx" ON "ProcessedStripeEvent"("providerObjectId", "eventTime");
CREATE INDEX "ProcessedStripeEvent_type_idx" ON "ProcessedStripeEvent"("type");

CREATE UNIQUE INDEX "PaymentAdjustment_providerAdjustmentId_key" ON "PaymentAdjustment"("providerAdjustmentId");
CREATE INDEX "PaymentAdjustment_userId_idx" ON "PaymentAdjustment"("userId");
CREATE INDEX "PaymentAdjustment_transactionId_idx" ON "PaymentAdjustment"("transactionId");
CREATE INDEX "PaymentAdjustment_providerPaymentIntentId_idx" ON "PaymentAdjustment"("providerPaymentIntentId");
CREATE INDEX "PaymentAdjustment_createdAt_idx" ON "PaymentAdjustment"("createdAt");

ALTER TABLE "CheckoutAttempt"
  ADD CONSTRAINT "CheckoutAttempt_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PaymentAdjustment"
  ADD CONSTRAINT "PaymentAdjustment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PaymentAdjustment"
  ADD CONSTRAINT "PaymentAdjustment_transactionId_fkey"
  FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
