import type { Metadata } from "next";
import Link from "next/link";
import { HelpCircle, X } from "lucide-react";
import FilterToolbar from "@/components/community/FilterToolbar";
import CommunityHero from "@/components/community/CommunityHero";
import CommunityTabs from "@/components/community/CommunityTabs";
import Unavailable from "@/components/community/Unavailable";
import QuestionList from "@/components/community/QuestionList";
import Tx from "@/components/i18n/Tx";
import { isAreaId } from "@/lib/community/areas";
import { locationOptions } from "@/lib/community/locationOptions";
import { fetchQuestions, QUESTION_SORTS, questionFiltersFromParams, type QuestionSort } from "@/lib/community/discussionQuery";
import { publicClient } from "@/lib/community/queries";
import { MIN_INDEXABLE_POSTS } from "@/lib/community/seo";
import { getDestination } from "@/lib/explore/catalogue";

const TITLE = "Questions & Answers — Community";
const DESCRIPTION = "Ask questions about places across Japan and get answers from people who have been there.";

const SORT_TEXT: Record<QuestionSort, string> = { latest: "Latest", answers: "Most answered", unanswered: "Unanswered", helpful: "Most helpful" };
const SORT_JA: Record<QuestionSort, string> = { latest: "新着順", answers: "回答が多い順", unanswered: "未回答", helpful: "役に立った順" };

async function load(sp: Record<string, string | string[] | undefined>) {
  const filters = questionFiltersFromParams(sp, isAreaId);
  const client = publicClient();
  const result = client ? await fetchQuestions(client, filters, null) : null;
  return { filters, result, client: Boolean(client) };
}

export async function generateMetadata({ searchParams }: PageProps<"/community/questions">): Promise<Metadata> {
  const { filters, result } = await load(await searchParams);
  const plain = !filters.areaId && !filters.placeRef && filters.sort === "latest" && filters.page === 1;
  const indexable = plain && (result?.questions.length ?? 0) >= MIN_INDEXABLE_POSTS;
  return { title: TITLE, description: DESCRIPTION, alternates: { canonical: "/community/questions" }, robots: { index: indexable, follow: true }, openGraph: { title: TITLE, description: DESCRIPTION, url: "/community/questions" } };
}

export default async function QuestionsPage({ searchParams }: PageProps<"/community/questions">) {
  const { filters, result, client } = await load(await searchParams);
  const place = filters.placeRef ? getDestination(filters.placeRef) : null;
  const askHref = `/community/questions/new${filters.placeRef ? `?place=${filters.placeRef}` : filters.areaId ? `?area=${filters.areaId}` : ""}`;

  return (
    <div className="mx-auto flex w-full max-w-[1760px] flex-col gap-6 pb-10">
      <CommunityTabs active="questions" />
      <CommunityHero>
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-lilac">
          <HelpCircle size={14} aria-hidden="true" />
          <Tx en="Ask a Local" />
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          <Tx en="Questions & Answers" />
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/90 sm:text-base">
          <Tx en="Ask about a place or a city, and get answers from people who have been there." />
        </p>
        <Link href={askHref} className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-background transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
          <Tx en="Ask a Question" />
        </Link>
      </CommunityHero>

      <div className="flex flex-col gap-3">
        {place ? (
          <p className="flex flex-wrap items-center gap-2 text-sm text-foreground/90">
            <Tx en="Questions about" /> <strong className="font-semibold">{place.names.en ?? place.names.ja}</strong>
            <Link href="/community/questions" className="inline-flex items-center gap-1 rounded text-xs text-foreground/70 underline-offset-2 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
              <X size={12} aria-hidden="true" />
              <Tx en="Clear filters" />
            </Link>
          </p>
        ) : null}
        <FilterToolbar
          path="/community/questions"
          clearHref="/community/questions"
          extra={filters.placeRef ? { place: filters.placeRef } : {}}
          facets={[
            ...(place ? [] : [{ id: "location", label: "Location", icon: "location" as const, param: "area", mode: "single" as const, options: locationOptions("param"), selected: filters.areaId ? [filters.areaId] : [], allLabel: "All Japan", searchable: true }]),
            { id: "sort", label: "Sort by", icon: "sort" as const, param: "sort", mode: "single" as const, options: QUESTION_SORTS.map((s) => ({ value: s, en: SORT_TEXT[s], ja: SORT_JA[s] })), selected: [filters.sort], defaultValue: "latest", narrows: false },
          ]}
        />
        {result === null ? (
          <Unavailable reason={client ? "error" : "not_configured"} />
        ) : (
          <QuestionList basePath="/community/questions" showSort={false} filters={filters} questions={result.questions} hasMore={result.hasMore} emptyHint="No questions yet. Be the first to ask." />
        )}
      </div>
    </div>
  );
}
