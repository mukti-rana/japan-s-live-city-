import Link from "next/link";
import { Camera, HelpCircle, LayoutGrid, Star, UserRound } from "lucide-react";
import Tx from "@/components/i18n/Tx";

export type CommunitySection = "discover" | "photos" | "reviews" | "questions" | "me";

const TABS: { id: CommunitySection; href: string; en: string; Icon: typeof Camera }[] = [
  { id: "discover", href: "/community", en: "Discover", Icon: LayoutGrid },
  { id: "photos", href: "/community/photos", en: "Photos", Icon: Camera },
  { id: "reviews", href: "/community/reviews", en: "Reviews", Icon: Star },
  { id: "questions", href: "/community/questions", en: "Questions & Answers", Icon: HelpCircle },
  { id: "me", href: "/community/me", en: "My Contributions", Icon: UserRound },
];

// The Community sections. On a phone the row scrolls sideways (never wraps or
// overflows the page); the current section is filled and marked for screen
// readers with aria-current.
export default function CommunityTabs({ active }: { active: CommunitySection }) {
  return (
    <nav aria-label="Community" className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
        {TABS.map(({ id, href, en, Icon }) => {
          const on = active === id;
          return (
            <li key={id} className="shrink-0">
              <Link
                href={href}
                aria-current={on ? "page" : undefined}
                className={`inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${
                  on ? "border-lilac/60 bg-lilac/20 text-lilac shadow-[0_0_18px_-4px_rgba(196,181,253,0.55)]" : "border-glass-border bg-glass-bg text-foreground/85 hover:-translate-y-px hover:border-white/30 hover:text-foreground"
                }`}
              >
                <Icon size={15} aria-hidden="true" />
                <Tx en={en} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
