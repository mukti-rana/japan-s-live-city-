import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin } from "lucide-react";
import Bi from "@/components/community/Bi";
import LocalDate from "@/components/community/LocalDate";
import PostActions from "@/components/community/PostActions";
import PostGallery from "@/components/community/PostGallery";
import CommentSection from "@/components/community/CommentSection";
import Tx from "@/components/i18n/Tx";
import { AREA_BY_ID } from "@/lib/community/areas";
import { CATEGORY_BY_SLUG } from "@/lib/community/categories";
import { photoUrl } from "@/lib/community/photos";
import { fetchPost } from "@/lib/community/postQuery";
import { fetchPostComments } from "@/lib/community/discussionQuery";
import { createClient } from "@/lib/supabase/server";

// A post is worth indexing once it is published, has a photo, and says enough to be useful.
const MIN_CAPTION_FOR_INDEX = 30;

export async function generateMetadata({ params }: PageProps<"/community/post/[id]">): Promise<Metadata> {
  const { id } = await params;
  const res = await fetchPost(id);
  if (res.state !== "ready") return { robots: { index: false, follow: false } };
  const { post, status } = res;
  const area = AREA_BY_ID.get(post.areaId);
  const where = post.placeLabel ?? post.cityLabel ?? area?.en;
  const title = `${post.title}${where ? ` — ${where}` : ""}`;
  const description = (post.caption || `A photo experience shared by ${post.author.username} from ${where ?? "Japan"}.`).replace(/\s+/g, " ").slice(0, 160);
  const cover = post.images[0] ? photoUrl(post.images[0].path) : null;
  const indexable = status === "published" && post.images.length > 0 && post.caption.length >= MIN_CAPTION_FOR_INDEX;
  return {
    title,
    description,
    alternates: { canonical: `/community/post/${post.id}` },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: { title, description, url: `/community/post/${post.id}`, type: "article", images: cover ? [{ url: cover, width: post.images[0].width ?? undefined, height: post.images[0].height ?? undefined, alt: post.images[0].alt ?? post.title }] : undefined },
    twitter: { card: cover ? "summary_large_image" : "summary", title, description, images: cover ? [cover] : undefined },
  };
}

const NOTICE: Record<string, string> = {
  pending: "Your post is waiting for approval. Only you can see it until then.",
  hidden: "This post is hidden. Only you can see it.",
  rejected: "This post wasn't approved. Only you can see it.",
};

export default async function PostPage({ params }: PageProps<"/community/post/[id]">) {
  const { id } = await params;
  const res = await fetchPost(id);
  if (res.state === "missing") notFound();
  if (res.state === "unavailable") {
    return (
      <div className="mx-auto max-w-xl py-16 text-center" role="status">
        <h1 className="text-xl font-semibold text-foreground">
          <Tx en="The community isn't available right now" />
        </h1>
        <p className="mt-2 text-sm text-foreground/85">
          <Tx en="Please try again in a little while." />
        </p>
      </div>
    );
  }
  const { post, status, isOwner, viewerId } = res;
  // Comments only exist on published posts.
  const comments = status === "published" ? await fetchPostComments(await createClient(), post.id, viewerId) : null;
  const area = AREA_BY_ID.get(post.areaId);
  const category = CATEGORY_BY_SLUG.get(post.categorySlug);
  const images = post.images.flatMap((img) => {
    const src = photoUrl(img.path);
    const thumb = photoUrl(img.thumbPath ?? img.path);
    return src && thumb ? [{ src, thumb, alt: img.alt ?? post.title, width: img.width, height: img.height }] : [];
  });
  const where = post.placeLabel ?? post.cityLabel;

  return (
    <article className="mx-auto w-full max-w-[1200px] pb-10">
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-foreground/80">
        <Link href="/community" className="rounded underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
          <Tx en="Community" />
        </Link>
        {area && (
          <>
            <span aria-hidden="true">›</span>
            <Link href={`/community/${area.id}`} className="rounded underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
              <Bi en={area.en} ja={area.ja} />
            </Link>
          </>
        )}
      </nav>

      {isOwner && status !== "published" && NOTICE[status] && (
        <p role="status" className="mb-4 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-foreground">
          <Tx en={NOTICE[status]} />
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <PostGallery images={images} />

        <div className="flex flex-col gap-4 rounded-3xl border border-glass-border bg-glass-bg p-5 backdrop-blur-xl sm:p-6">
          {category && (
            <span className="w-fit rounded-full border border-lilac/40 bg-lilac/10 px-3 py-1 text-xs font-medium text-lilac">
              <Bi en={category.en} ja={category.ja} />
            </span>
          )}
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">{post.title}</h1>

          <ul className="flex flex-col gap-1.5 text-sm text-foreground/90">
            {(where || area) && (
              <li className="flex items-center gap-2">
                <MapPin size={15} aria-hidden="true" className="shrink-0 text-lilac" />
                <span>
                  {post.placeRef ? (
                    <Link href={`/explore/${post.placeRef}`} className="rounded underline-offset-2 hover:text-azure hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                      {where}
                    </Link>
                  ) : (
                    where
                  )}
                  {where && area ? ", " : ""}
                  {area && <Bi en={area.en} ja={area.ja} />}
                </span>
              </li>
            )}
            {post.visitDate && (
              <li className="flex items-center gap-2">
                <CalendarDays size={15} aria-hidden="true" className="shrink-0 text-lilac" />
                <span>
                  <Tx en="Visited" /> <LocalDate iso={post.visitDate} />
                </span>
              </li>
            )}
          </ul>

          {post.caption && <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/95 sm:text-base">{post.caption}</p>}

          <div className="flex items-center gap-2.5 border-t border-glass-border pt-4 text-sm text-foreground/90">
            {post.author.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.author.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-lilac/20 text-sm font-semibold uppercase text-lilac">
                {post.author.username.slice(0, 1)}
              </span>
            )}
            <span>
              <Link href={`/community/u/${post.author.username}`} className="rounded font-medium underline-offset-2 hover:text-azure hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">{post.author.username}</Link>
              <span className="block text-xs text-foreground/70">
                <LocalDate iso={post.publishedAt} />
              </span>
            </span>
          </div>

          <PostActions postId={post.id} title={post.title} likes={post.likeCount} saves={post.saveCount} isOwner={isOwner} path={`/community/post/${post.id}`} />
        </div>
      </div>

      {status === "published" && (
        <section aria-labelledby="comments-h" className="mt-8 max-w-3xl">
          <h2 id="comments-h" className="mb-4 text-xl font-semibold text-foreground">
            <Tx en="Comments" /> {comments && comments.length > 0 && <span className="text-base font-normal text-foreground/70">({comments.length})</span>}
          </h2>
          {comments === null ? (
            <p role="status" className="text-sm text-foreground/85">
              <Tx en="Comments aren't available right now." />
            </p>
          ) : (
            <CommentSection target={{ type: "post", id: post.id }} comments={comments} />
          )}
        </section>
      )}
    </article>
  );
}
