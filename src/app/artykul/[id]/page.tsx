import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasArticleAccess, hasStaffAccess } from "@/lib/access";
import { POST_TYPE_LABELS, SOURCE_TYPE_LABELS, type PostType, type SourceType } from "@/lib/constants";
import CheckoutButtons from "@/components/CheckoutButtons";
import UnlockButton from "./UnlockButton";
import WitnessButton from "./WitnessButton";
import CommentForm from "./CommentForm";
import ReactionButtons from "./ReactionButtons";
import ShareButton from "./ShareButton";
import Avatar from "@/components/Avatar";
import AdSlots from "@/components/AdSlots";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await prisma.article.findUnique({
    where: { id },
    include: { author: true, media: true, _count: { select: { witnesses: true, comments: true } } },
  });

  if (!article || article.status !== "PUBLISHED") {
    notFound();
  }

  const session = await auth();
  const userId = session?.user?.id;
  const isStaff = await hasStaffAccess(userId);
  const hasAccess = isStaff || (await hasArticleAccess(userId, article.id));

  const [subscription, myWitnessMark, myReaction, okCount, notOkCount, comments] = await Promise.all([
    userId ? prisma.subscription.findUnique({ where: { userId } }) : null,
    userId
      ? prisma.witness.findUnique({ where: { userId_articleId: { userId, articleId: article.id } } })
      : null,
    userId
      ? prisma.reaction.findUnique({ where: { userId_articleId: { userId, articleId: article.id } } })
      : null,
    prisma.reaction.count({ where: { articleId: article.id, type: "OK" } }),
    prisma.reaction.count({ where: { articleId: article.id, type: "NOT_OK" } }),
    prisma.comment.findMany({
      where: { articleId: article.id },
      include: { author: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.article.update({ where: { id: article.id }, data: { viewCount: { increment: 1 } } }),
  ]);

  const subscriptionUsable =
    !!subscription &&
    subscription.status === "ACTIVE" &&
    subscription.currentPeriodEnd > new Date() &&
    (subscription.tier === "SUB30" || subscription.articlesUsedInPeriod < 20);
  const remaining =
    subscription?.tier === "SUB20" ? 20 - subscription.articlesUsedInPeriod : null;

  const coverPhoto = article.media.find((m) => m.type === "PHOTO");
  const restMedia = article.media.filter((m) => m.id !== coverPhoto?.id);

  const words = article.body.split(/\s+/);
  const half = Math.max(1, Math.ceil(words.length / 2));
  const visibleText = words.slice(0, half).join(" ");
  // Only ever computed/sent to the client when the viewer actually has access —
  // the paywall must not ship the paid text to browsers that haven't paid,
  // since blur-only hiding is trivially bypassed via DevTools/view-source.
  const hiddenText = hasAccess ? words.slice(half).join(" ") : null;
  const hasMoreText = words.length > half;

  const location = article.locationHidden
    ? "Lokalizacja ukryta przez autora"
    : [article.city, article.region, article.country].filter(Boolean).join(", ") || null;

  const hashtags = (article.hashtags ?? "").split(/\s+/).filter(Boolean);

  return (
    <article className="mx-auto max-w-2xl">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
        <span className="rounded bg-black/5 px-1.5 py-0.5 dark:bg-white/10">
          {POST_TYPE_LABELS[article.postType as PostType] ?? article.postType}
        </span>
        <span>{article.category}</span>
        {article.subcategory && <span>· {article.subcategory}</span>}
      </div>
      <h1 className="mt-1 text-3xl font-bold">{article.title}</h1>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-black/60 dark:text-white/60 sm:grid-cols-4">
        <div>
          <dt className="text-xs uppercase text-black/40 dark:text-white/40">Who</dt>
          <dd>{article.author.name}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-black/40 dark:text-white/40">When</dt>
          <dd>{(article.eventAt ?? article.publishedAt)?.toLocaleString("pl-PL")}</dd>
        </div>
        {location && (
          <div className="col-span-2">
            <dt className="text-xs uppercase text-black/40 dark:text-white/40">Where</dt>
            <dd>{location}</dd>
          </div>
        )}
        <div className="col-span-2 sm:col-span-4">
          <dt className="text-xs uppercase text-black/40 dark:text-white/40">Source</dt>
          <dd>{SOURCE_TYPE_LABELS[article.sourceType as SourceType] ?? article.sourceType}</dd>
        </div>
      </dl>

      {coverPhoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverPhoto.url} alt="" className="mt-6 w-full rounded-lg" />
      )}

      <p className="mt-6 whitespace-pre-wrap leading-relaxed">{visibleText}</p>

      {!hasAccess && hasMoreText && (
        <div className="relative mt-2 flex min-h-32 items-start justify-center rounded-lg bg-black/5 pt-8 dark:bg-white/5">
          <span className="rounded bg-black/80 px-3 py-1 text-xs text-white">
            Reszta treści dostępna po wykupieniu dostępu
          </span>
        </div>
      )}
      {hasAccess && hiddenText && (
        <p className="mt-2 whitespace-pre-wrap leading-relaxed">{hiddenText}</p>
      )}

      {restMedia.length > 0 && (
        <div className="mt-6 space-y-4">
          {hasAccess
            ? restMedia.map((m) =>
                m.type === "PHOTO" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={m.id} src={m.url} alt="" className="w-full rounded-lg" />
                ) : (
                  <video key={m.id} src={m.url} controls className="w-full rounded-lg" />
                )
              )
            : // Locked placeholders only — the real media URLs never reach the
              // client when the viewer lacks access, so there's nothing to
              // unblur via DevTools.
              restMedia.map((m) => (
                <div
                  key={m.id}
                  className="flex aspect-video w-full items-center justify-center rounded-lg bg-black/10 dark:bg-white/10"
                >
                  <span className="rounded bg-black/80 px-3 py-1 text-xs text-white">
                    {m.type === "PHOTO" ? "Zdjęcie" : "Wideo"} dostępne po wykupieniu dostępu
                  </span>
                </div>
              ))}
        </div>
      )}

      {hashtags.length > 0 && (
        <p className="mt-6 flex flex-wrap gap-2 text-sm text-black/60 dark:text-white/60">
          {hashtags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-4 text-sm text-black/50 dark:border-white/10 dark:text-white/50">
        <span>
          {article.viewCount + 1} wyświetleń · {article._count.comments}{" "}
          {article._count.comments === 1 ? "komentarz" : "komentarzy"}
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <ReactionButtons
            articleId={article.id}
            okCount={okCount}
            notOkCount={notOkCount}
            myReaction={myReaction ? (myReaction.type as "OK" | "NOT_OK") : null}
            loggedIn={Boolean(userId)}
          />
          <ShareButton articleId={article.id} loggedIn={Boolean(userId)} />
          <WitnessButton
            articleId={article.id}
            count={article._count.witnesses}
            alreadyMarked={Boolean(myWitnessMark)}
            loggedIn={Boolean(userId)}
          />
        </div>
      </div>

      {!hasAccess && (
        <div className="mt-8 rounded-lg border border-black/10 p-4 dark:border-white/10">
          <p className="mb-3 text-sm font-medium">Odblokuj pełną treść tego artykułu</p>
          {userId ? (
            <div className="flex flex-col gap-3">
              {subscriptionUsable && <UnlockButton articleId={article.id} remaining={remaining} />}
              <CheckoutButtons articleId={article.id} />
            </div>
          ) : (
            <p className="text-sm text-black/60 dark:text-white/60">
              <a href="/login" className="underline">
                Zaloguj się
              </a>{" "}
              lub{" "}
              <a href="/rejestracja" className="underline">
                załóż konto
              </a>
              , aby kupić dostęp.
            </p>
          )}
        </div>
      )}
      <AdSlots authorId={article.authorId} articleId={article.id} loggedIn={Boolean(userId)} />

      <section className="mt-10 border-t border-black/10 pt-6 dark:border-white/10">
        <h2 className="mb-4 text-lg font-semibold">
          Komentarze ({article._count.comments})
        </h2>

        {userId ? (
          <CommentForm articleId={article.id} />
        ) : (
          <p className="text-sm text-black/60 dark:text-white/60">
            <a href="/login" className="underline">
              Zaloguj się
            </a>
            , aby dodać komentarz.
          </p>
        )}

        {comments.length > 0 && (
          <ul className="mt-6 flex flex-col gap-4">
            {comments.map((c) => (
              <li key={c.id} className="flex gap-3 border-b border-black/10 pb-4 dark:border-white/10">
                <Avatar name={c.author.name} avatarUrl={c.author.avatarUrl} size="sm" />
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {c.author.name}
                    <span className="text-xs font-normal text-black/50 dark:text-white/50">
                      {c.createdAt.toLocaleString("pl-PL")}
                    </span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-black/80 dark:text-white/80">
                    {c.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
