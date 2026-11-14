import Link from "next/link";
import { ArrowUpRight, Heart, Images, MapPin, MessageCircle } from "lucide-react";
import { CATEGORY_BY_SLUG } from "@/lib/community/categories";
import { AREA_BY_ID } from "@/lib/community/areas";
import { photoUrl } from "@/lib/community/photos";
import type { CommunityPost } from "@/lib/community/types";
import Bi from "@/components/community/Bi";
import LocalDate from "@/components/community/LocalDate";
import PlaceTypeIcon from "@/components/community/PlaceTypeIcon";
import { isPlaceCategory } from "@/lib/community/placeTypes";
import PostCardActions from "@/components/community/PostCardActions";
import ScrollImageReveal, { type ScrollImageRevealProps } from "@/components/smoothui/scroll-image-reveal";
import Tx from "@/components/i18n/Tx";

// One post in the feed. The photo leads (thumbnail, lazy-loaded, with its real
// proportions so the layout does not jump); then the place and city, the title,
// a short caption, who shared it and when, the real like and comment counts,
// and Save / Share. The whole card opens the post. With `reveal`, the photo is
// revealed with a mask as the page scrolls past it (once, then it stays open);
// under "reduce motion" it simply shows.
export default function PostCard({ post, reveal }: { post: CommunityPost; reveal?: { mask: NonNullable<ScrollImageRevealProps["mask"]>; direction?: ScrollImageRevealProps["direction"] } }) {
  const cover = post.images[0];
  const src = cover ? photoUrl(cover.thumbPath ?? cover.path) : null;
  const area = AREA_BY_ID.get(post.areaId);
  const category = CATEGORY_BY_SLUG.get(post.categorySlug);
  const where = post.placeLabel ?? post.cityLabel;
  const extra = post.images.length - 1;

  return (
    <article className="group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121212] transition-colors duration-300 hover:border-white/20 motion-reduce:transition-none">
      {src && (
        <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-[#0a0a0a]">
          {reveal ? (
            <ScrollImageReveal src={src} alt={cover?.alt ?? post.title} mask={reveal.mask} direction={reveal.direction} once parallax={16} rounded="rounded-none" className="absolute inset-0 h-full w-full" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={cover?.alt ?? post.title} loading="lazy" decoding="async" className="cm-photo absolute inset-0 h-full w-full object-cover" />
          )}
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />
          {extra > 0 && (
            <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
              <Images size={12} aria-hidden="true" />
              {post.images.length}
              <span className="sr-only">
                <Tx en="photos" />
              </span>
            </span>
          )}
          {category && (
            <span className="absolute bottom-2.5 left-2.5 rounded-full border border-white/20 bg-black/60 px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur">
              <Bi en={category.en} ja={category.ja} />
            </span>
          )}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Who shared it and when. */}
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="flex min-w-0 items-center gap-2">
            {post.author.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.author.avatarUrl} alt="" loading="lazy" decoding="async" className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-white/15" />
            ) : (
              <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold uppercase text-white ring-1 ring-white/15">
                {post.author.username.slice(0, 1)}
              </span>
            )}
            <Link href={`/community/u/${post.author.username}`} className="relative z-10 truncate rounded font-medium text-foreground/95 underline-offset-2 hover:text-azure hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
              {post.author.username}
            </Link>
          </span>
          <span className="shrink-0 text-[11px] text-foreground/60">
            <LocalDate iso={post.publishedAt} />
          </span>
        </div>

        <h3 className="text-base font-semibold leading-snug text-foreground">
          {/* The whole card opens the post: the title link stretches over it. */}
          <Link href={`/community/post/${post.id}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-azure">
            {post.title}
          </Link>
        </h3>

        {(where || area) && (
          <p className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-azure">
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

        {post.caption && <p className="line-clamp-2 text-sm leading-relaxed text-foreground/70">{post.caption}</p>}

        <div className="mt-auto flex flex-col gap-3 pt-1">
          <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] pt-3 text-xs text-foreground/75">
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Heart size={14} aria-hidden="true" />
                {post.likeCount}
                <span className="sr-only">
                  <Tx en="likes" />
                </span>
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle size={14} aria-hidden="true" />
                {post.commentCount}
                <span className="sr-only">
                  <Tx en="comments" />
                </span>
              </span>
            </span>
            <span aria-hidden="true" className="inline-flex items-center gap-1 font-medium text-foreground/80 transition-colors group-hover:text-white">
              <Tx en="View post" />
              <ArrowUpRight size={14} />
            </span>
          </div>
          <div className="relative z-10">
            <PostCardActions postId={post.id} title={post.title} saves={post.saveCount} />
          </div>
        </div>
      </div>
    </article>
  );
}
