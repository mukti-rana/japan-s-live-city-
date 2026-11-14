import Link from "next/link";
import { ChevronRight } from "lucide-react";
import Tx from "@/components/i18n/Tx";
import { photoUrl } from "@/lib/community/photos";
import type { CommunityPost } from "@/lib/community/types";

const MAX = 12;
// Fewer than this and the strip would only repeat the posts above it.
export const MIN_PHOTOS = 6;

// Every photo in the posts, flattened (a post with three photos gives three
// squares), newest first. Real photos only; each opens its post.
export function photosOf(posts: CommunityPost[]) {
  const out: { key: string; src: string; alt: string; postId: string }[] = [];
  for (const p of posts) {
    for (const img of p.images) {
      const src = photoUrl(img.thumbPath ?? img.path);
      if (src) out.push({ key: img.path, src, alt: img.alt ?? p.title, postId: p.id });
    }
  }
  return out.slice(0, MAX);
}

// A compact mosaic of the latest photos people shared.
export default function LatestPhotos({ posts }: { posts: CommunityPost[] }) {
  const photos = photosOf(posts);
  if (photos.length < MIN_PHOTOS) return null;
  return (
    <section aria-labelledby="latest-photos-h" className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <h2 id="latest-photos-h" className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          <Tx en="Latest community photos" />
        </h2>
        <Link href="/community/photos" className="inline-flex h-9 shrink-0 items-center gap-0.5 rounded-lg px-1 text-sm font-medium text-foreground/75 underline-offset-2 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
          <Tx en="See all photos" />
          <ChevronRight size={15} aria-hidden="true" />
        </Link>
      </div>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {photos.map((p) => (
          <li key={p.key}>
            <Link href={`/community/post/${p.postId}`} className="group relative block aspect-square overflow-hidden rounded-xl border border-white/[0.08] bg-cm-pop-foot focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt={p.alt} loading="lazy" decoding="async" className="cm-photo h-full w-full object-cover" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
