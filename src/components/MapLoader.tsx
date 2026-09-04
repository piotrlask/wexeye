"use client";

import dynamic from "next/dynamic";
import type { MapPost } from "./WorldMap";

const WorldMap = dynamic(() => import("./WorldMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[70vh] w-full items-center justify-center rounded-lg border border-black/10 dark:border-white/10">
      <p className="text-sm text-black/50 dark:text-white/50">Ładowanie mapy…</p>
    </div>
  ),
});

export default function MapLoader({ posts }: { posts: MapPost[] }) {
  return <WorldMap posts={posts} />;
}
