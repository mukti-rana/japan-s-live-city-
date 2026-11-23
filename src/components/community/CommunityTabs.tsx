"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { CalendarDays, HelpCircle, LayoutGrid, Megaphone, Sparkles, UserRound } from "lucide-react";
import { useReducedMotion } from "motion/react";
import Tx from "@/components/i18n/Tx";

// The tab bar is set like a dock: no box, no border, no fill, only the icons and names on the page itself. Pointing along it, each section swells
// and rises as the pointer nears it and its neighbours follow more gently (the pointer's distance from each, worked out here and written as --m, 0 to
// 1; the CSS does the rest), its colour brightens and its icon takes a little amber; the current section is marked by a short coloured line under it
// that slides to the section you came from. With a touch screen, or reduced motion, there is no swelling.

// Every Community page names the section it belongs to. Trending and Places are reached from Discover, so they light up "Discover";
// the Need Help page lights up "Questions".
export type CommunitySection = "discover" | "trending" | "photos" | "reviews" | "places" | "questions" | "help" | "me" | "happening" | "events" | "announcements";

type TabId = "discover" | "happening" | "events" | "announcements" | "questions" | "me";

const TABS: { id: TabId; href: string; en: string; Icon: typeof HelpCircle }[] = [
  { id: "discover", href: "/community", en: "Discover", Icon: LayoutGrid },
  { id: "happening", href: "/community/happening", en: "What's Happening", Icon: Sparkles },
  { id: "events", href: "/community/events", en: "Events", Icon: CalendarDays },
  { id: "announcements", href: "/community/announcements", en: "Announcements", Icon: Megaphone },
  { id: "questions", href: "/community/questions", en: "Questions & Answers", Icon: HelpCircle },
  { id: "me", href: "/community/me", en: "My Contributions", Icon: UserRound },
];

// Photos and Reviews are reached from Discover (and the pages' own links), so they light up "Discover".
const TAB_OF: Record<CommunitySection, TabId> = { discover: "discover", trending: "discover", photos: "discover", reviews: "discover", places: "discover", questions: "questions", help: "questions", me: "me", happening: "happening", events: "events", announcements: "announcements" };

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

  // Swell the sections under and near the pointer (a mouse or pen, never touch).
  const swell = (e: ReactPointerEvent<HTMLUListElement>) => {
    if (e.pointerType === "touch" || reduced) return;
    for (const id of Object.keys(tabs.current) as TabId[]) {
      const item = tabs.current[id]?.parentElement;
      if (!item) continue;
      const r = item.getBoundingClientRect();
      const d = Math.abs(e.clientX - (r.left + r.width / 2)) / 150;
      item.style.setProperty("--m", Math.max(0, 1 - d).toFixed(3));
    }
  };
  const settle = () => {
    for (const id of Object.keys(tabs.current) as TabId[]) tabs.current[id]?.parentElement?.style.setProperty("--m", "0");
  };

  return (
    <nav aria-label="Community" className="w-full max-w-full overflow-x-auto px-1 pb-2 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <ul ref={list} onPointerMove={swell} onPointerLeave={settle} className="group/nav relative mx-auto flex w-max items-end gap-1 p-1">
        <li aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 top-1 list-none">
          <span ref={pill} className="absolute inset-y-0 left-0 block w-0 opacity-0">
            {/* The current section's mark: a short line of colour under it, with a soft glow. */}
            <span className="absolute inset-x-[22%] bottom-0 h-[2px] rounded-full bg-[linear-gradient(90deg,#f5a524,#ff5c93,#9b6bff)] shadow-[0_0_12px_1px_rgba(255,92,147,0.55)]" />
          </span>
        </li>
        {TABS.map(({ id, href, en, Icon }) => {
          const on = current === id;
          return (
            <li key={id} className="cm-dock relative shrink-0">
              <Link
                ref={(el) => {
                  tabs.current[id] = el;
                }}
                href={href}
                aria-current={on ? "page" : undefined}
                className={`cm-dock__link relative inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:px-4 sm:text-sm ${on ? "text-white" : "text-foreground/65"}`}
              >
                <Icon size={15} aria-hidden="true" className={`cm-dock__icon ${on ? "text-[#ffb74d]" : ""}`} />
                <Tx en={en} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
