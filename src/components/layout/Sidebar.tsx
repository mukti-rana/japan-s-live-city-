"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Home,
  Map,
  Compass,
  Users,
  TrainFront,
  CloudSun,
  Newspaper,
  CalendarDays,
  CalendarClock,
  Flame,
  MapPin,
  Settings,
  ShieldAlert,
  Menu,
  X,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { CITIES } from "@/lib/data/cities";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translationKeys";
import Tx from "@/components/i18n/Tx";

const CITY_PATHS = CITIES.map((city) => `/${city.slug}`);
// Whether the visitor has pinned the sidebar open (it is otherwise a slim icon rail that opens on hover).
const SIDEBAR_PINNED_KEY = "livecity:sidebarPinned";

const NAV_ITEMS: { labelKey: TranslationKey; href: string; icon: typeof Home; danger?: boolean }[] = [
  { labelKey: "nav.home", href: "/", icon: Home },
  { labelKey: "nav.map", href: "/map", icon: Map },
  { labelKey: "nav.explore", href: "/explore", icon: Compass },
  { labelKey: "nav.community", href: "/community", icon: Users },
  { labelKey: "nav.trains", href: "/trains", icon: TrainFront },
  { labelKey: "nav.weather", href: "/weather", icon: CloudSun },
  { labelKey: "nav.news", href: "/news", icon: Newspaper },
  { labelKey: "nav.events", href: "/events", icon: CalendarDays },
  { labelKey: "nav.calendar", href: "/calendar", icon: CalendarClock },
  { labelKey: "nav.emergency", href: "/emergency", icon: ShieldAlert, danger: true },
  { labelKey: "nav.trending", href: "/trending", icon: Flame },
  { labelKey: "nav.cities", href: "/cities", icon: MapPin },
  { labelKey: "nav.settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const pathname = usePathname();
  const { t } = useLanguage();
  // On the home page the rail floats over the full-screen photograph and never pushes the page; on every
  // other page it reserves its own slim column. The phone menu button and drawer are the same everywhere.
  const isHome = pathname === "/";
  // Pinned open (wide, pushes the page) only off the home page.
  const wide = pinned && !isHome;

  // SSR-safe default (rail) corrected from localStorage post-mount.
  useEffect(() => {
    try {
      if (window.localStorage.getItem(SIDEBAR_PINNED_KEY) === "true") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPinned(true);
      }
    } catch {
      // localStorage unavailable — keep default.
    }
  }, []);

  function togglePinned() {
    setPinned((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_PINNED_KEY, String(next));
      } catch {
        // Ignore write failures — the in-memory state still updates.
      }
      return next;
    });
  }

  // Labels: always on the phone drawer; on desktop only while the rail is open (hover, keyboard focus or pinned).
  const label = wide ? "" : "lg:hidden lg:group-hover/rail:inline lg:group-focus-within/rail:inline";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-5 z-40 rounded-full border border-glass-border bg-panel p-3 shadow-lg backdrop-blur-xl lg:hidden"
        aria-label={t("nav.openMenu")}
      >
        <Menu size={18} />
      </button>

      {open && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={t("nav.closeMenu")}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Reserves the rail's column on every page but the home page, where the rail floats over the photograph. */}
      {!isHome && <div aria-hidden="true" className={`hidden shrink-0 transition-[width] duration-200 motion-reduce:transition-none lg:block ${wide ? "w-60" : "w-14"}`} />}

      <aside
        data-pinned={wide}
        className={`group/rail fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col border-r border-glass-border bg-sidebar-bg transition-transform duration-300 motion-reduce:transition-none lg:top-[var(--header-h,3.5rem)] lg:z-40 lg:translate-x-0 lg:transition-[width,background-color] lg:duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        } ${wide ? "lg:w-60" : "lg:w-14 lg:hover:w-60 lg:focus-within:w-60"} ${isHome ? "lg:border-transparent lg:bg-black/55 lg:backdrop-blur-sm lg:hover:border-glass-border lg:hover:bg-black/90 lg:focus-within:bg-black/90" : ""}`}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 rounded-lg p-1 text-muted hover:text-foreground lg:hidden"
          aria-label={t("nav.closeMenu")}
        >
          <X size={18} />
        </button>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-3 pt-6 lg:px-1.5 lg:pt-3">
          {NAV_ITEMS.map(({ labelKey, href, icon: Icon, danger }) => {
            const active =
              href === "/"
                ? pathname === "/"
                : pathname.startsWith(href) ||
                  (labelKey === "nav.cities" && CITY_PATHS.includes(pathname));
            return (
              <a
                key={labelKey}
                href={href}
                aria-label={t(labelKey)}
                aria-current={active ? "page" : undefined}
                title={wide ? undefined : t(labelKey)}
                className={`flex h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${
                  active ? "bg-foreground/10 text-foreground" : "text-muted hover:bg-foreground/[0.06] hover:text-foreground"
                }`}
              >
                <Icon size={20} strokeWidth={1.75} className={`shrink-0 ${danger && !active ? "text-red-400" : ""}`} aria-hidden="true" />
                <span className={`truncate ${label}`}>{t(labelKey)}</span>
              </a>
            );
          })}
        </nav>

        {!isHome && (
          <button
            type="button"
            onClick={togglePinned}
            aria-label={t(wide ? "sidebar.collapse" : "sidebar.expand")}
            aria-pressed={wide}
            title={t(wide ? "sidebar.collapse" : "sidebar.expand")}
            className="mx-1.5 mb-2 hidden h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-xs font-medium text-muted transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure lg:flex"
          >
            {wide ? <ChevronsLeft size={20} strokeWidth={1.75} className="shrink-0" aria-hidden="true" /> : <ChevronsRight size={20} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />}
            <span className={`truncate ${label}`}>{t(wide ? "sidebar.collapse" : "sidebar.expand")}</span>
          </button>
        )}

        <div className="relative h-44 overflow-hidden lg:hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-sakura/25 via-[#1a1330] to-transparent" />
          <svg
            viewBox="0 0 240 180"
            className="absolute bottom-0 h-full w-full"
            preserveAspectRatio="xMidYMax slice"
            aria-hidden="true"
          >
            <path d="M0 180 L60 120 L120 150 L180 100 L240 140 L240 180 Z" fill="#0d0a1c" opacity="0.9" />
            <g fill="#150f2a" stroke="#FF6B9D" strokeWidth="0.6" opacity="0.85">
              <path d="M96 176 v-38 h34 v38 z" />
              <path d="M88 138 h50 l-8 -10 h-34 z" />
              <path d="M100 128 v-22 h26 v22 z" />
              <path d="M92 106 h42 l-8 -10 h-26 z" />
              <path d="M106 96 v-16 h14 v16 z" />
              <path d="M99 80 h28 l-7 -9 h-14 z" />
              <path d="M112 71 v-12" />
            </g>
            <circle cx="40" cy="44" r="14" fill="#FF6B9D" opacity="0.25" />
          </svg>
          <div className="absolute bottom-5 left-4 right-4">
            <p className="text-sm font-semibold leading-snug text-foreground/90">
              <Tx en="Live the" />
              <br />
              <Tx en="real Japan" />
            </p>
            <span className="mt-1 inline-block text-xs text-sakura">🌸</span>
          </div>
        </div>
      </aside>
    </>
  );
}
