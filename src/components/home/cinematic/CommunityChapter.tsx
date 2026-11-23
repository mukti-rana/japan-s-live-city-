import Link from "next/link";
import type { ReactNode } from "react";
import { Aperture, ArrowRight, ArrowUpRight, Camera, HelpCircle, LifeBuoy } from "lucide-react";
import BackdropBand from "@/components/home/cinematic/BackdropBand";
import Chapter from "@/components/home/cinematic/Chapter";
import ScrollReveal from "@/components/home/cinematic/ScrollReveal";
import CommunityShowcase from "@/components/community/CommunityShowcase";
import Unavailable from "@/components/community/Unavailable";
import Tx from "@/components/i18n/Tx";
import { feedFiltersFromParams } from "@/lib/community/feed";
import { fetchFeed, feedKey } from "@/lib/community/queries";
import { HOME_PHOTOS } from "@/lib/data/homePhotos";

const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure focus-visible:ring-offset-2 focus-visible:ring-offset-black";
// The three actions are a lead and two supporting players, all borderless and unfilled: only an icon disc and a label. "Share your experience" leads
// by being a little larger, with a white disc; the other two are smaller with a soft disc. Pointing at (or focusing) any of them lays a faint
// glass wash behind it and flips its icon disc over to a second icon (see .cc-* in cinematic.css). Reduced motion: no lift and no flip.
const lead = `cc-btn cc-lead group relative inline-flex h-12 items-center gap-3 rounded-full py-0 pl-1.5 pr-5 text-base font-semibold text-white ${ring}`;
const side = `cc-btn cc-side group relative inline-flex h-10 items-center gap-2 rounded-full py-0 pl-1 pr-4 text-sm font-medium text-white/85 ${ring}`;

// A disc with two faces: the first shows, the second is behind it and turns to the front when the button is pointed at.
function Flip({ front, back, className }: { front: ReactNode; back: ReactNode; className: string }) {
  return (
    <span aria-hidden="true" className={`cc-flip shrink-0 ${className}`}>
      <span className="cc-flip__in">
        <span className="cc-flip__f">{front}</span>
        <span className="cc-flip__f cc-flip__b">{back}</span>
      </span>
    </span>
  );
}

// The six latest real Community posts, read the same way the Community page reads them
// (public, published posts only). With no posts it says so honestly; if the community
// can't be reached it shows the same message and Retry button as the Community page.
// Nothing here is ever made up.
export default async function CommunityChapter() {
  const result = await fetchFeed(feedKey(feedFiltersFromParams({})));
  const posts = result.state === "ready" ? result.posts.slice(0, 5) : [];

  return (
    <BackdropBand photo={HOME_PHOTOS.kiyomizu}>
      <Chapter id="community" number="07" label="Community" heading="Japan, through people's eyes" intro="Real photos and stories from people across Japan.">
        {result.state === "unavailable" ? (
          <Unavailable reason={result.reason} headingLevel={3} />
        ) : posts.length > 0 ? (
          <ScrollReveal from="stagger">
            <CommunityShowcase posts={posts} />
          </ScrollReveal>
        ) : (
          <ScrollReveal>
            <div className="mx-auto max-w-3xl border-y border-white/10 px-6 py-[clamp(40px,8vh,96px)] text-center">
              <h3 className="font-[family-name:var(--font-home-serif)] text-[clamp(26px,3.4vw,38px)] font-normal leading-tight text-white">
                <Tx en="Be the first to share an experience from Japan." />
              </h3>
              <p className="mx-auto mt-3 max-w-[48ch] text-base text-text-secondary">
                <Tx en="When people post, the latest ones appear here." />
              </p>
            </div>
          </ScrollReveal>
        )}
        <ScrollReveal from="pop" delay={0.15} className="mt-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-5">
          <Link href="/community" className={`${side} order-2 sm:order-1`}>
            <Flip className="h-8 w-8" front={<span className="flex h-full w-full items-center justify-center rounded-full bg-white/10 text-white"><ArrowRight size={15} /></span>} back={<span className="flex h-full w-full items-center justify-center rounded-full bg-white text-black"><ArrowUpRight size={15} /></span>} />
            <Tx en="Open Community" />
          </Link>
          <Link href="/community/new" className={`${lead} order-1 sm:order-2`}>
            <Flip className="h-9 w-9" front={<span className="flex h-full w-full items-center justify-center rounded-full bg-white text-black"><Camera size={17} /></span>} back={<span className="flex h-full w-full items-center justify-center rounded-full bg-white text-black"><Aperture size={19} /></span>} />
            <Tx en="Share your experience" />
          </Link>
          <Link href="/community/help" className={`${side} order-3`}>
            <Flip className="h-8 w-8" front={<span className="flex h-full w-full items-center justify-center rounded-full bg-white/10 text-white"><HelpCircle size={15} /></span>} back={<span className="flex h-full w-full items-center justify-center rounded-full bg-white text-black"><LifeBuoy size={15} /></span>} />
            <Tx en="Need Help?" />
          </Link>
        </ScrollReveal>
      </Chapter>
    </BackdropBand>
  );
}
