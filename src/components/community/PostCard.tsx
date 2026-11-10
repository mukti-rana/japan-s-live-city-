import Link from "next/link";
import { CATEGORY_BY_SLUG } from "@/lib/community/categories";
import { AREA_BY_ID } from "@/lib/community/areas";
import { photoUrl } from "@/lib/community/photos";
import type { CommunityPost } from "@/lib/community/types";
import { Heart, MapPin, MessageCircle } from "lucide-react";
import Bi from "@/components/community/Bi";
import Tx from "@/components/i18n/Tx";

// One post in the feed. The photo leads (thumbnail, lazy-loaded, with its real
// proportions so the layout does not jump); the words sit under it. Likes and
// comments here are the real counts — interacting comes with the next phase.
export default function PostCard({ post }: { post: CommunityPost }) {
  const cover = post.images[0];
  const src = cover ? photoUrl(cover.thumbPath ?? cover.path) : null;
  const area = AREA_BY_ID.get(post.areaId);
  const category = CATEGORY_BY_SLUG.get(post.categorySlug);
  const where = post.placeLabel ?? post.cityLabel;
  const ratio = cover?.width && cover?.height ? `${cover.width} / ${cover.height}` : "4 / 3";

  return (
    <article className="relative mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-glass-border bg-panel/70 backdrop-blur-xl transition-colors hover:border-white/25">
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={cover?.alt ?? post.title} loading="lazy" decoding="async" style={{ aspectRatio: ratio }} className="block h-auto w-full bg-glass-bg object-cover" />
      )}
      <div className="flex flex-col gap-2.5 p-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-foreground/80">
          {category && (
            <span className="rounded-full border border-lilac/40 bg-lilac/10 px-2.5 py-0.5 font-medium text-lilac">
              <Bi en={category.en} ja={category.ja} />
            </span>
          )}
          {(where || area) && (
            <span className="flex min-w-0 items-center gap-1">
              <MapPin size={12} aria-hidden="true" className="shrink-0" />
              <span className="truncate">
                {where ? `${where}${area ? ", " : ""}` : ""}
                {area && <Bi en={area.en} ja={area.ja} />}
              </span>
            </span>
          )}
        </div>
        <h3 className="text-base font-semibold leading-snug text-foreground">
          {/* The whole card opens the post: the title link stretches over it. */}
          <Link href={`/community/post/${post.id}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-azure focus-visible:after:rounded-2xl">
            {post.title}
          </Link>
        </h3>
        {post.caption && <p className="line-clamp-3 text-sm leading-relaxed text-foreground/85">{post.caption}</p>}
        <div className="mt-1 flex items-center justify-between gap-3 text-xs text-foreground/80">
          <span className="flex min-w-0 items-center gap-2">
            {post.author.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.author.avatarUrl} alt="" loading="lazy" decoding="async" className="h-6 w-6 shrink-0 rounded-full object-cover" />
            ) : (
              <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lilac/20 text-[11px] font-semibold uppercase text-lilac">
                {post.author.username.slice(0, 1)}
              </span>
            )}
            <span className="truncate">{post.author.username}</span>
          </span>
          <span className="flex shrink-0 items-center gap-3">
            <span className="flex items-center gap-1">
              <Heart size={13} aria-hidden="true" />
              {post.likeCount}
              <span className="sr-only"><Tx en="likes" /></span>
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle size={13} aria-hidden="true" />
              {post.commentCount}
              <span className="sr-only"><Tx en="comments" /></span>
            </span>
          </span>
        </div>
      </div>
    </article>
  );
}
