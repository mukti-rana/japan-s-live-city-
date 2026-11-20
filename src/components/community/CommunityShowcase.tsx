import Link from "next/link";
import { Heart, Images, MapPin, MessageCircle } from "lucide-react";
import Avatar from "@/components/community/Avatar";
import Bi from "@/components/community/Bi";
import { playfair } from "@/components/home/cinematic/fonts";
import { AREA_BY_ID } from "@/lib/community/areas";
import { CATEGORY_BY_SLUG } from "@/lib/community/categories";
import { photoUrl } from "@/lib/community/photos";
import type { CommunityPost } from "@/lib/community/types";

// The home page's Community, as an editorial showcase: the latest real posts as large photographs, the newest as a big feature with the others
// around it, each with where it was taken, its title, who shared it and the real like and comment counts. Every picture opens its post. It is a
// preview: the whole feed, with its likes, saves and comments, is on the Community page. With one or two posts it shows one or two large pictures
// instead of a grid with holes in it.
function Tile({ post, feature = false, priority = false }: { post: CommunityPost; feature?: boolean; priority?: boolean }) {
  const cover = post.images[0];
  const src = cover ? photoUrl(feature ? cover.path : (cover.thumbPath ?? cover.path)) : null;
  const area = AREA_BY_ID.get(post.areaId);
  const category = CATEGORY_BY_SLUG.get(post.categorySlug);
  const where = post.placeLabel ?? post.cityLabel;
  return (
    <Link href={`/community/post/${post.id}`} className={`${playfair.variable} group relative isolate block h-full min-h-[18rem] overflow-hidden rounded-[26px] border border-white/10 bg-[#0b0b0d] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure focus-visible:ring-offset-2 focus-visible:ring-offset-black`}>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element -- community photographs live in Supabase storage
        <img src={src} alt={cover?.alt ?? post.title} loading={priority ? "eager" : "lazy"} decoding="async" className="absolute inset-0 -z-20 h-full w-full object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06] motion-reduce:transition-none" />
      )}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(0,0,0,0.35)_0%,transparent_28%,rgba(0,0,0,0.5)_58%,rgba(0,0,0,0.9)_100%)]" />
      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-4">
        {category ? (
          <span className="rounded-full border border-white/25 bg-black/45 px-3 py-1 text-xs font-medium backdrop-blur-md">
            <Bi en={category.en} ja={category.ja} />
          </span>
        ) : (
          <span />
        )}
        {post.images.length > 1 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium tabular-nums backdrop-blur-md">
            <Images size={12} aria-hidden="true" />
            {post.images.length}
          </span>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4 sm:p-5">
        {(where || area) && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-[#ffcf7a] [text-shadow:0_1px_10px_rgba(0,0,0,0.8)]">
            <MapPin size={14} aria-hidden="true" className="shrink-0" />
            <span className="truncate">
              {where}
              {where && area ? ", " : ""}
              {area && <Bi en={area.en} ja={area.ja} />}
            </span>
          </p>
        )}
        <h3 className={`font-[family-name:var(--font-home-serif)] font-normal leading-[1.08] tracking-[-0.01em] [text-shadow:0_2px_20px_rgba(0,0,0,0.7)] ${feature ? "text-[clamp(30px,3.4vw,48px)]" : "line-clamp-2 text-[clamp(20px,1.8vw,26px)]"}`}>{post.title}</h3>
        {feature && post.caption && <p className="line-clamp-2 max-w-[52ch] text-sm leading-relaxed text-white/80 sm:text-base">{post.caption}</p>}
        <div className="mt-1 flex items-center justify-between gap-3 text-xs text-white/85">
          <span className="flex min-w-0 items-center gap-2">
            <Avatar username={post.author.username} avatarUrl={post.author.avatarUrl} size={22} />
            <span className="truncate font-medium">{post.author.username}</span>
          </span>
          <span className="flex shrink-0 items-center gap-3 tabular-nums">
            <span className="flex items-center gap-1">
              <Heart size={13} aria-hidden="true" />
              {post.likeCount}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle size={13} aria-hidden="true" />
              {post.commentCount}
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function CommunityShowcase({ posts }: { posts: CommunityPost[] }) {
  const [feature, ...rest] = posts.slice(0, 5);
  if (!feature) return null;
  if (rest.length === 0) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="aspect-[4/3] sm:aspect-[16/10]">
          <Tile post={feature} feature priority />
        </div>
      </div>
    );
  }
  if (rest.length === 1) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:gap-5">
        {[feature, ...rest].map((p, i) => (
          <div key={p.id} className="aspect-[4/5]">
            <Tile post={p} feature={i === 0} priority={i === 0} />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr] lg:gap-5">
      <div className="aspect-[4/5] lg:aspect-auto lg:min-h-[34rem]">
        <Tile post={feature} feature priority />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:gap-5">
        {rest.slice(0, 4).map((p) => (
          <div key={p.id} className="aspect-[4/5]">
            <Tile post={p} />
          </div>
        ))}
      </div>
    </div>
  );
}
