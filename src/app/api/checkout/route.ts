import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { hasArticleAccess, hasStaffAccess } from "@/lib/access";
import { PRICING, PURCHASE_TYPES, type PurchaseType } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Musisz być zalogowany." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const type = body?.type as PurchaseType | undefined;
  const articleId = body?.articleId as string | undefined;

  if (!type || !PURCHASE_TYPES.includes(type)) {
    return NextResponse.json({ error: "Nieprawidłowy typ zakupu." }, { status: 400 });
  }
  if (type === "ARTICLE" && !articleId) {
    return NextResponse.json({ error: "Brak articleId." }, { status: 400 });
  }

  if (type === "ARTICLE" && articleId) {
    const article = await prisma.article.findUnique({ where: { id: articleId }, select: { status: true } });
    if (!article || article.status !== "PUBLISHED") {
      return NextResponse.json({ error: "Ten artykuł nie jest dostępny do zakupu." }, { status: 404 });
    }
    const isStaff = await hasStaffAccess(session.user.id);
    if (isStaff || (await hasArticleAccess(session.user.id, articleId))) {
      return NextResponse.json({ error: "Masz już dostęp do tego artykułu." }, { status: 400 });
    }
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

  const pricing = PRICING[type];
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? req.nextUrl.origin;
  const returnPath = articleId ? `/artykul/${articleId}` : "/panel";

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: type === "ARTICLE" ? "payment" : "subscription",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: pricing.amountCents,
          product_data: { name: pricing.label },
          ...(type === "ARTICLE" ? {} : { recurring: { interval: "month" as const } }),
        },
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}${returnPath}?checkout=success`,
    cancel_url: `${baseUrl}${returnPath}?checkout=cancelled`,
    metadata: { userId: user.id, type, ...(articleId ? { articleId } : {}) },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
