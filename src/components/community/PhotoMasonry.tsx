import Link from "next/link";
import { MapPin } from "lucide-react";
import Bi from "@/components/community/Bi";
import { LikeCount, ReactionsProvider, TileActions } from "@/components/community/PostReactions";
import { AREA_BY_ID } from "@/lib/community/areas";
import { CATEGORY_BY_SLUG } from "@/lib/community/categories";
import { photoUrl } from "@/lib/community/photos";
import type { CommunityPost } from "@/lib/community/types";
import { Heart } from "lucide-react";

// Every photograph in these posts, as a wall: columns of photographs at their own proportions, newest first, so tall and wide pictures sit
// together the way a magazine lays them out. Pointing at (or focusing) a photograph lifts it slowly and shows where it was taken, what it is
// about, its likes, and like and save buttons; the photograph itself opens its whole post. Real photographs only.
export default function PhotoMasonry({ posts }: { posts: CommunityPost[] }) {
  const tiles = posts.flatMap((p) =>
    p.images.flatMap((img) => {
      const src = photoUrl(img.thumbPath ?? img.path);
      return src ? [{ key: img.path, src, alt: img.alt ?? p.title, w: img.width, h: img.height, post: p }] : [];
    }),
  );
  return (
    <ReactionsProvider posts={posts}>
      {/* The wall has only as many columns as there are photographs, centred, so a few photographs are large and in the middle, never lost at the left of an empty page. */}
      <ul className={`${tiles.length <= 1 ? "mx-auto max-w-[520px]" : tiles.length === 2 ? "mx-auto max-w-[860px] columns-2" : tiles.length === 3 ? "mx-auto max-w-[1100px] columns-2 sm:columns-3" : "columns-2 sm:columns-3 xl:columns-4"} gap-3 sm:gap-4 [&>li]:mb-3 sm:[&>li]:mb-4`}>
        {tiles.map(({ key, src, alt, w, h, post }, n) => {
          const area = AREA_BY_ID.get(post.areaId);
          const category = CATEGORY_BY_SLUG.get(post.categorySlug);
          const where = post.placeLabel ?? post.cityLabel;
          return (
            <li key={key} className="cm-rise break-inside-avoid">
              <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0b0d]" style={{ aspectRatio: w && h ? `${w} / ${h}` : "4 / 5" }}>
                <Link href={`/community/post/${post.id}`} aria-label={post.title} className="absolute inset-0 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-azure">
                  {/* eslint-disable-next-line @next/next/no-img-element -- community photographs live in Supabase storage */}
                  <img src={src} alt={alt} loading={n < 4 ? "eager" : "lazy"} decoding="async" className="cm-photo h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06] motion-reduce:transition-none" />
                </Link>
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/25 opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-within:opacity-100 max-[1023px]:opacity-70" />
                <div className="absolute right-2.5 top-2.5 opacity-100 transition-opacity duration-300 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100">
                  <TileActions postId={post.id} />
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-3 text-white opacity-100 transition-all duration-500 [@media(hover:hover)]:translate-y-2 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:translate-y-0 [@media(hover:hover)]:group-focus-within:opacity-100">
                  {(where || area) && (
                    <p className="flex items-center gap-1 text-xs font-medium [text-shadow:0_1px_8px_rgba(0,0,0,0.8)]">
                      <MapPin size={12} aria-hidden="true" className="shrink-0" />
                      <span className="truncate">
                        {where}
                        {where && area ? ", " : ""}
                        {area && <Bi en={area.en} ja={area.ja} />}
                      </span>
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    {category ? (
                      <span className="rounded-full border border-white/25 bg-black/45 px-2.5 py-0.5 font-medium backdrop-blur-md">
                        <Bi en={category.en} ja={category.ja} />
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className="flex items-center gap-1 font-medium">
                      <Heart size={13} aria-hidden="true" />
                      <LikeCount postId={post.id} />
                    </span>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </ReactionsProvider>
  );
}
