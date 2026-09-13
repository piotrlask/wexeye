import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import CreativeForm from "./CreativeForm";

export default async function AdCreativePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const purchase = await prisma.adPurchase.findUnique({
    where: { id },
    include: { author: { select: { name: true } } },
  });
  if (!purchase || purchase.advertiserId !== session.user.id) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-2 text-2xl font-semibold">Twoja reklama</h1>
      <p className="mb-6 text-sm text-black/60 dark:text-white/60">
        Miejsce reklamowe pod tekstami autora <strong>{purchase.author.name}</strong> na 30 dni —{" "}
        {(purchase.amountCents / 100).toFixed(2)}$.
      </p>

      {purchase.status === "PENDING" && (
        <p className="text-sm text-black/60 dark:text-white/60">
          Czekamy na potwierdzenie płatności od Stripe — odśwież stronę za chwilę.
        </p>
      )}

      {purchase.status === "PAID" && <CreativeForm purchaseId={purchase.id} />}

      {purchase.status === "ACTIVE" && (
        <div>
          <p className="mb-4 text-sm text-green-600">
            Reklama jest aktywna do {purchase.endsAt?.toLocaleDateString("pl-PL")}.
          </p>
          {purchase.mediaType === "PHOTO" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={purchase.mediaUrl ?? ""} alt="" className="w-full rounded-lg" />
          ) : (
            <video src={purchase.mediaUrl ?? ""} controls className="w-full rounded-lg" />
          )}
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            Link: <a href={purchase.linkUrl ?? "#"} className="underline">{purchase.linkUrl}</a>
          </p>
        </div>
      )}

      {purchase.status === "EXPIRED" && (
        <p className="text-sm text-black/60 dark:text-white/60">
          Ta reklama już wygasła.{" "}
          <Link href={`/profil/${purchase.authorId}`} className="underline">
            Wykup kolejną
          </Link>
          .
        </p>
      )}
    </div>
  );
}
