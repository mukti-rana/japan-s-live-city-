import Link from "next/link";
import { CheckCircle2, Clock, ImageIcon, MapPin, MessageSquareText, ThumbsUp } from "lucide-react";
import Avatar from "@/components/community/Avatar";
import Bi from "@/components/community/Bi";
import LocalDate from "@/components/community/LocalDate";
import Tx from "@/components/i18n/Tx";
import { AREA_BY_ID } from "@/lib/community/areas";
import { CATEGORY_BY_SLUG } from "@/lib/community/categories";
import { photoUrl } from "@/lib/community/photos";
import { getDestination } from "@/lib/explore/catalogue";
import type { CommunityQuestion } from "@/lib/community/types";

// One question in a list: the title leads, then its topic and where it is about,
// whether it is resolved, how many answers it has, and who asked. A question with
// photos shows the first one as a small picture.
export default function QuestionCard({ q }: { q: CommunityQuestion }) {
  const area = q.areaId ? AREA_BY_ID.get(q.areaId) : undefined;
  const category = q.categorySlug ? CATEGORY_BY_SLUG.get(q.categorySlug) : undefined;
  // The name saved with the question; older questions fall back to the Explore catalogue.
  const catalogue = q.placeRef && !q.placeName ? getDestination(q.placeRef) : null;
  const placeName = q.placeName ?? (catalogue ? (catalogue.names.en ?? catalogue.names.ja ?? null) : null);
  const cover = q.images[0];
  const thumb = cover ? photoUrl(cover.thumbPath ?? cover.path) : null;

  return (
    <article className="group relative flex gap-4 rounded-2xl border border-white/[0.08] bg-cm-card p-4 transition-colors hover:border-white/20 sm:p-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-foreground/80">
          {q.resolved && (
            <span className="inline-flex items-center gap-1 rounded-full bg-mint/15 px-2.5 py-0.5 font-medium text-mint">
              <CheckCircle2 size={12} aria-hidden="true" />
              <Tx en="Resolved" />
            </span>
          )}
          {!q.placeRef && area && (
            <span className="rounded-full border border-lilac/40 bg-lilac/10 px-2.5 py-0.5 font-medium text-lilac">
              <Tx en="Ask a Local" />
            </span>
          )}
          {category && (
            <span className="rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-0.5 font-medium text-foreground/85">
              <Bi en={category.en} ja={category.ja} />
            </span>
          )}
          {(placeName || area) && (
            <span className="flex min-w-0 items-center gap-1">
              <MapPin size={12} aria-hidden="true" className="shrink-0" />
              <span className="truncate">
                {placeName ? `${placeName}${area ? ", " : ""}` : ""}
                {area && <Bi en={area.en} ja={area.ja} />}
              </span>
            </span>
          )}
        </div>
        <h3 className="mt-2 text-base font-semibold leading-snug text-foreground">
          {/* The whole card opens the question: the title link stretches over it. */}
          <Link href={`/community/question/${q.id}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-azure">
            {q.title}
          </Link>
        </h3>
        {q.body && <p className="mt-1 line-clamp-2 text-sm text-foreground/75">{q.body}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground/75">
          <span className="inline-flex items-center gap-1.5">
            <MessageSquareText size={13} aria-hidden="true" />
            {q.answerCount} <Tx en={q.answerCount === 1 ? "answer" : "answers"} />
          </span>
          {q.helpfulCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-mint">
              <ThumbsUp size={13} aria-hidden="true" />
              {q.helpfulCount} <Tx en="helpful" />
            </span>
          )}
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <Avatar username={q.author.username} avatarUrl={q.author.avatarUrl} size={20} />
            <Link href={`/community/u/${q.author.username}`} className="relative z-10 truncate rounded underline-offset-2 hover:text-azure hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">{q.author.username}</Link>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock size={12} aria-hidden="true" />
            {q.answerCount > 0 && q.lastActivityAt ? <Tx en="Last answer" /> : <Tx en="Asked" />}{" "}
            <LocalDate iso={q.answerCount > 0 && q.lastActivityAt ? q.lastActivityAt : q.publishedAt} />
          </span>
        </div>
        {q.answerCount === 0 && (
          <p className="relative z-10 mt-2 text-xs font-medium text-gold">
            <Tx en="Waiting for its first answer" />
          </p>
        )}
      </div>
      {thumb && (
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-cm-pop-foot sm:h-24 sm:w-24">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb} alt="" loading="lazy" decoding="async" className="cm-photo h-full w-full object-cover" />
          {q.images.length > 1 && (
            <span className="absolute bottom-1 right-1 inline-flex items-center gap-0.5 rounded-full bg-black/65 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur">
              <ImageIcon size={10} aria-hidden="true" />
              {q.images.length}
            </span>
          )}
        </div>
      )}
    </article>
  );
}
