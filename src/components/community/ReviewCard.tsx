import { ThumbsDown, ThumbsUp } from "lucide-react";
import Stars from "@/components/community/Stars";
import LocalDate from "@/components/community/LocalDate";
import { HelpfulButton, REVIEW_VOTES } from "@/components/community/HelpfulVotes";
import ReportButton from "@/components/community/ReportButton";
import ReviewOwnerTools from "@/components/community/ReviewOwnerTools";
import Tx from "@/components/i18n/Tx";
import { photoUrl } from "@/lib/community/photos";
import type { CommunityReview } from "@/lib/community/types";

const NOTICE: Record<string, string> = {
  pending: "Your review is waiting for approval. Only you can see it until then.",
  hidden: "This review is hidden. Only you can see it.",
  rejected: "This review wasn't approved. Only you can see it.",
};

// One review. The stars lead, then who, when, whether they'd recommend it, the
// words and the photos. Your own review shows edit/delete instead of
// helpful/report. Names are usernames only: no email or private detail.
export default function ReviewCard({ review, placeRef }: { review: CommunityReview; placeRef: string }) {
  const photos = review.photos.flatMap((p) => {
    const full = photoUrl(p.path);
    const thumb = photoUrl(p.thumbPath ?? p.path);
    return full && thumb ? [{ full, thumb }] : [];
  });
  const draft = {
    id: review.id,
    rating: review.rating,
    body: review.body,
    recommend: review.recommend,
    visitDate: review.visitDate,
    photos: review.photos.flatMap((p) => {
      const url = photoUrl(p.thumbPath ?? p.path);
      return url ? [{ path: p.path, url }] : [];
    }),
  };

  return (
    <article className="rounded-2xl border border-glass-border bg-panel/60 p-4 backdrop-blur-xl sm:p-5">
      {review.isMine && review.status !== "published" && NOTICE[review.status] && (
        <p role="status" className="mb-3 rounded-xl border border-gold/40 bg-gold/10 px-3 py-2 text-xs text-foreground">
          <Tx en={NOTICE[review.status]} />
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {review.author.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={review.author.avatarUrl} alt="" loading="lazy" decoding="async" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-lilac/20 text-sm font-semibold uppercase text-lilac">
              {review.author.username.slice(0, 1)}
            </span>
          )}
          <div>
            <p className="text-sm font-medium text-foreground">
              {review.author.username}
              {review.isMine && <span className="ml-2 rounded-full bg-lilac/20 px-2 py-0.5 text-[10px] font-semibold text-lilac"><Tx en="You" /></span>}
            </p>
            <p className="text-xs text-foreground/75">
              <LocalDate iso={review.publishedAt} />
              {review.visitDate && (
                <>
                  {" · "}
                  <Tx en="Visited" /> <LocalDate iso={review.visitDate} />
                </>
              )}
            </p>
          </div>
        </div>
        <Stars value={review.rating} size={16} label={`${review.rating} / 5`} />
      </div>

      <p className={`mt-3 inline-flex items-center gap-1.5 text-xs font-medium ${review.recommend ? "text-mint" : "text-sakura"}`}>
        {review.recommend ? <ThumbsUp size={13} aria-hidden="true" /> : <ThumbsDown size={13} aria-hidden="true" />}
        <Tx en={review.recommend ? "Recommends this place" : "Doesn't recommend this place"} />
      </p>

      {review.body && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/95">{review.body}</p>}

      {photos.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {photos.map((p, i) => (
            <li key={p.full}>
              <a href={p.full} target="_blank" rel="noopener noreferrer" className="block h-20 w-20 overflow-hidden rounded-xl border border-glass-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumb} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                <span className="sr-only">
                  <Tx en="Photo" /> {i + 1}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {review.isMine ? (
        <ReviewOwnerTools placeRef={placeRef} draft={draft} />
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-1">
          <HelpfulButton id={review.id} target={REVIEW_VOTES} count={review.helpfulCount} isMine={false} ownHint="You can't vote on your own review." />
          <ReportButton targetType="review" targetId={review.id} />
        </div>
      )}
    </article>
  );
}
