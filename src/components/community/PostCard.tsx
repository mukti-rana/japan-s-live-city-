import Link from "next/link";
import { Heart, Images, MapPin, MessageCircle } from "lucide-react";
import { CATEGORY_BY_SLUG } from "@/lib/community/categories";
import { AREA_BY_ID } from "@/lib/community/areas";
import { photoUrl } from "@/lib/community/photos";
import type { CommunityPost } from "@/lib/community/types";
import Bi from "@/components/community/Bi";
import LocalDate from "@/components/community/LocalDate";
import PlaceTypeIcon from "@/components/community/PlaceTypeIcon";
import { isPlaceCategory } from "@/lib/community/placeTypes";
import PostCardActions from "@/components/community/PostCardActions";
import Tx from "@/components/i18n/Tx";

// One post in the feed. The photo leads (thumbnail, lazy-loaded, with its real
// proportions so the layout does not jump); then the place and city, the title,
// a short caption, who shared it and when, the real like and comment counts,
// and Save / Share. The whole card opens the post.
export default function PostCard({ post }: { post: CommunityPost }) {
  const cover = post.images[0];
  const src = cover ? photoUrl(cover.thumbPath ?? cover.path) : null;
  const area = AREA_BY_ID.get(post.areaId);
  const category = CATEGORY_BY_SLUG.get(post.categorySlug);
  const where = post.placeLabel ?? post.cityLabel;
  const ratio = cover?.width && cover?.height ? `${cover.width} / ${cover.height}` : "4 / 3";
  const extra = post.images.length - 1;

  return (
    <article className="group relative mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-glass-border bg-panel/70 shadow-[0_10px_30px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-white/25 hover:shadow-[0_18px_40px_-18px_rgba(168,85,247,0.35)] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      {src && (
        <div className="relative overflow-hidden bg-glass-bg" style={{ aspectRatio: ratio }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={cover?.alt ?? post.title} loading="lazy" decoding="async" className="cm-photo absolute inset-0 h-full w-full object-cover" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent" />
          {extra > 0 && (
            <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
              <Images size={12} aria-hidden="true" />
              {post.images.length}
              <span className="sr-only">
                <Tx en="photos" />
              </span>
            </span>
          )}
          {category && (
            <span className="absolute bottom-2.5 left-2.5 rounded-full border border-white/20 bg-black/55 px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur">
              <Bi en={category.en} ja={category.ja} />
            </span>
          )}
        </div>
      )}
      <div className="flex flex-col gap-2.5 p-4">
        {(where || area) && (
          <p className="flex min-w-0 items-center gap-1 text-xs font-medium text-azure">
            {post.placeCategory && isPlaceCategory(post.placeCategory) ? <PlaceTypeIcon category={post.placeCategory} size={12} className="shrink-0" /> : <MapPin size={12} aria-hidden="true" className="shrink-0" />}
            <span className="truncate">
              {where && post.placeRef ? (
                // The place name opens that place's page (reviews, photos, questions).
                <Link href={`/community/place/${post.placeRef}`} className="relative z-10 rounded underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                  {where}
                </Link>
              ) : (
                where
              )}
              {where && area ? ", " : ""}
              {area && <Bi en={area.en} ja={area.ja} />}
            </span>
          </p>
        )}
        <h3 className="text-base font-semibold leading-snug text-foreground">
          {/* The whole card opens the post: the title link stretches over it. */}
          <Link href={`/community/post/${post.id}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-azure">
            {post.title}
          </Link>
        </h3>
        {post.caption && <p className="line-clamp-3 text-sm leading-relaxed text-foreground/85">{post.caption}</p>}
        <div className="flex items-center justify-between gap-3 text-xs text-foreground/80">
          <span className="flex min-w-0 items-center gap-2">
            {post.author.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.author.avatarUrl} alt="" loading="lazy" decoding="async" className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-white/15" />
            ) : (
              <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-lilac/20 text-[11px] font-semibold uppercase text-lilac ring-1 ring-white/15">
                {post.author.username.slice(0, 1)}
              </span>
            )}
            <span className="min-w-0">
              <Link href={`/community/u/${post.author.username}`} className="relative z-10 block truncate rounded font-medium text-foreground/95 underline-offset-2 hover:text-azure hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                {post.author.username}
              </Link>
              <span className="block truncate text-[11px] text-foreground/70">
                <LocalDate iso={post.publishedAt} />
              </span>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-3">
            <span className="flex items-center gap-1">
              <Heart size={13} aria-hidden="true" />
              {post.likeCount}
              <span className="sr-only">
                <Tx en="likes" />
              </span>
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle size={13} aria-hidden="true" />
              {post.commentCount}
              <span className="sr-only">
                <Tx en="comments" />
              </span>
            </span>
          </span>
        </div>
        <PostCardActions postId={post.id} title={post.title} saves={post.saveCount} />
      </div>
    </article>
  );
}
