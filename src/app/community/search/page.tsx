import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Search, Star } from "lucide-react";
import FilterToolbar from "@/components/community/FilterToolbar";
import { locationOptions } from "@/lib/community/locationOptions";
import Avatar from "@/components/community/Avatar";
import CommunityHero from "@/components/community/CommunityHero";
import CommunityTabs from "@/components/community/CommunityTabs";
import LocalDate from "@/components/community/LocalDate";
import PostGrid from "@/components/community/PostGrid";
import QuestionCard from "@/components/community/QuestionCard";
import Stars from "@/components/community/Stars";
import Unavailable from "@/components/community/Unavailable";
import Tx from "@/components/i18n/Tx";
import { CATEGORIES } from "@/lib/community/categories";
import { MAX_QUERY_LENGTH } from "@/lib/community/feed";
import { publicClient } from "@/lib/community/queries";
import { parseSearch, runSearch, searchable, SEARCH_TYPES, type SearchParams, type SearchType } from "@/lib/community/searchQuery";
import { getDestination } from "@/lib/explore/catalogue";

// Search results are never worth a search engine's attention (the content
// itself is indexed where it earns it).
export const metadata: Metadata = { title: "Search — Community", robots: { index: false, follow: true } };

const TYPE_TEXT: Record<SearchType, string> = { all: "Everything", photos: "Photos", reviews: "Reviews", questions: "Questions", people: "People", places: "Places" };

const chip = (on: boolean) =>
  `inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${
    on ? "border-white/30 bg-white/10 text-white" : "border-glass-border bg-glass-bg text-foreground/85 hover:border-white/30 hover:text-foreground"
  }`;

const href = (s: SearchParams, patch: Partial<SearchParams>) => {
  const n = { ...s, ...patch };
  const p = new URLSearchParams();
  if (n.q) p.set("q", n.q);
  if (n.type !== "all") p.set("type", n.type);
  if (n.area) p.set("area", n.area);
  if (n.category) p.set("category", n.category);
  if (n.page > 1) p.set("page", String(n.page));
  const q = p.toString();
  return `/community/search${q ? `?${q}` : ""}`;
};

const H = ({ id, children }: { id: string; children: React.ReactNode }) => (
  <h2 id={id} className="text-lg font-semibold text-foreground sm:text-xl">
    {children}
  </h2>
);

