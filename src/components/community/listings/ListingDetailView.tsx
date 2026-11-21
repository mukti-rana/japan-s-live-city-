"use client";

import Link from "next/link";
import { ExternalLink, Globe, MapPin, Navigation, Ticket, UserRound, ClipboardCheck } from "lucide-react";
import Avatar from "@/components/community/Avatar";
import Bi from "@/components/community/Bi";
import ReportButton from "@/components/community/ReportButton";
import ShareLinkButton from "@/components/community/ShareLinkButton";
import Countdown from "@/components/community/listings/Countdown";
import ListingCard from "@/components/community/listings/ListingCard";
import ListingGallery from "@/components/community/listings/ListingGallery";
import { CategoryChip, PriceText, StateBadges, WhenText } from "@/components/community/listings/ListingPieces";
import { CATEGORY_ICON, KIND_LABEL, photosOf, videoOf, type PhotoSrc } from "@/lib/community/listings/display";
import { playfair } from "@/components/home/cinematic/fonts";
import Tx from "@/components/i18n/Tx";
import { AREA_BY_ID } from "@/lib/community/areas";
import { googleDirectionsUrl, googleMapsUrl, osmEmbedUrl } from "@/lib/community/placeTypes";
import { nextOccurrence } from "@/lib/community/listings/time";
import type { Listing } from "@/lib/community/listings/types";

const button = "inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/50 bg-white/10 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70";
const plain = "inline-flex h-10 items-center gap-2 rounded-full border border-white/20 px-4 text-sm font-medium text-white/90 transition-colors hover:border-white/45 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60";

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-[0.16em] text-white/50">
        <Tx en={label} />
      </dt>
      <dd className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-foreground/90">{children}</dd>
    </div>
  );
}

const external = "noopener noreferrer nofollow ugc";

