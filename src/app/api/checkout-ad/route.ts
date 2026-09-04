import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { AD_PRICE_CENTS, AD_SLOTS_PER_AUTHOR } from "@/lib/constants";
import { getActiveAdsForAuthor } from "@/lib/ads";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Musisz być zalogowany." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const authorId = body?.authorId as string | undefined;
  const articleId = body?.articleId as string | undefined;

  if (!authorId) {
    return NextResponse.json({ error: "Brak authorId." }, { status: 400 });
  }
  if (authorId === session.user.id) {
    return NextResponse.json({ error: "Nie możesz wykupić reklamy pod własnymi tekstami." }, { status: 400 });
  }

  const author = await prisma.user.findUnique({ where: { id: authorId }, select: { id: true } });
  if (!author) {
    return NextResponse.json({ error: "Nie znaleziono autora." }, { status: 404 });
  }

  const activeAds = await getActiveAdsForAuthor(authorId);
  if (activeAds.length >= AD_SLOTS_PER_AUTHOR) {
    return NextResponse.json({ error: "Wszystkie miejsca reklamowe u tego autora są zajęte." }, { status: 409 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "Nie znaleziono użytkownika." }, { status: 404 });
  }

  let customerId = user.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, name: user.name });
    customerId = customer.id;
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }

  const purchase = await prisma.adPurchase.create({
    data: { advertiserId: user.id, authorId, amountCents: AD_PRICE_CENTS, status: "PENDING" },
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? req.nextUrl.origin;
  const cancelPath = articleId ? `/artykul/${articleId}` : `/profil/${authorId}`;

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: AD_PRICE_CENTS,
          product_data: { name: "Reklama na wexeye — 30 dni pod tekstami jednego autora" },
        },
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/reklama/${purchase.id}`,
    cancel_url: `${baseUrl}${cancelPath}?checkout=cancelled`,
    metadata: { adPurchaseId: purchase.id },
  });

  await prisma.adPurchase.update({
    where: { id: purchase.id },
    data: { stripeCheckoutId: checkoutSession.id },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
