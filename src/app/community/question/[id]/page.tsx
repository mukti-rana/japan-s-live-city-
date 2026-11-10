import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, MapPin } from "lucide-react";
import AnswerCard from "@/components/community/AnswerCard";
import AnswerForm from "@/components/community/AnswerForm";
import Bi from "@/components/community/Bi";
import { ANSWER_VOTES, HelpfulProvider } from "@/components/community/HelpfulVotes";
import LocalDate from "@/components/community/LocalDate";
import QuestionOwnerTools from "@/components/community/QuestionOwnerTools";
import ReportButton from "@/components/community/ReportButton";
import ShareLinkButton from "@/components/community/ShareLinkButton";
import Tx from "@/components/i18n/Tx";
import { AREA_BY_ID } from "@/lib/community/areas";
import { fetchAnswerComments, fetchAnswers, fetchQuestion, type AnswerSort } from "@/lib/community/discussionQuery";
import { getDestination } from "@/lib/explore/catalogue";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { UUID_RE } from "@/lib/community/validation";

const NOTICE: Record<string, string> = {
  pending: "Your question is waiting for approval. Only you can see it until then.",
  hidden: "This question is hidden. Only you can see it.",
  rejected: "This question wasn't approved. Only you can see it.",
};

async function load(id: string) {
  if (!isSupabaseConfigured) return { state: "unavailable" as const };
  if (!UUID_RE.test(id)) return { state: "missing" as const };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const viewerId = auth.user?.id ?? null;
  const question = await fetchQuestion(supabase, id, viewerId);
  if (!question) return { state: "missing" as const };
  return { state: "ready" as const, supabase, viewerId, question };
}

export async function generateMetadata({ params }: PageProps<"/community/question/[id]">): Promise<Metadata> {
  const res = await load((await params).id);
  if (res.state !== "ready") return { robots: { index: false, follow: false } };
  const { question: q } = res;
  const place = q.placeRef ? getDestination(q.placeRef) : null;
  const where = place ? place.names.en ?? place.names.ja : AREA_BY_ID.get(q.areaId)?.en;
  const title = `${q.title}${where ? ` — ${where}` : ""}`;
  const description = (q.body || `A question about ${where ?? "Japan"} with answers from the community.`).replace(/\s+/g, " ").slice(0, 160);
  // Worth indexing once it is published and has at least one answer.
  const indexable = q.status === "published" && q.answerCount >= 1;
  return { title, description, alternates: { canonical: `/community/question/${q.id}` }, robots: { index: indexable, follow: true }, openGraph: { title, description, url: `/community/question/${q.id}`, type: "article" } };
}

