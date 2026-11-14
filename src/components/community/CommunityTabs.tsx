import Link from "next/link";
import { HelpCircle, LayoutGrid, UserRound } from "lucide-react";
import Tx from "@/components/i18n/Tx";

// Every Community page names the section it belongs to. The older sections
// (trending, photos, reviews, places) are reached from Discover, search and
// filters, so they all light up "Discover"; questions light up "Need Help".
export type CommunitySection = "discover" | "trending" | "photos" | "reviews" | "places" | "questions" | "help" | "me";

type TabId = "discover" | "help" | "me";

const TABS: { id: TabId; href: string; en: string; Icon: typeof HelpCircle }[] = [
  { id: "discover", href: "/community", en: "Discover", Icon: LayoutGrid },
  { id: "help", href: "/community/help", en: "Need Help", Icon: HelpCircle },
  { id: "me", href: "/community/me", en: "My Contributions", Icon: UserRound },
];

const TAB_OF: Record<CommunitySection, TabId> = { discover: "discover", trending: "discover", photos: "discover", reviews: "discover", places: "discover", questions: "help", help: "help", me: "me" };

// Three destinations, nothing else. The current one is filled and marked for
// screen readers with aria-current.
export default function CommunityTabs({ active }: { active: CommunitySection }) {
  const current = TAB_OF[active];
  return (
    <nav aria-label="Community" className="-mx-3 overflow-x-auto border-b border-white/8 px-3 pb-3 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <ul className="flex w-max gap-0.5 sm:gap-1">
        {TABS.map(({ id, href, en, Icon }) => {
          const on = current === id;
          return (
            <li key={id} className="shrink-0">
              <Link
                href={href}
                aria-current={on ? "page" : undefined}
                className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-2 text-[13px] sm:gap-2 sm:px-3.5 sm:text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${
                  on ? "border-white/25 bg-white/10 text-white" : "border-transparent text-foreground/70 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <Icon size={15} aria-hidden="true" className={on ? "text-azure" : ""} />
                <Tx en={en} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
