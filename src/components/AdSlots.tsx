import { getActiveAdsForAuthor } from "@/lib/ads";
import { AD_SLOTS_PER_AUTHOR } from "@/lib/constants";
import BuyAdSlotButton from "./BuyAdSlotButton";

export default async function AdSlots({
  authorId,
  articleId,
  loggedIn,
}: {
  authorId: string;
  articleId: string;
  loggedIn: boolean;
}) {
  const ads = await getActiveAdsForAuthor(authorId);
  const emptySlots = AD_SLOTS_PER_AUTHOR - ads.length;

  return (
    <div className="my-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {ads.map((ad) => (
        <a
          key={ad.id}
          href={ad.linkUrl ?? "#"}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="block overflow-hidden rounded-lg border border-black/10 dark:border-white/10"
        >
          {ad.mediaType === "PHOTO" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ad.mediaUrl ?? ""} alt="" className="h-32 w-full object-cover" />
          ) : (
            <video src={ad.mediaUrl ?? ""} muted loop autoPlay playsInline className="h-32 w-full object-cover" />
          )}
          <span className="block bg-black/5 px-2 py-1 text-center text-[10px] uppercase tracking-wide text-black/40 dark:bg-white/10 dark:text-white/40">
            Reklama
          </span>
        </a>
      ))}
      {Array.from({ length: emptySlots }).map((_, i) => (
        <BuyAdSlotButton key={i} authorId={authorId} articleId={articleId} loggedIn={loggedIn} />
      ))}
    </div>
  );
}