export default async function QuestionPage({ params, searchParams }: PageProps<"/community/question/[id]">) {
  const { id } = await params;
  const res = await load(id);
  if (res.state === "missing") notFound();
  if (res.state === "unavailable") {
    return (
      <div role="status" className="mx-auto max-w-xl py-16 text-center">
        <h1 className="text-xl font-semibold text-foreground">
          <Tx en="Questions aren't available right now. Please try again in a little while." />
        </h1>
      </div>
    );
  }
  const { supabase, viewerId, question: q } = res;
  const sp = await searchParams;
  const sort: AnswerSort = (Array.isArray(sp.asort) ? sp.asort[0] : sp.asort) === "newest" ? "newest" : "helpful";
  const answers = await fetchAnswers(supabase, q.id, sort, viewerId);
  const replies = await fetchAnswerComments(supabase, answers.map((a) => a.id), viewerId);
  const hasMine = answers.some((a) => a.isMine);
  const published = answers.filter((a) => a.status === "published");

  const area = AREA_BY_ID.get(q.areaId);
  const place = q.placeRef ? getDestination(q.placeRef) : null;
  const placeName = place ? place.names.en ?? place.names.ja ?? null : null;
  const askMore = place ? `/community/questions?place=${place.id}` : `/community/questions?area=${q.areaId}`;

  // Question-and-answer markup for search engines, only once there are real answers.
  const markup =
    q.status === "published" && published.length > 0
      ? JSON.stringify({
          "@context": "https://schema.org",
          "@type": "QAPage",
          mainEntity: {
            "@type": "Question",
            name: q.title,
            text: q.body || q.title,
            answerCount: published.length,
            dateCreated: q.publishedAt,
            author: { "@type": "Person", name: q.author.username },
            suggestedAnswer: published.slice(0, 3).map((a) => ({ "@type": "Answer", text: a.body.slice(0, 500), dateCreated: a.createdAt, upvoteCount: a.helpfulCount, author: { "@type": "Person", name: a.author.username } })),
          },
        }).replace(/</g, "\\u003c")
      : null;

  const sortChip = (on: boolean) =>
    `rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${on ? "border-azure/60 bg-azure/20 text-azure" : "border-glass-border bg-glass-bg text-foreground/85 hover:border-white/30"}`;

  return (
    <article className="mx-auto flex w-full max-w-[900px] flex-col gap-6 pb-10">
      {markup && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: markup }} />}

      <nav className="flex flex-wrap items-center gap-1.5 text-xs text-foreground/80">
        <Link href="/community/questions" className="rounded underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
          <Tx en="Questions & Answers" />
        </Link>
        {area && (
          <>
            <span aria-hidden="true">›</span>
            <Link href={`/community/questions?area=${area.id}`} className="rounded underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
              <Bi en={area.en} ja={area.ja} />
            </Link>
          </>
        )}
      </nav>

      {q.isMine && q.status !== "published" && NOTICE[q.status] && (
        <p role="status" className="rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-foreground">
          <Tx en={NOTICE[q.status]} />
        </p>
      )}

      <header className="rounded-3xl border border-glass-border bg-gradient-to-br from-lilac/10 via-glass-bg to-azure/10 p-5 backdrop-blur-xl sm:p-8">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {q.resolved && (
            <span className="inline-flex items-center gap-1 rounded-full bg-mint/15 px-2.5 py-1 font-medium text-mint">
              <CheckCircle2 size={12} aria-hidden="true" />
              <Tx en="Resolved" />
            </span>
          )}
          {!q.placeRef && (
            <span className="rounded-full border border-lilac/40 bg-lilac/10 px-2.5 py-1 font-medium text-lilac">
              <Tx en="Ask a Local" />
            </span>
          )}
        </div>
        <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">{q.title}</h1>
        {(placeName || area) && (
          <p className="mt-2 flex items-center gap-2 text-sm text-foreground/90">
            <MapPin size={15} aria-hidden="true" className="shrink-0 text-lilac" />
            <span>
              {place ? (
                <Link href={`/community/place/${place.id}`} className="rounded underline-offset-2 hover:text-azure hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                  {placeName}
                </Link>
              ) : null}
              {placeName && area ? ", " : ""}
              {area && <Bi en={area.en} ja={area.ja} />}
            </span>
          </p>
        )}
        {q.body && <p className="mt-4 whitespace-pre-line break-words text-sm leading-relaxed text-foreground/95 sm:text-base">{q.body}</p>}
        <p className="mt-4 text-xs text-foreground/75">
          <Link href={`/community/u/${q.author.username}`} className="rounded underline-offset-2 hover:text-azure hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">{q.author.username}</Link> · <LocalDate iso={q.publishedAt} />
        </p>
        <div className="mt-4 flex flex-wrap items-start gap-2">
          <ShareLinkButton title={q.title} path={`/community/question/${q.id}`} />
          {!q.isMine && <ReportButton targetType="question" targetId={q.id} />}
        </div>
        {q.isMine && (
          <div className="mt-3">
            <QuestionOwnerTools id={q.id} title={q.title} body={q.body} resolved={q.resolved} />
          </div>
        )}
      </header>

      <section aria-labelledby="answers-h" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="answers-h" className="text-xl font-semibold text-foreground">
            {published.length} <Tx en={published.length === 1 ? "answer" : "answers"} />
          </h2>
          {answers.length > 1 && (
            <div className="flex gap-2" role="group" aria-labelledby="answer-sort-label">
              <span id="answer-sort-label" className="sr-only">
                <Tx en="Sort by" />
              </span>
              <Link href={`/community/question/${q.id}`} scroll={false} className={sortChip(sort === "helpful")} aria-current={sort === "helpful" ? "true" : undefined}>
                <Tx en="Most helpful" />
              </Link>
              <Link href={`/community/question/${q.id}?asort=newest`} scroll={false} className={sortChip(sort === "newest")} aria-current={sort === "newest" ? "true" : undefined}>
                <Tx en="Newest" />
              </Link>
            </div>
          )}
        </div>

        {answers.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/20 bg-glass-bg px-4 py-8 text-center text-sm text-foreground/85">
            <Tx en="No answers yet. Be the first to help." />
          </p>
        ) : (
          <HelpfulProvider ids={answers.map((a) => a.id)} target={ANSWER_VOTES}>
            <ul className="flex flex-col gap-3">
              {answers.map((a) => (
                <li key={a.id}>
                  <AnswerCard answer={a} replies={replies.get(a.id) ?? []} />
                </li>
              ))}
            </ul>
          </HelpfulProvider>
        )}

        {q.status === "published" &&
          (hasMine ? (
            <p className="text-sm text-foreground/85">
              <Tx en="You've answered this question. You can edit your answer above, or reply under any answer." />
            </p>
          ) : (
            <AnswerForm questionId={q.id} />
          ))}

        <Link href={askMore} className="w-fit rounded text-sm font-medium text-lilac underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
          <Tx en="See more questions" /> →
        </Link>
      </section>
    </article>
  );
}
