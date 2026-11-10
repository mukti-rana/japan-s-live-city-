import type { Metadata } from "next";
import Link from "next/link";
import { HelpCircle, X } from "lucide-react";
import Bi from "@/components/community/Bi";
import CommunityHero from "@/components/community/CommunityHero";
import CommunityTabs from "@/components/community/CommunityTabs";
import Unavailable from "@/components/community/Unavailable";
import QuestionList from "@/components/community/QuestionList";
import Tx from "@/components/i18n/Tx";
import { AREA_BY_ID, FEATURED_AREAS, isAreaId } from "@/lib/community/areas";
import { fetchQuestions, questionFiltersFromParams } from "@/lib/community/discussionQuery";
import { publicClient } from "@/lib/community/queries";
import { MIN_INDEXABLE_POSTS } from "@/lib/community/seo";
import { getDestination } from "@/lib/explore/catalogue";

const TITLE = "Questions & Answers — Community";
const DESCRIPTION = "Ask questions about places across Japan and get answers from people who have been there.";

const chip = (on: boolean) =>
  `inline-flex shrink-0 items-center rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${
    on ? "border-azure/60 bg-azure/20 text-azure" : "border-glass-border bg-glass-bg text-foreground/85 hover:border-white/30 hover:text-foreground"
  }`;

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
  const area = filters.areaId ? AREA_BY_ID.get(filters.areaId) : undefined;
  const askHref = `/community/questions/new${filters.placeRef ? `?place=${filters.placeRef}` : filters.areaId ? `?area=${filters.areaId}` : ""}`;
  const areaLink = (id?: string) => `/community/questions${id ? `?area=${id}` : ""}`;

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-6 pb-10">
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
        <Link href={askHref} className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-lilac to-sakura px-5 text-sm font-semibold text-background transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
          <Tx en="Ask a Question" />
        </Link>
      </CommunityHero>

      <div className="flex flex-col gap-3">
        {place ? (
          <p className="flex flex-wrap items-center gap-2 text-sm text-foreground/90">
            <Tx en="Questions about" /> <strong className="font-semibold">{place.names.en ?? place.names.ja}</strong>
            <Link href="/community/questions" className="inline-flex items-center gap-1 rounded text-xs text-lilac underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
              <X size={12} aria-hidden="true" />
              <Tx en="Clear filters" />
            </Link>
          </p>
        ) : (
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-labelledby="q-area-label">
            <span id="q-area-label" className="sr-only">
              <Tx en="City" />
            </span>
            <Link href={areaLink()} className={chip(!area)} aria-current={!area ? "page" : undefined}>
              <Tx en="All Japan" />
            </Link>
            {FEATURED_AREAS.map((f) => (
              <Link key={f.slug} href={areaLink(f.areaId)} className={chip(filters.areaId === f.areaId)} aria-current={filters.areaId === f.areaId ? "page" : undefined}>
                <Bi en={f.en} ja={f.ja} />
              </Link>
            ))}
          </div>
        )}
        {result === null ? (
          <Unavailable reason={client ? "error" : "not_configured"} />
        ) : (
          <QuestionList basePath="/community/questions" filters={filters} questions={result.questions} hasMore={result.hasMore} emptyHint="No questions yet. Be the first to ask." />
        )}
      </div>
    </div>
  );
}
