"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { HelpCircle, Images, LayoutGrid, Star, UserRound } from "lucide-react";
import { useReducedMotion } from "motion/react";
import Tx from "@/components/i18n/Tx";

// Every Community page names the section it belongs to. Trending and Places are reached from Discover, so they light up "Discover";
// the Need Help page lights up "Questions".
export type CommunitySection = "discover" | "trending" | "photos" | "reviews" | "places" | "questions" | "help" | "me";

type TabId = "discover" | "photos" | "reviews" | "questions" | "me";

const TABS: { id: TabId; href: string; en: string; Icon: typeof HelpCircle }[] = [
  { id: "discover", href: "/community", en: "Discover", Icon: LayoutGrid },
  { id: "photos", href: "/community/photos", en: "Photos", Icon: Images },
  { id: "reviews", href: "/community/reviews", en: "Reviews", Icon: Star },
  { id: "questions", href: "/community/questions", en: "Questions", Icon: HelpCircle },
  { id: "me", href: "/community/me", en: "My Contributions", Icon: UserRound },
];

const TAB_OF: Record<CommunitySection, TabId> = { discover: "discover", trending: "discover", photos: "photos", reviews: "reviews", places: "discover", questions: "questions", help: "questions", me: "me" };

const KEY = "lc:cm-tab";

// The Community's sections. The current one is marked for screen readers with aria-current, and a lit pill under it slides to it from the section
// you came from (the last one is remembered for the length of the visit, so the slide carries across pages). Under reduced motion the pill is simply
// there. On a narrow screen the row scrolls sideways, with the current section brought into view.
export default function CommunityTabs({ active }: { active: CommunitySection }) {
  const current = TAB_OF[active];
  const reduced = useReducedMotion();
  const list = useRef<HTMLUListElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const tabs = useRef<Partial<Record<TabId, HTMLAnchorElement | null>>>({});

  useLayoutEffect(() => {
    // The tab's list item is what sits in the row (its offset is measured from the row itself).
    const where = (id: TabId | null) => {
      const item = id ? tabs.current[id]?.parentElement : null;
      return item ? { x: item.offsetLeft, w: item.offsetWidth } : null;
    };
    const put = (p: { x: number; w: number }, slide: boolean) => {
      const el = pill.current;
      if (!el) return;
      el.style.transition = slide && !reduced ? "transform 520ms cubic-bezier(0.22,1,0.36,1), width 520ms cubic-bezier(0.22,1,0.36,1)" : "none";
      el.style.width = `${p.w}px`;
      el.style.transform = `translate3d(${p.x}px,0,0)`;
      el.style.opacity = "1";
    };
    const to = where(current);
    if (!to) return;
    let prev: TabId | null = null;
    try {
      prev = sessionStorage.getItem(KEY) as TabId | null;
      sessionStorage.setItem(KEY, current);
    } catch {
      /* private mode: no slide, no harm */
    }
    const from = !reduced && prev && prev !== current ? where(prev) : null;
    let raf = 0;
    if (from) {
      // Start under the section you came from, then slide.
      put(from, false);
      raf = requestAnimationFrame(() => (raf = requestAnimationFrame(() => put(to, true))));
    } else {
      put(to, false);
    }
    list.current?.setAttribute("data-ready", "true");
    tabs.current[current]?.scrollIntoView({ inline: "center", block: "nearest" });
    const onResize = () => {
      const now = where(current);
      if (now) put(now, false);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [current, reduced]);

  return (
    <nav aria-label="Community" className="w-full max-w-full overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <ul ref={list} className="group/nav relative mx-auto flex w-max items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1 backdrop-blur-md">
        <li aria-hidden="true" className="pointer-events-none absolute bottom-1 left-0 top-1 list-none">
          <span ref={pill} className="absolute inset-y-0 left-0 block w-0 rounded-full border border-white/20 bg-white/[0.11] opacity-0 shadow-[0_8px_24px_-12px_rgba(155,107,255,0.9)]">
            {/* A thin ribbon of colour along the foot of the pill. */}
            <span className="absolute inset-x-5 bottom-0 h-px bg-[linear-gradient(90deg,transparent,#f5a524,#ff5c93,#9b6bff,transparent)]" />
          </span>
        </li>
        {TABS.map(({ id, href, en, Icon }) => {
          const on = current === id;
          return (
            <li key={id} className="relative shrink-0">
              <Link
                ref={(el) => {
                  tabs.current[id] = el;
                }}
                href={href}
                aria-current={on ? "page" : undefined}
                className={`relative inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-[13px] font-medium transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure sm:px-4 sm:text-sm ${on ? "bg-white/[0.11] text-white group-data-[ready=true]/nav:bg-transparent" : "text-foreground/65 hover:text-white"}`}
              >
                <Icon size={15} aria-hidden="true" className={`transition-colors duration-300 ${on ? "text-[#ffb74d]" : ""}`} />
                <Tx en={en} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
