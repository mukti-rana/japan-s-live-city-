import { playfair } from "@/components/home/cinematic/fonts";
import CommunityTabs, { type CommunitySection } from "@/components/community/CommunityTabs";
import Tx from "@/components/i18n/Tx";

// The opening of a What's Happening page: a small label, a large serif heading, one line of what this is, and the section tabs. Centred, like Discover.
export default function ListingsHeader({ section, title, intro }: { section: CommunitySection; title: string; intro: string }) {
  return (
    <div className={`${playfair.variable} flex flex-col items-center gap-6`}>
      <header className="flex flex-col items-center gap-3 pt-3 text-center sm:pt-8">
        <p className="text-xs font-medium uppercase tracking-[0.26em] text-foreground/60">
          <Tx en="Community" />
        </p>
        <h1 className="max-w-[20ch] font-[family-name:var(--font-home-serif)] text-[clamp(38px,6.4vw,76px)] font-normal leading-[1.02] tracking-[-0.025em] text-foreground">
          <Tx en={title} />
        </h1>
        <p className="max-w-[56ch] text-base leading-relaxed text-foreground/70 sm:text-lg">
          <Tx en={intro} />
        </p>
      </header>
      <CommunityTabs active={section} />
    </div>
  );
}
