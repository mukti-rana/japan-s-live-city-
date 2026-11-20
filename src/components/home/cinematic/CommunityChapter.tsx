import Link from "next/link";
import { ArrowRight, Camera, HelpCircle } from "lucide-react";
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
const primary = `inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-[15px] font-semibold text-black transition-colors hover:bg-white/90 ${ring}`;
const secondary = `inline-flex h-12 items-center gap-2 rounded-xl border border-white/25 bg-black/30 px-6 text-[15px] font-semibold text-white transition-colors hover:border-white/60 ${ring}`;
// "Open Community": a pill with a thin amber, pink and violet edge, and an arrow that slides forward when it is pointed at.
const open = `group relative inline-flex h-14 items-center gap-3 rounded-full bg-[linear-gradient(110deg,#f5a524,#ff5c93,#9b6bff)] p-px text-[15px] font-semibold text-white transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${ring}`;

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
        <ScrollReveal from="pop" delay={0.15} className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href="/community" className={open}>
            <span className="flex h-full items-center gap-3 rounded-full bg-[#09090c] pl-7 pr-3 transition-colors group-hover:bg-[#101016]">
              <Tx en="Open Community" />
              <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0">
                <ArrowRight size={16} />
              </span>
            </span>
          </Link>
          <Link href="/community/new" className={primary}>
            <Camera size={16} aria-hidden="true" />
            <Tx en="Share your experience" />
          </Link>
          <Link href="/community/help" className={secondary}>
            <HelpCircle size={16} aria-hidden="true" />
            <Tx en="Need Help?" />
          </Link>
        </ScrollReveal>
      </Chapter>
    </BackdropBand>
  );
}
