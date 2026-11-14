import Link from "next/link";
import { Camera, Flame, HelpCircle, LayoutGrid, MapPin, Star, UserRound } from "lucide-react";
import Tx from "@/components/i18n/Tx";

export type CommunitySection = "discover" | "trending" | "photos" | "reviews" | "places" | "questions" | "me";

const TABS: { id: CommunitySection; href: string; en: string; Icon: typeof Camera }[] = [
  { id: "discover", href: "/community", en: "Discover", Icon: LayoutGrid },
  { id: "trending", href: "/community/trending", en: "Trending", Icon: Flame },
  { id: "photos", href: "/community/photos", en: "Photos", Icon: Camera },
  { id: "reviews", href: "/community/reviews", en: "Reviews", Icon: Star },
  { id: "places", href: "/community/places", en: "Places", Icon: MapPin },
  { id: "questions", href: "/community/questions", en: "Questions & Answers", Icon: HelpCircle },
  { id: "me", href: "/community/me", en: "My Contributions", Icon: UserRound },
];

// The Community sections. On a phone the row scrolls sideways (never wraps or
// overflows the page); the current section is filled and marked for screen
// readers with aria-current.
export default function CommunityTabs({ active }: { active: CommunitySection }) {
  return (
    <nav aria-label="Community" className="-mx-3 overflow-x-auto border-b border-white/8 px-3 pb-3 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <ul className="flex w-max gap-1 sm:w-auto sm:flex-wrap">
        {TABS.map(({ id, href, en, Icon }) => {
          const on = active === id;
          return (
            <li key={id} className="shrink-0">
              <Link
                href={href}
                aria-current={on ? "page" : undefined}
                className={`inline-flex h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${
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
