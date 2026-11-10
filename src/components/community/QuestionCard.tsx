import Link from "next/link";
import { CheckCircle2, MapPin, MessageSquareText } from "lucide-react";
import Bi from "@/components/community/Bi";
import LocalDate from "@/components/community/LocalDate";
import Tx from "@/components/i18n/Tx";
import { AREA_BY_ID } from "@/lib/community/areas";
import { getDestination } from "@/lib/explore/catalogue";
import type { CommunityQuestion } from "@/lib/community/types";

// One question in a list: the title leads, then where it is about, whether it
// is resolved, how many answers it has, and who asked.
export default function QuestionCard({ q }: { q: CommunityQuestion }) {
  const area = AREA_BY_ID.get(q.areaId);
  const place = q.placeRef ? getDestination(q.placeRef) : null;
  const placeName = place ? place.names.en ?? place.names.ja ?? null : null;

  return (
    <article className="relative rounded-2xl border border-glass-border bg-panel/60 p-4 backdrop-blur-xl transition-colors hover:border-white/25 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground/80">
        {q.resolved && (
          <span className="inline-flex items-center gap-1 rounded-full bg-mint/15 px-2.5 py-0.5 font-medium text-mint">
            <CheckCircle2 size={12} aria-hidden="true" />
            <Tx en="Resolved" />
          </span>
        )}
        {!q.placeRef && (
          <span className="rounded-full border border-lilac/40 bg-lilac/10 px-2.5 py-0.5 font-medium text-lilac">
            <Tx en="Ask a Local" />
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
      {q.body && <p className="mt-1 line-clamp-2 text-sm text-foreground/85">{q.body}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground/80">
        <span className="inline-flex items-center gap-1.5">
          <MessageSquareText size={13} aria-hidden="true" />
          {q.answerCount} <Tx en={q.answerCount === 1 ? "answer" : "answers"} />
        </span>
        <Link href={`/community/u/${q.author.username}`} className="relative z-10 truncate rounded underline-offset-2 hover:text-azure hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">{q.author.username}</Link>
        <LocalDate iso={q.publishedAt} />
      </div>
    </article>
  );
}
