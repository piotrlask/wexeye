import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { distributeCommission } from "@/lib/commissions";
import type { PurchaseType } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook nieskonfigurowany." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: `Nieprawidłowy podpis: ${(err as Error).message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const adPurchaseId = session.metadata?.adPurchaseId;
      if (adPurchaseId) {
        // Only marks the slot as paid-for here. Revenue isn't distributed
        // until the advertiser actually submits a creative and the ad goes
        // ACTIVE (see activateAdPurchase) — an abandoned PAID slot that never
        // runs shouldn't pay out anyone. This update is naturally idempotent
        // against webhook redelivery: re-setting status to PAID is a no-op.
        await prisma.adPurchase.update({
          where: { id: adPurchaseId },
          data: { status: "PAID", stripeCheckoutId: session.id },
        });
        break;
      }

      const userId = session.metadata?.userId;
      const type = session.metadata?.type as PurchaseType | undefined;
      const articleId = session.metadata?.articleId;
      if (!userId || !type) break;

      // Idempotency guard: Stripe redelivers webhooks on timeout/retry, and
      // without this a retry would create a second Purchase, grant access
      // again (harmless), and — critically — run distributeCommission a
      // second time, double-paying every sponsor in the chain.
      const alreadyProcessed = await prisma.purchase.findUnique({
        where: { stripeCheckoutId: session.id },
        select: { id: true },
      });
      if (alreadyProcessed) break;

      const amountCents = session.amount_total ?? 0;

      if (type === "ARTICLE" && articleId) {
        await prisma.purchase.create({
          data: {
            userId,
            type,
            articleId,
            amountCents,
            status: "PAID",
            stripeCheckoutId: session.id,
            stripePaymentIntentId:
              typeof session.payment_intent === "string" ? session.payment_intent : undefined,
          },
        });
        await prisma.articleAccess.upsert({
          where: { userId_articleId: { userId, articleId } },
          create: { userId, articleId, grantedVia: "PURCHASE" },
          update: {},
        });
        await distributeCommission(articleId, "ARTICLE");
      }

      if (type === "SUB20" || type === "SUB30") {
        await prisma.purchase.create({
          data: { userId, type, amountCents, status: "PAID", stripeCheckoutId: session.id },
        });

        const stripeSubscriptionId =
          typeof session.subscription === "string" ? session.subscription : undefined;
        let currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        if (stripeSubscriptionId) {
          const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
          const periodEndSeconds = sub.items.data[0]?.current_period_end;
          if (periodEndSeconds) currentPeriodEnd = new Date(periodEndSeconds * 1000);
        }

        await prisma.subscription.upsert({
          where: { userId },
          create: {
            userId,
            tier: type,
            status: "ACTIVE",
            stripeSubscriptionId,
            currentPeriodEnd,
            articlesUsedInPeriod: 0,
          },
          update: {
            tier: type,
            status: "ACTIVE",
            stripeSubscriptionId,
            currentPeriodEnd,
            articlesUsedInPeriod: 0,
          },
        });
      }
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const stripeSubscriptionId = invoice.parent?.subscription_details?.subscription;
      const subId = typeof stripeSubscriptionId === "string" ? stripeSubscriptionId : undefined;
      if (!subId) break;

      const sub = await stripe.subscriptions.retrieve(subId);
      const periodEndSeconds = sub.items.data[0]?.current_period_end;
      const existing = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: subId } });
      if (existing && periodEndSeconds) {
        // Reuses stripeCheckoutId (unique) as a dedup key for renewal
        // invoices too, keyed on invoice.id instead of a checkout session —
        // it's still a Stripe-unique identifier, and it's what stops a
        // redelivered webhook from recording the same renewal twice.
        const alreadyRecorded = await prisma.purchase.findUnique({
          where: { stripeCheckoutId: invoice.id },
          select: { id: true },
        });
        // Only the FIRST invoice of a subscription is the initial purchase
        // (already recorded by checkout.session.completed); every renewal
        // after that only shows up here and must be booked as its own
        // Purchase, or admin revenue reports silently miss all renewals.
        const isFirstInvoice = invoice.billing_reason === "subscription_create";
        if (!alreadyRecorded && !isFirstInvoice) {
          await prisma.purchase.create({
            data: {
              userId: existing.userId,
              type: existing.tier,
              amountCents: invoice.amount_paid,
              status: "PAID",
              stripeCheckoutId: invoice.id,
            },
          });
        }

        await prisma.subscription.update({
          where: { userId: existing.userId },
          data: {
            status: "ACTIVE",
            currentPeriodEnd: new Date(periodEndSeconds * 1000),
            articlesUsedInPeriod: 0,
          },
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const stripeSub = event.data.object as Stripe.Subscription;
      const existing = await prisma.subscription.findUnique({
        where: { stripeSubscriptionId: stripeSub.id },
      });
      if (existing) {
        await prisma.subscription.update({
          where: { userId: existing.userId },
          data: { status: "CANCELED" },
        });
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
