import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve(__dirname, "..");
const FRONTEND_SRC = path.resolve(__dirname, "../../../frontend/src");

function readBackend(relativePath: string): string {
  return fs.readFileSync(path.join(SRC, relativePath), "utf-8");
}

function readFrontend(relativePath: string): string {
  return fs.readFileSync(path.join(FRONTEND_SRC, relativePath), "utf-8");
}

function functionBody(src: string, signature: string): string {
  const fnStart = src.indexOf(signature);
  expect(fnStart).toBeGreaterThanOrEqual(0);

  const nextFunction = src.indexOf("\nasync function ", fnStart + 1);
  const nextExport = src.indexOf("\nexport ", fnStart + 1);
  const candidates = [nextFunction, nextExport].filter((index) => index > fnStart);
  const end = candidates.length ? Math.min(...candidates) : undefined;
  return src.slice(fnStart, end);
}

describe("Phase 4 payment invariants", () => {
  it("checkout completion never writes revenue", () => {
    const src = readBackend("services/payment.service.ts");
    const fnBody = functionBody(src, "async function handleCheckoutCompleted");

    expect(fnBody).toContain("CheckoutAttemptStatus.COMPLETED");
    expect(fnBody).toContain("checkoutOnly: true");
    expect(fnBody).not.toContain("transaction.create");
    expect(fnBody).not.toContain("providerTxnId");
  });

  it("paid invoices are the canonical transaction identity", () => {
    const src = readBackend("services/payment.service.ts");
    const fnBody = functionBody(src, "async function handleInvoicePaid");

    expect(fnBody).toContain("providerInvoiceId: invoice.id");
    expect(fnBody).toContain("providerTxnId: invoice.id");
    expect(fnBody).toContain("findFirst");
    expect(fnBody).toContain("providerInvoiceId");
    expect(fnBody).toContain("providerTxnId");
  });

  it("webhooks use a durable event ledger with duplicate handling", () => {
    const src = readBackend("services/payment.service.ts");
    const fnBody = functionBody(src, "export async function handleWebhookEvent");

    expect(fnBody).toContain("processedStripeEvent.create");
    expect(fnBody).toContain("StripeEventStatus.PROCESSED");
    expect(fnBody).toContain("StripeEventStatus.FAILED");
    expect(fnBody).toContain("leaseExpiresAt");
    expect(fnBody).toContain("isUniqueViolation");
  });

  it("subscription reads do not fabricate free rows", () => {
    const src = readBackend("services/payment.service.ts");
    const fnBody = functionBody(src, "export async function getSubscription");

    expect(fnBody).toContain("findUnique");
    expect(fnBody).toContain("serializeSubscription(subscription)");
    expect(fnBody).not.toContain("subscription.create");
    expect(fnBody).not.toContain("upsert");
  });

  it("cancel keeps paid-period entitlement and resume is available", () => {
    const src = readBackend("services/payment.service.ts");
    const cancelBody = functionBody(src, "export async function cancelSubscription");
    const resumeBody = functionBody(src, "export async function resumeSubscription");

    expect(cancelBody).toContain("cancel_at_period_end: true");
    expect(cancelBody).toContain("applySubscriptionProjection");
    expect(cancelBody).not.toContain("status: SubscriptionStatus.CANCELED");
    expect(resumeBody).toContain("cancel_at_period_end: false");
  });

  it("premium entitlement has no admin bypass", () => {
    const authorize = readBackend("middlewares/authorize.ts");
    const media = readBackend("services/media.service.ts");
    const entitlement = readBackend("services/entitlement.service.ts");

    expect(authorize).toContain("userHasPremiumAccess(req.user.id)");
    expect(authorize).not.toContain('req.user.role !== "ADMIN"');
    expect(media).not.toContain("Role.ADMIN");
    expect(entitlement).toContain("computePremiumEntitlement");
  });

  it("frontend resolves checkout outcome through the backend", () => {
    const checkout = readFrontend("lib/checkout.ts");
    const checkoutReturn = readFrontend("app/(public)/checkout/return/page.tsx");
    const pricing = readFrontend("app/(public)/pricing/page.tsx");
    const profile = readFrontend("app/(public)/profile/page.tsx");

    expect(checkout).toContain("fetchCheckoutOutcome");
    expect(checkout).toContain("appendCheckoutStatus");
    expect(checkout).toContain("/payments/checkout/outcome");
    expect(checkoutReturn).toContain("fetchCheckoutOutcome");
    expect(pricing).toContain("fetchPlans");
    expect(profile).toContain("cancelAtPeriodEnd");
  });
});