export default async function CommunitySearchPage({ searchParams }: PageProps<"/community/search">) {
  const s = parseSearch(await searchParams);
  const client = publicClient();
  const ready = searchable(s.q);
  const results = client && ready ? await runSearch(client, s) : null;
  const total = results ? results.posts.length + results.reviews.length + results.questions.length + results.people.length + results.places.length : 0;
  const filterNote = s.type === "reviews" || s.type === "people" || s.type === "places";

  return (
    <div className="mx-auto flex w-full max-w-[1760px] flex-col gap-6 pb-10">
      <CommunityTabs active="discover" />
      <CommunityHero>
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-lilac">
          <Search size={14} aria-hidden="true" />
          <Tx en="Community" />
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          <Tx en="Search the community" />
        </h1>
        <form action="/community/search" method="get" role="search" className="mt-5 flex w-full max-w-2xl items-center gap-2">
          {s.type !== "all" && <input type="hidden" name="type" value={s.type} />}
          {s.area && <input type="hidden" name="area" value={s.area} />}
          {s.category && <input type="hidden" name="category" value={s.category} />}
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">
              <Tx en="Search photos, reviews, questions, people and places" />
            </span>
            <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/60" />
            <input type="search" name="q" defaultValue={s.q} maxLength={MAX_QUERY_LENGTH} autoFocus={!s.q} className="h-12 w-full rounded-xl border border-glass-border bg-black/25 pl-10 pr-3 text-base text-foreground outline-none transition-colors hover:border-white/20 focus:border-azure/60 focus-visible:ring-2 focus-visible:ring-azure/40 sm:text-sm" />
          </label>
          <button type="submit" className="h-12 shrink-0 rounded-xl bg-azure px-5 text-sm font-semibold text-black transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            <Tx en="Search" />
          </button>
        </form>
      </CommunityHero>

      <div className="flex flex-col gap-3">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-labelledby="s-type">
          <span id="s-type" className="sr-only">
            <Tx en="Search in" />
          </span>
          {SEARCH_TYPES.map((t) => (
            <Link key={t} href={href(s, { type: t, page: 1 })} className={chip(s.type === t)} aria-current={s.type === t ? "page" : undefined}>
              <Tx en={TYPE_TEXT[t]} />
            </Link>
          ))}
        </div>
        <FilterToolbar
          path="/community/search"
          q={s.q}
          extra={s.type !== "all" ? { type: s.type } : {}}
          clearHref={href({ ...s, area: undefined, category: undefined, page: 1 }, {})}
          facets={[
            { id: "location", label: "Location", icon: "location", param: "area", mode: "single", options: locationOptions("param"), selected: s.area ? [s.area] : [], allLabel: "All Japan", searchable: true },
            { id: "topic", label: "Topic", icon: "topic", param: "category", mode: "single", options: CATEGORIES.map((c) => ({ value: c.slug, en: c.en, ja: c.ja })), selected: s.category ? [s.category] : [], allLabel: "All topics" },
          ]}
        />
        {(s.area || s.category) && filterNote && (
          <p className="text-xs text-foreground/75">
            <Tx en="City and topic only narrow photos and questions." />
          </p>
        )}
      </div>

      {!client ? (
        <Unavailable reason="not_configured" />
      ) : !ready ? (
        <p className="rounded-2xl border border-dashed border-white/20 bg-glass-bg px-4 py-10 text-center text-sm text-foreground/85">
          <Tx en="Type at least 2 letters to search photos, reviews, questions, people and places." />
        </p>
      ) : results === null ? (
        <Unavailable reason="error" />
      ) : total === 0 ? (
        <div role="status" className="rounded-3xl border border-dashed border-white/20 bg-glass-bg px-5 py-12 text-center">
          <h2 className="text-lg font-semibold text-foreground">
            <Tx en="Nothing found" /> “{s.q}”
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-foreground/85">
            <Tx en="Try a shorter or different word, or remove the city and topic filters." />
          </p>
          {(s.area || s.category || s.type !== "all") && (
            <Link href={href(s, { area: undefined, category: undefined, type: "all", page: 1 })} className="mt-5 inline-flex h-11 items-center rounded-xl border border-glass-border bg-glass-bg-strong px-5 text-sm font-semibold text-foreground transition hover:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
              <Tx en="Reset filters" />
            </Link>
          )}
        </div>
      ) : (
        <>
          {results.places.length > 0 && (
            <section aria-labelledby="s-places" className="flex flex-col gap-3">
              <H id="s-places"><Tx en="Places" /></H>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {results.places.map((p) => (
                  <li key={p.id}>
                    <Link href={`/community/place/${p.id}`} className="flex h-full flex-col gap-1 rounded-2xl border border-glass-border bg-panel/70 p-4 transition-colors hover:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                      <span className="text-sm font-semibold text-foreground">{p.label}</span>
                      {p.sub && (
                        <span className="flex items-center gap-1 text-xs text-foreground/80">
                          <MapPin size={12} aria-hidden="true" />
                          {p.sub}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {results.posts.length > 0 && (
            <section aria-labelledby="s-photos" className="flex flex-col gap-3">
              <H id="s-photos"><Tx en="Photos" /></H>
              <PostGrid posts={results.posts} />
              {s.type === "all" && <More to={href(s, { type: "photos", page: 1 })} />}
            </section>
          )}

          {results.reviews.length > 0 && (
            <section aria-labelledby="s-reviews" className="flex flex-col gap-3">
              <H id="s-reviews"><Tx en="Reviews" /></H>
              <ul className="grid gap-3 md:grid-cols-2">
                {results.reviews.map((r) => {
                  const place = r.placeName ? null : getDestination(r.placeRef);
                  return (
                    <li key={r.id} className="rounded-2xl border border-glass-border bg-panel/60 p-4">
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <Star size={13} aria-hidden="true" className="text-gold" />
                        <Link href={`/community/place/${r.placeRef}`} className="truncate underline-offset-2 hover:text-azure hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                          {r.placeName ?? (place ? (place.names.en ?? place.names.ja) : <Tx en="A place in Japan" />)}
                        </Link>
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-xs text-foreground/80">
                        <Stars value={r.rating} size={13} label={`${r.rating} / 5`} />
                        <Link href={`/community/u/${r.author}`} className="underline-offset-2 hover:text-azure hover:underline">{r.author}</Link>
                        <LocalDate iso={r.publishedAt} />
                      </p>
                      <p className="mt-2 line-clamp-4 whitespace-pre-line text-sm text-foreground/90">{r.body}</p>
                    </li>
                  );
                })}
              </ul>
              {s.type === "all" && <More to={href(s, { type: "reviews", page: 1 })} />}
            </section>
          )}

          {results.questions.length > 0 && (
            <section aria-labelledby="s-questions" className="flex flex-col gap-3">
              <H id="s-questions"><Tx en="Questions" /></H>
              <ul className="grid gap-3 md:grid-cols-2">
                {results.questions.map((q) => (
                  <li key={q.id}>
                    <QuestionCard q={q} />
                  </li>
                ))}
              </ul>
              {s.type === "all" && <More to={href(s, { type: "questions", page: 1 })} />}
            </section>
          )}

          {results.people.length > 0 && (
            <section aria-labelledby="s-people" className="flex flex-col gap-3">
              <H id="s-people"><Tx en="People" /></H>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {results.people.map((p) => (
                  <li key={p.username}>
                    <Link href={`/community/u/${p.username}`} className="flex items-center gap-3 rounded-2xl border border-glass-border bg-panel/70 p-3 transition-colors hover:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                      <Avatar username={p.username} avatarUrl={p.avatarUrl} size={40} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-foreground">{p.displayName || p.username}</span>
                        <span className="block truncate text-xs text-foreground/75">@{p.username}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(s.page > 1 || results.hasMore) && (
            <div className="flex items-center justify-between gap-3">
              {s.page > 1 ? (
                <Link href={href(s, { page: s.page - 1 })} rel="prev" className={chip(false)}>
                  <Tx en="Previous" />
                </Link>
              ) : (
                <span />
              )}
              {results.hasMore && (
                <Link href={href(s, { page: s.page + 1 })} rel="next" className={chip(false)}>
                  <Tx en="Next" />
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function More({ to }: { to: string }) {
  return (
    <Link href={to} className="w-fit rounded px-1 text-sm font-medium text-lilac underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
      <Tx en="See all of these" /> →
    </Link>
  );
}
