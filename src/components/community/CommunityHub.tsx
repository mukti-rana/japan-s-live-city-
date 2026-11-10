import Link from "next/link";
import { Compass, Map as MapIcon, Users } from "lucide-react";
import Tx from "@/components/i18n/Tx";
import Bi from "@/components/community/Bi";
import CommunitySearch from "@/components/community/CommunitySearch";
import PostCard from "@/components/community/PostCard";
import { AREA_BY_ID, FEATURED_AREAS, type Area, type FeaturedArea } from "@/lib/community/areas";
import { CATEGORIES } from "@/lib/community/categories";
import { feedQuery, isFiltered, type FeedFilters, type FeedSort } from "@/lib/community/feed";
import type { FeedResult } from "@/lib/community/queries";
import { REGIONS } from "@/lib/explore/regions";

const chip = (on: boolean) =>
  `inline-flex shrink-0 items-center rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${
    on ? "border-azure/60 bg-azure/20 text-azure" : "border-glass-border bg-glass-bg text-foreground/85 hover:border-white/30 hover:text-foreground"
  }`;

const SORTS: { id: FeedSort; en: string }[] = [
  { id: "latest", en: "Latest" },
  { id: "liked", en: "Most liked" },
];

// The Community landing page and each area's page share this layout. Only real,
// published posts are listed — an empty community says so honestly.
//
// Everything here is plain links and one GET form, so filtering is just
// navigation: every view has its own shareable address and works without
// any extra script.
export default function CommunityHub({
  basePath,
  area,
  featured,
  filters,
  result,
}: {
  basePath: string;
  area?: Area;
  featured?: FeaturedArea;
  filters: FeedFilters;
  result: FeedResult;
}) {
  const link = (patch: Partial<FeedFilters>) => `${basePath}${feedQuery({ ...filters, page: 1, ...patch })}`;
  const filtered = isFiltered(filters);
  const nameEn = featured?.en ?? area?.en;
  const nameJa = featured?.ja ?? area?.ja;

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 pb-10">
      <header className="rounded-3xl border border-glass-border bg-gradient-to-br from-lilac/10 via-glass-bg to-azure/10 p-5 backdrop-blur-xl sm:p-8">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-lilac">
          <Users size={14} aria-hidden="true" />
          <Tx en="Community" />
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
          {area && nameEn && nameJa ? <Bi en={nameEn} ja={nameJa} /> : <Tx en="Japan through your eyes" />}
        </h1>
        {area && featured && featured.areaId === area.id && featured.slug !== area.id && (
          <p className="mt-1 text-sm text-foreground/80">
            <Bi en={area.en} ja={area.ja} />
          </p>
        )}
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/90 sm:text-base">
          {area ? <Tx en="Real experiences, photos and recommendations shared by people who have been here." /> : <Tx en="Discover real experiences, beautiful places and recommendations shared by people across Japan." />}
        </p>
        <div className="mt-5">
          <CommunitySearch action={basePath} defaultValue={filters.q} category={filters.category} />
        </div>
      </header>

      <nav aria-labelledby="community-filters" className="flex flex-col gap-3">
        <h2 id="community-filters" className="sr-only">
          <Tx en="Filters" />
        </h2>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-labelledby="community-city">
          <span id="community-city" className="sr-only">
            <Tx en="City" />
          </span>
          <Link href="/community" className={chip(!area)} aria-current={!area ? "page" : undefined}>
            <Tx en="All Japan" />
          </Link>
          {FEATURED_AREAS.map((f) => {
            const on = Boolean(area) && (featured ? featured.slug === f.slug : area?.id === f.areaId && f.slug === f.areaId);
            return (
              <Link key={f.slug} href={`/community/${f.slug}`} className={chip(on)} aria-current={on ? "page" : undefined}>
                <Bi en={f.en} ja={f.ja} />
              </Link>
            );
          })}
        </div>

        <details className="group rounded-2xl border border-glass-border bg-glass-bg px-4 py-2.5">
          <summary className="cursor-pointer select-none list-none text-xs font-medium text-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
            <Tx en="More areas" /> <span aria-hidden="true" className="text-foreground/60 group-open:hidden">+</span>
          </summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {REGIONS.map((r) => (
              <div key={r.id}>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-foreground/65">
                  <Bi en={r.en} ja={r.ja} />
                </p>
                <ul className="flex flex-wrap gap-x-3 gap-y-1">
                  {r.prefectureIds.map((id) => {
                    const a = AREA_BY_ID.get(id);
                    return a ? (
                      <li key={id}>
                        <Link href={`/community/${id}`} className="rounded text-sm text-foreground/90 underline-offset-2 hover:text-azure hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                          <Bi en={a.en} ja={a.ja} />
                        </Link>
                      </li>
                    ) : null;
                  })}
                </ul>
              </div>
            ))}
          </div>
        </details>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-labelledby="community-topic">
          <span id="community-topic" className="sr-only">
            <Tx en="Topic" />
          </span>
          <Link href={link({ category: undefined })} className={chip(!filters.category)} aria-current={!filters.category ? "page" : undefined}>
            <Tx en="All topics" />
          </Link>
          {CATEGORIES.map((c) => (
            <Link key={c.slug} href={link({ category: c.slug })} className={chip(filters.category === c.slug)} aria-current={filters.category === c.slug ? "page" : undefined}>
              <Bi en={c.en} ja={c.ja} />
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2" role="group" aria-labelledby="community-sort">
          <span id="community-sort" className="text-xs font-medium text-foreground/80">
            <Tx en="Sort by" />
          </span>
          {SORTS.map((s) => (
            <Link key={s.id} href={link({ sort: s.id })} className={chip(filters.sort === s.id)} aria-current={filters.sort === s.id ? "true" : undefined}>
              <Tx en={s.en} />
            </Link>
          ))}
          {filtered && (
            <Link href={basePath} className="ml-auto rounded text-xs font-medium text-lilac underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
              <Tx en="Clear filters" />
            </Link>
          )}
        </div>
      </nav>

      <section aria-labelledby="community-posts">
        <h2 id="community-posts" className="sr-only">
          <Tx en="Community posts" />
        </h2>
        {result.state === "unavailable" ? (
          <Notice heading="The community isn't available right now" body="Please try again in a little while." />
        ) : result.posts.length === 0 ? (
          filtered ? (
            <Notice heading="Nothing matches these filters" body="Try a different city, topic or search." action={{ href: basePath, label: "Clear filters" }} />
          ) : (
            <div className="rounded-3xl border border-dashed border-white/20 bg-glass-bg px-5 py-12 text-center sm:py-16">
              <Users size={32} aria-hidden="true" className="mx-auto text-lilac" />
              <h2 className="mt-4 text-xl font-semibold text-foreground">
                <Tx en="No community posts yet" />
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-foreground/85">
                <Tx en="Photo sharing opens in the next update. Until then, explore Japan's places and the live map." />
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href="/explore" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-lilac to-sakura px-5 py-2.5 text-sm font-semibold text-background transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
                  <Compass size={16} aria-hidden="true" />
                  <Tx en="Explore Japan" />
                </Link>
                <Link href="/map" className="inline-flex items-center gap-2 rounded-xl border border-glass-border bg-glass-bg px-5 py-2.5 text-sm font-medium text-foreground transition hover:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                  <MapIcon size={16} aria-hidden="true" />
                  <Tx en="Japan Map" />
                </Link>
              </div>
            </div>
          )
        ) : (
          <>
            <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
              {result.posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
            {(filters.page > 1 || result.hasMore) && (
              <div className="mt-4 flex items-center justify-between gap-3">
                {filters.page > 1 ? (
                  <Link href={link({ page: filters.page - 1 })} rel="prev" className={chip(false)}>
                    <Tx en="Previous" />
                  </Link>
                ) : (
                  <span />
                )}
                {result.hasMore && (
                  <Link href={link({ page: filters.page + 1 })} rel="next" className={chip(false)}>
                    <Tx en="Next" />
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function Notice({ heading, body, action }: { heading: string; body: string; action?: { href: string; label: string } }) {
  return (
    <div role="status" className="rounded-3xl border border-glass-border bg-glass-bg px-5 py-10 text-center">
      <h2 className="text-lg font-semibold text-foreground">
        <Tx en={heading} />
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-foreground/85">
        <Tx en={body} />
      </p>
      {action && (
        <Link href={action.href} className="mt-4 inline-block rounded text-sm font-medium text-lilac underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
          <Tx en={action.label} />
        </Link>
      )}
    </div>
  );
}