// A listing's own page: a cinematic cover, then the details and, beside them, when, where, tickets and who is behind it. Used for the real page
// and for the publishing preview (`preview` leaves out the actions that need a saved listing, and `photos` shows pictures still on the device).
export default function ListingDetailView({ l, now, photos, video, preview = false, related = [], children }: { l: Listing; now: number; photos?: PhotoSrc[]; video?: string | null; preview?: boolean; related?: Listing[]; children?: React.ReactNode }) {
  const pics = photos ?? photosOf(l);
  const vid = video === undefined ? videoOf(l) : video;
  const cover = pics[0] ?? null;
  const Icon = CATEGORY_ICON[l.categorySlug] ?? CATEGORY_ICON.other;
  const place = l.areaId ? AREA_BY_ID.get(l.areaId) : null;
  // The prefecture is added after the venue and city, unless the city already says it ("Fukuoka City", "Osaka").
  const area = place && ![l.venueName, l.cityLabel, l.address].some((t) => t?.toLowerCase().includes(place.en.toLowerCase())) ? place : null;
  const timed = l.kind === "event" || l.kind === "activity";
  const occ = timed && l.startsAt ? nextOccurrence(l, now) : null;
  const upcomingStart = occ && occ.start > now && l.status === "published" && !l.postponed ? occ.start : null;
  const hasPlace = l.lat !== null && l.lon !== null;
  const where = [l.venueName, l.address, l.cityLabel].filter(Boolean);
  const ended = l.status === "expired" || (timed && l.startsAt && !occ);
  const contact = l.organizerContact;
  const isEmail = contact ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) : false;

  return (
    <article className={`${playfair.variable} flex flex-col gap-8`}>
      {/* The cover */}
      <header className="keep-dark-ink relative isolate flex min-h-[26rem] flex-col justify-end overflow-hidden rounded-[30px] border border-white/10 bg-[#0b0b10] text-white sm:min-h-[34rem]">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- community photographs live in Supabase storage
          <img src={cover.src} alt={cover.alt} loading="eager" decoding="async" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        ) : (
          <div aria-hidden="true" className="absolute inset-0 -z-20 flex items-center justify-center bg-[radial-gradient(120%_90%_at_20%_0%,rgba(155,107,255,0.3),transparent_60%),radial-gradient(100%_80%_at_100%_100%,rgba(255,179,71,0.22),transparent_60%),#0b0b10]">
            <Icon size={140} strokeWidth={0.8} className="text-white/12" />
          </div>
        )}
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(0,0,0,0.3)_0%,transparent_30%,rgba(0,0,0,0.6)_65%,rgba(0,0,0,0.92)_100%)]" />
        <div className="flex flex-col gap-3 p-5 sm:p-10">
          <div className="flex flex-wrap items-center gap-1.5">
            <CategoryChip slug={l.categorySlug} />
            <StateBadges l={l} now={now} />
          </div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/70">
            <Tx en={KIND_LABEL[l.kind]} />
          </p>
          <h1 className="max-w-[22ch] font-[family-name:var(--font-home-serif)] text-[clamp(34px,5.6vw,72px)] font-normal leading-[1.03] tracking-[-0.02em] [text-shadow:0_2px_30px_rgba(0,0,0,0.7)]">{l.title}</h1>
          <p className="text-base font-medium text-[#ffcf7a] sm:text-lg">
            <WhenText l={l} now={now} />
          </p>
          {(where.length > 0 || area) && (
            <p className="flex items-center gap-1.5 text-sm text-white/90 sm:text-base">
              <MapPin size={15} aria-hidden="true" className="shrink-0" />
              <span>
                {where.slice(0, 2).join(", ")}
                {where.length > 0 && area ? ", " : ""}
                {area && <Bi en={area.en} ja={area.ja} />}
              </span>
            </p>
          )}
        </div>
      </header>

      {l.status === "cancelled" && (
        <div role="status" className="rounded-2xl border border-[#ff7a7a]/50 bg-[#ff7a7a]/10 p-4 text-[#ffb0b0]">
          <p className="font-semibold">
            <Tx en="This has been cancelled by the organizer." />
          </p>
          {l.scheduleNote && <p className="mt-1 text-sm">{l.scheduleNote}</p>}
        </div>
      )}
      {l.postponed && l.status !== "cancelled" && (
        <div role="status" className="rounded-2xl border border-[#ffc26b]/50 bg-[#ffc26b]/10 p-4 text-[#ffd9a0]">
          <p className="font-semibold">
            <Tx en="This has been postponed." />
          </p>
          {l.scheduleNote && <p className="mt-1 text-sm">{l.scheduleNote}</p>}
        </div>
      )}
      {ended && l.status !== "cancelled" && (
        <p role="status" className="rounded-2xl border border-white/15 p-4 text-sm text-white/75">
          <Tx en="This has finished. It is kept here as a past listing." />
        </p>
      )}
      {children}

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="flex min-w-0 flex-col gap-8">
          {l.summary && <p className="max-w-[62ch] text-xl leading-relaxed text-foreground/90">{l.summary}</p>}
          {l.description && <p className="max-w-[68ch] whitespace-pre-line text-base leading-relaxed text-foreground/80">{l.description}</p>}

          {l.kind === "promotion" && (l.offerDetails || l.terms || l.businessName) && (
            <section aria-label="Offer" className="flex flex-col gap-4 rounded-2xl border border-white/10 p-5">
              <dl className="grid gap-4">
                {l.businessName && <Fact label="Business">{l.businessName}</Fact>}
                {l.offerDetails && <Fact label="The offer">{l.offerDetails}</Fact>}
                {l.terms && <Fact label="Terms and conditions">{l.terms}</Fact>}
              </dl>
            </section>
          )}

          {(l.ageRestriction || l.accessibility || l.instructions || l.registrationRequired) && (
            <section aria-label="Good to know" className="flex flex-col gap-4 rounded-2xl border border-white/10 p-5">
              <dl className="grid gap-4 sm:grid-cols-2">
                {l.registrationRequired && <Fact label="Registration">{<Tx en="Registration is required." />}</Fact>}
                {l.ageRestriction && <Fact label="Age">{l.ageRestriction}</Fact>}
                {l.accessibility && <Fact label="Accessibility">{l.accessibility}</Fact>}
                {l.instructions && <Fact label="Good to know">{l.instructions}</Fact>}
              </dl>
            </section>
          )}

          <ListingGallery photos={pics.slice(cover ? 1 : 0)} video={vid} />

          {related.length > 0 && (
            <section aria-labelledby="related-h" className="flex flex-col gap-3">
              <h2 id="related-h" className="font-[family-name:var(--font-home-serif)] text-3xl font-normal text-foreground">
                <Tx en="Related events" />
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {related.map((r) => (
                  <li key={r.id}>
                    <ListingCard l={r} now={now} variant="row" />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <section aria-label="When and where" className="flex flex-col gap-4 rounded-[26px] border border-white/10 p-5">
            <dl className="grid gap-4">
              {(l.startsAt || l.endsAt) && (
                <Fact label={timed ? "When" : "Dates"}>
                  <WhenText l={l} now={now} />
                  {l.status !== "cancelled" && l.status !== "expired" && upcomingStart ? <Countdown startMs={upcomingStart} /> : null}
                </Fact>
              )}
              {where.length > 0 && <Fact label="Where">{where.join("\n")}</Fact>}
              {(timed || l.kind === "promotion") && (
                <Fact label="Entry">
                  {timed ? <PriceText l={l} /> : <Tx en="See the offer" />}
                </Fact>
              )}
            </dl>
            {hasPlace && (
              <div className="flex flex-col gap-2">
                <iframe title="Map" src={osmEmbedUrl({ lat: l.lat!, lon: l.lon! })} loading="lazy" referrerPolicy="no-referrer" className="h-48 w-full rounded-2xl border border-white/10" />
                <div className="flex flex-wrap gap-2">
                  <a href={googleDirectionsUrl({ lat: l.lat!, lon: l.lon! })} target="_blank" rel="noopener noreferrer" className={plain}>
                    <Navigation size={14} aria-hidden="true" />
                    <Tx en="Directions" />
                  </a>
                  <a href={googleMapsUrl({ lat: l.lat!, lon: l.lon! })} target="_blank" rel="noopener noreferrer" className={plain}>
                    <MapPin size={14} aria-hidden="true" />
                    <Tx en="Open in Maps" />
                  </a>
                </div>
              </div>
            )}
            {(l.ticketUrl || l.registrationUrl) && l.status === "published" && (
              <div className="flex flex-col gap-2">
                {l.ticketUrl && (
                  <a href={l.ticketUrl} target="_blank" rel={external} className={button}>
                    <Ticket size={16} aria-hidden="true" />
                    <Tx en="Get tickets" />
                  </a>
                )}
                {l.registrationUrl && (
                  <a href={l.registrationUrl} target="_blank" rel={external} className={l.ticketUrl ? plain : button}>
                    <ClipboardCheck size={16} aria-hidden="true" />
                    <Tx en={l.kind === "promotion" ? "Book or visit" : "Register"} />
                  </a>
                )}
              </div>
            )}
          </section>

          <section aria-label="Organizer" className="flex flex-col gap-3 rounded-[26px] border border-white/10 p-5">
            <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-white/50">
              <Tx en="Published by" />
            </h2>
            <div className="flex items-center gap-3">
              <Avatar username={l.author.username} avatarUrl={l.author.avatarUrl} size={44} />
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-foreground">{l.organizerName || l.author.username}</p>
                {preview ? (
                  <p className="truncate text-xs text-white/55">@{l.author.username}</p>
                ) : (
                  <Link href={`/community/u/${l.author.username}`} className="inline-flex items-center gap-1 text-xs text-white/65 underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
                    <UserRound size={12} aria-hidden="true" />@{l.author.username}
                  </Link>
                )}
              </div>
            </div>
            {contact && (
              <p className="text-sm text-white/80">
                {isEmail ? (
                  <a href={`mailto:${contact}`} className="underline-offset-4 hover:underline">
                    {contact}
                  </a>
                ) : (
                  contact
                )}
              </p>
            )}
            {(l.websiteUrl || l.socialUrl) && (
              <div className="flex flex-wrap gap-2">
                {l.websiteUrl && (
                  <a href={l.websiteUrl} target="_blank" rel={external} className={plain}>
                    <Globe size={14} aria-hidden="true" />
                    <Tx en="Website" />
                  </a>
                )}
                {l.socialUrl && (
                  <a href={l.socialUrl} target="_blank" rel={external} className={plain}>
                    <ExternalLink size={14} aria-hidden="true" />
                    <Tx en="Social page" />
                  </a>
                )}
              </div>
            )}
          </section>

          {!preview && (
            <div className="flex flex-wrap items-center gap-2">
              <ShareLinkButton title={l.title} path={`/community/listing/${l.id}`} />
              {l.status !== "draft" && l.status !== "pending" && <ReportButton targetType="listing" targetId={l.id} />}
            </div>
          )}
        </aside>
      </div>
    </article>
  );
}
