import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import Avatar from "@/components/community/Avatar";
import Bi from "@/components/community/Bi";
import LocalDate from "@/components/community/LocalDate";
import PlaceTypeIcon from "@/components/community/PlaceTypeIcon";
import PostPhotos from "@/components/community/PostPhotos";
import { FeedPostActions } from "@/components/community/PostReactions";
import Tx from "@/components/i18n/Tx";
import { playfair } from "@/components/home/cinematic/fonts";
import { AREA_BY_ID } from "@/lib/community/areas";
import { CATEGORY_BY_SLUG } from "@/lib/community/categories";
import { photoUrl } from "@/lib/community/photos";
import { isPlaceCategory } from "@/lib/community/placeTypes";
import type { CommunityPost } from "@/lib/community/types";

// The feed's tall and wide limits: a photo is shown at its own proportions between these, so a panorama and a portrait both sit well in a column.
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

// One post in the feed, large: who shared it and when, the photograph (or photographs) at a generous size, where it was taken, its title and caption,
// and the actions. All of it is the real post; nothing is added.
export default function FeedPost({ post, first = false }: { post: CommunityPost; first?: boolean }) {
  const area = AREA_BY_ID.get(post.areaId);
  const category = CATEGORY_BY_SLUG.get(post.categorySlug);
  const where = post.placeLabel ?? post.cityLabel;
  const photos = post.images.flatMap((img) => {
    const src = photoUrl(img.path);
    return src ? [{ src, alt: img.alt ?? post.title }] : [];
  });
  const cover = post.images[0];
  const ratio = clamp(cover?.width && cover?.height ? cover.width / cover.height : 4 / 3, 0.9, 1.6);
  const href = `/community/post/${post.id}`;

  return (
    <article className={`${playfair.variable} cm-rise overflow-hidden rounded-[28px] border border-white/10 bg-[#0b0b0d] shadow-[0_30px_80px_-50px_rgba(0,0,0,1)]`}>
      <header className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
        <Link href={`/community/u/${post.author.username}`} className="flex min-w-0 items-center gap-3 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
          <span className="rounded-full p-[2px] [background:conic-gradient(from_210deg,#f5a524,#ff5c93,#9b6bff,#4da3ff,#f5a524)]">
            <span className="block rounded-full bg-[#0b0b0d] p-[2px]">
              <Avatar username={post.author.username} avatarUrl={post.author.avatarUrl} size={36} />
            </span>
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-semibold text-foreground">{post.author.username}</span>
            <span className="text-xs text-foreground/60">
              <LocalDate iso={post.publishedAt} />
            </span>
          </span>
        </Link>
        {category && (
          <span className="shrink-0 rounded-full border border-white/15 bg-white/[0.05] px-3 py-1 text-xs font-medium text-foreground/90">
            <Bi en={category.en} ja={category.ja} />
          </span>
        )}
      </header>

      {photos.length > 0 && <PostPhotos photos={photos} ratio={ratio} href={href} title={post.title} priority={first} />}

      <div className="flex flex-col gap-2.5 px-4 pb-2 pt-4 sm:px-5">
        {(where || area) && (
          <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-[#ffb74d]">
            {post.placeCategory && isPlaceCategory(post.placeCategory) ? <PlaceTypeIcon category={post.placeCategory} size={14} className="shrink-0" /> : <MapPin size={14} aria-hidden="true" className="shrink-0" />}
            <span className="truncate">
              {where && post.placeRef ? (
                <Link href={`/community/place/${post.placeRef}`} className="rounded underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
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
        <h3 className="font-[family-name:var(--font-home-serif)] text-[clamp(22px,2.6vw,28px)] font-normal leading-[1.15] tracking-[-0.01em] text-foreground">
          <Link href={href} className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
            {post.title}
          </Link>
        </h3>
        {post.caption && <p className="line-clamp-3 max-w-[62ch] text-base leading-relaxed text-foreground/75">{post.caption}</p>}
        <Link href={href} className="mt-1 inline-flex w-fit items-center gap-1 rounded text-sm font-medium text-foreground/85 underline-offset-4 transition-colors hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
          <Tx en="View full post" />
          <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </div>

      <div className="px-2 pb-2 pt-1 sm:px-3">
        <FeedPostActions postId={post.id} title={post.title} comments={post.commentCount} />
      </div>
    </article>
  );
}
