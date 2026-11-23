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
// The three actions are a lead and two supporting players. "Share your experience" is the lead: larger, filled with the amber, pink and violet
// of the Community, with a slow drifting colour, a ring that breathes around it and a sheen that crosses it when it is pointed at. "Open Community"
// and "Need Help?" are smaller glass pills. In all three the icon sits in a disc that flips over to a second icon when the button is pointed at
// (or focused); see .cc-* in cinematic.css. Reduced motion: no drifting, breathing, sheen or flip.
const lead = `cc-btn cc-lead group relative inline-flex h-16 items-center gap-3.5 rounded-full py-0 pl-3 pr-8 text-[17px] font-semibold text-[#0b0712] ${ring}`;
const side = `cc-btn cc-side group relative inline-flex h-11 items-center gap-2.5 rounded-full border border-white/20 bg-black/30 py-0 pl-1.5 pr-5 text-sm font-medium text-white/90 backdrop-blur-sm ${ring}`;
// "Open Community" keeps its thin amber, pink and violet edge.
const open = `cc-btn group relative inline-flex h-11 items-center rounded-full bg-[linear-gradient(110deg,#f5a524,#ff5c93,#9b6bff)] p-px text-sm font-medium text-white ${ring}`;

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
          <Link href="/community" className={`${open} order-2 sm:order-1`}>
            <span className="flex h-full items-center gap-2.5 rounded-full bg-[#09090c] pl-5 pr-1.5 transition-colors group-hover:bg-[#13131a]">
              <Tx en="Open Community" />
              <Flip className="h-8 w-8" front={<span className="flex h-full w-full items-center justify-center rounded-full bg-white text-black"><ArrowRight size={15} /></span>} back={<span className="flex h-full w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#f5a524,#ff5c93)] text-black"><ArrowUpRight size={15} /></span>} />
            </span>
          </Link>
          <Link href="/community/new" className={`${lead} order-1 w-full justify-center sm:order-2 sm:w-auto`}>
            <span aria-hidden="true" className="cc-lead__ring" />
            <span aria-hidden="true" className="cc-lead__sheen"><span /></span>
            <Flip className="h-11 w-11" front={<span className="flex h-full w-full items-center justify-center rounded-full bg-[#0b0712] text-white"><Camera size={20} /></span>} back={<span className="flex h-full w-full items-center justify-center rounded-full bg-[#0b0712] text-[#ffb74d]"><Aperture size={22} /></span>} />
            <span className="relative"><Tx en="Share your experience" /></span>
          </Link>
          <Link href="/community/help" className={`${side} order-3`}>
            <Flip className="h-8 w-8" front={<span className="flex h-full w-full items-center justify-center rounded-full bg-white/10 text-white"><HelpCircle size={16} /></span>} back={<span className="flex h-full w-full items-center justify-center rounded-full bg-white text-black"><LifeBuoy size={16} /></span>} />
            <Tx en="Need Help?" />
          </Link>
        </ScrollReveal>
      </Chapter>
    </BackdropBand>
  );
}
