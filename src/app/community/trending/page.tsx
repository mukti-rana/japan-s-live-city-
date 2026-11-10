import type { Metadata } from "next";
import Link from "next/link";
import { Flame } from "lucide-react";
import Avatar from "@/components/community/Avatar";
import CommunityHero from "@/components/community/CommunityHero";
import CommunityTabs from "@/components/community/CommunityTabs";
import PlaceCards from "@/components/community/PlaceCards";
import PostGrid from "@/components/community/PostGrid";
import QuestionCard from "@/components/community/QuestionCard";
import Unavailable from "@/components/community/Unavailable";
import Tx from "@/components/i18n/Tx";
import { publicClient } from "@/lib/community/queries";
import { fetchTrending, parsePeriod, PERIODS, type Period } from "@/lib/community/trendingQuery";

const TITLE = "Trending — Community — Japan Through People's Eyes";
const DESCRIPTION = "The photos, places and people the community loves most right now.";
export const metadata: Metadata = { title: TITLE, description: DESCRIPTION, alternates: { canonical: "/community/trending" }, robots: { index: false, follow: true } };

const PERIOD_TEXT: Record<Period, string> = { week: "This week", month: "This month", all: "All time" };

const chip = (on: boolean) =>
  `inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${
    on ? "border-azure/60 bg-azure/20 text-azure" : "border-glass-border bg-glass-bg text-foreground/85 hover:border-white/30 hover:text-foreground"
  }`;

const H = ({ id, children }: { id: string; children: React.ReactNode }) => (
  <h2 id={id} className="text-lg font-semibold text-foreground sm:text-xl">
    {children}
  </h2>
);

// What is popular, for a week, a month or all time — counted from real likes,
// recommendations and published posts. A section with nothing to show is left
// out, and a quiet period says so instead of padding the page.
export default async function TrendingPage({ searchParams }: PageProps<"/community/trending">) {
  const period = parsePeriod((await searchParams).period);
  const client = publicClient();
  const data = client ? await fetchTrending(client, period) : null;
  const empty = data && data.posts.length + data.places.length + data.contributors.length + data.questions.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 pb-10">
      <CommunityTabs active="trending" />
      <CommunityHero>
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-lilac">
          <Flame size={14} aria-hidden="true" />
          <Tx en="Community" />
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          <Tx en="Trending in the community" />
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/90 sm:text-base">
          <Tx en="Counted from real likes, reviews and posts. Nothing here is estimated." />
        </p>
      </CommunityHero>

      <div className="flex gap-2" role="group" aria-labelledby="t-period">
        <span id="t-period" className="sr-only">
          <Tx en="Time period" />
        </span>
        {PERIODS.map((p) => (
          <Link key={p} href={p === "week" ? "/community/trending" : `/community/trending?period=${p}`} className={chip(period === p)} aria-current={period === p ? "page" : undefined}>
            <Tx en={PERIOD_TEXT[p]} />
          </Link>
        ))}
      </div>

      {!data ? (
        <Unavailable reason={client ? "error" : "not_configured"} />
      ) : empty ? (
        <div role="status" className="rounded-3xl border border-dashed border-white/20 bg-glass-bg px-5 py-12 text-center">
          <h2 className="text-lg font-semibold text-foreground">
            <Tx en={period === "all" ? "Nothing is trending yet" : "A quiet period"} />
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-foreground/85">
            <Tx en={period === "all" ? "Photos and places show up here once people like and review them." : "Nothing has been liked or reviewed in this time. Try a longer period."} />
          </p>
          {period !== "all" && (
            <Link href={period === "week" ? "/community/trending?period=month" : "/community/trending?period=all"} className="mt-5 inline-flex h-11 items-center rounded-xl border border-glass-border bg-glass-bg-strong px-5 text-sm font-semibold text-foreground transition hover:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
              <Tx en={period === "week" ? "Show this month" : "Show all time"} />
            </Link>
          )}
        </div>
      ) : (
        <>
          {data.posts.length > 0 && (
            <section aria-labelledby="t-photos" className="flex flex-col gap-3">
              <H id="t-photos"><Tx en="Most loved photos" /></H>
              <PostGrid posts={data.posts} />
            </section>
          )}
          {data.places.length > 0 && (
            <section aria-labelledby="t-places" className="flex flex-col gap-3">
              <H id="t-places"><Tx en="Most recommended places" /></H>
              <PlaceCards places={data.places} />
            </section>
          )}
          {data.questions.length > 0 && (
            <section aria-labelledby="t-questions" className="flex flex-col gap-3">
              <H id="t-questions"><Tx en="Hot questions" /></H>
              <ul className="grid gap-3 lg:grid-cols-2">
                {data.questions.map((q) => (
                  <li key={q.id}>
                    <QuestionCard q={q} />
                  </li>
                ))}
              </ul>
            </section>
          )}
          {data.contributors.length > 0 && (
            <section aria-labelledby="t-people" className="flex flex-col gap-3">
              <H id="t-people"><Tx en="Most active contributors" /></H>
              <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {data.contributors.map((c, i) => (
                  <li key={c.username}>
                    <Link href={`/community/u/${c.username}`} className="flex items-center gap-3 rounded-2xl border border-glass-border bg-panel/70 p-3 transition-colors hover:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                      <span aria-hidden="true" className="w-5 text-center text-sm font-bold text-lilac">{i + 1}</span>
                      <Avatar username={c.username} avatarUrl={c.avatarUrl} size={40} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-foreground">@{c.username}</span>
                        <span className="block text-xs text-foreground/80">
                          {c.photos} <Tx en={c.photos === 1 ? "photo post" : "photo posts"} />
                          {c.reviews > 0 && (
                            <>
                              {" · "}
                              {c.reviews} <Tx en={c.reviews === 1 ? "review" : "reviews"} />
                            </>
                          )}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </>
      )}
    </div>
  );
}
