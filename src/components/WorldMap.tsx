"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import Link from "next/link";
import { POST_TYPE_LABELS, type PostType } from "@/lib/constants";

export type MapPost = {
  id: string;
  title: string;
  postType: string;
  category: string;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  publishedAt: string | null;
  authorName: string;
  coverUrl: string | null;
};

const TYPE_COLORS: Record<string, string> = {
  ALERT: "#dc2626",
  LIVE: "#dc2626",
  EVENT: "#7c3aed",
  STORY: "#2563eb",
  PHOTO: "#0891b2",
  VIDEO: "#0891b2",
  OPINION: "#65a30d",
};

export default function WorldMap({ posts }: { posts: MapPost[] }) {
  return (
    <MapContainer center={[20, 10]} zoom={2} minZoom={2} className="h-[70vh] w-full rounded-lg">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {posts.map((post) => (
        <CircleMarker
          key={post.id}
          center={[post.latitude, post.longitude]}
          radius={7}
          pathOptions={{
            color: TYPE_COLORS[post.postType] ?? "#374151",
            fillColor: TYPE_COLORS[post.postType] ?? "#374151",
            fillOpacity: 0.85,
          }}
        >
          <Popup>
            <div className="flex flex-col gap-1">
              {post.coverUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.coverUrl} alt="" className="h-20 w-full rounded object-cover" />
              )}
              <span className="text-xs uppercase text-black/50">
                {POST_TYPE_LABELS[post.postType as PostType] ?? post.postType} · {post.category}
              </span>
              <Link href={`/artykul/${post.id}`} className="font-medium underline">
                {post.title}
              </Link>
              <span className="text-xs text-black/60">
                {post.authorName}
                {post.city ? ` · ${post.city}${post.country ? `, ${post.country}` : ""}` : ""}
              </span>
              {post.publishedAt && (
                <span className="text-xs text-black/50">
                  {new Date(post.publishedAt).toLocaleDateString("pl-PL")}
                </span>
              )}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
