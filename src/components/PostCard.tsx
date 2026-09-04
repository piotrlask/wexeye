import Link from "next/link";
import { POST_TYPE_LABELS } from "@/lib/constants";
import type { FeedPost } from "@/lib/feed";

function locationLabel(post: FeedPost): string | null {
  if (post.locationHidden) return null;
  return [post.city, post.country].filter(Boolean).join(", ") || null;
}

export default function PostCard({ post }: { post: FeedPost }) {
  const photoCover = post.media.find((m) => m.type === "PHOTO");
  const videoCover = !photoCover ? post.media.find((m) => m.type === "VIDEO") : undefined;
  const location = locationLabel(post);

  return (
    <Link
      href={`/artykul/${post.id}`}
      className="block overflow-hidden rounded-lg border border-black/10 transition hover:shadow-md dark:border-white/10"
    >
      {photoCover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoCover.url} alt={post.title} className="h-40 w-full object-cover" />
      )}
      {videoCover && (
        <div className="relative h-40 w-full bg-black">
          <video src={videoCover.url} muted preload="metadata" className="h-40 w-full object-cover" />
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 fill-white/90 drop-shadow"
          >
            <circle cx="12" cy="12" r="11" fillOpacity="0.35" />
            <path d="M10 8l6 4-6 4V8z" />
          </svg>
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
          <span className="rounded bg-black/5 px-1.5 py-0.5 dark:bg-white/10">
            {POST_TYPE_LABELS[post.postType as keyof typeof POST_TYPE_LABELS] ?? post.postType}
          </span>
          <span>{post.category}</span>
        </div>
        <h2 className="mt-1 text-lg font-semibold">{post.title}</h2>
        <p className="mt-2 line-clamp-2 text-sm text-black/70 dark:text-white/70">{post.body}</p>
        <p className="mt-3 flex flex-wrap gap-x-2 text-xs text-black/50 dark:text-white/50">
          <span>{post.author.name}</span>
          <span>·</span>
          <span>{post.publishedAt?.toLocaleDateString("pl-PL")}</span>
          {location && (
            <>
              <span>·</span>
              <span>{location}</span>
            </>
          )}
          {post.distanceKm !== undefined && (
            <>
              <span>·</span>
              <span>{post.distanceKm.toFixed(0)} km</span>
            </>
          )}
          {post.witnessCount > 0 && (
            <>
              <span>·</span>
              <span>{post.witnessCount} świadków</span>
            </>
          )}
          <span>·</span>
          <span>
            {post.commentCount} {post.commentCount === 1 ? "komentarz" : "komentarzy"}
          </span>
        </p>
      </div>
    </Link>
  );
}
