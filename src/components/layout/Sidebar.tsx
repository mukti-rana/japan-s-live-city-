"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import { CITIES } from "@/lib/data/cities";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translationKeys";
import Tx from "@/components/i18n/Tx";

const CITY_PATHS = CITIES.map((city) => `/${city.slug}`);
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
  // Desktop: the sidebar is hidden until it is needed. "hover" = peeked by moving to the left edge (closes when
  // the pointer leaves); "click" = opened with the menu button (stays until Escape, a click elsewhere or a page is chosen).
  const [peek, setPeek] = useState<null | "hover" | "click">(null);
  const asideRef = useRef<HTMLElement>(null);
  const timer = useRef(0);
  const pathname = usePathname();
  const { t } = useLanguage();
  const shown = peek !== null;

  const close = useCallback(() => {
    window.clearTimeout(timer.current);
    setPeek(null);
  }, []);

  // Closes when a page is chosen.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    close();
  }, [pathname, close]);

  // The top-bar menu button, Escape and a click elsewhere.
  useEffect(() => {
    const toggle = () => setPeek((p) => (p ? null : "click"));
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // If focus is inside the sidebar, hand it back to the menu button so a keyboard user is not lost.
      if (asideRef.current?.contains(document.activeElement)) document.querySelector<HTMLElement>("[aria-controls='site-sidebar']")?.focus();
      close();
    };
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (asideRef.current?.contains(target) || (target as HTMLElement).closest?.("[aria-controls='site-sidebar'], [data-menu-trigger]")) return;
      close();
    };
    window.addEventListener("livecity:toggle-menu", toggle);
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("livecity:toggle-menu", toggle);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [close]);

  // Opened with the menu button: move focus to its first link (the same for a keyboard or a mouse user, and
  // a mouse click shows no focus ring), so Tab goes through the menu rather than the page behind it.
  useEffect(() => {
    if (peek !== "click") return;
    const trigger = document.querySelector("[aria-controls='site-sidebar']");
    if (document.activeElement === trigger) asideRef.current?.querySelector<HTMLElement>("nav a")?.focus({ preventScroll: true });
  }, [peek]);

  // Tell the top-bar button whether the sidebar is showing.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("livecity:menu-state", { detail: shown }));
  }, [shown]);

  // Moving to the left edge peeks it; leaving closes it again (unless it was opened with the button).
  function peekIn() {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setPeek((p) => p ?? "hover"), 120);
  }
  function peekOut() {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setPeek((p) => (p === "hover" ? null : p)), 350);
  }

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

      {/* An invisible strip along the left edge: moving the mouse there brings the sidebar out. */}
      <div
        aria-hidden="true"
        onPointerEnter={(e) => e.pointerType === "mouse" && peekIn()}
        onPointerLeave={peekOut}
        className="fixed bottom-0 left-0 top-[var(--header-h,3.5rem)] z-40 hidden w-2.5 lg:block"
      />

      <aside
        ref={asideRef}
        id="site-sidebar"
        onPointerEnter={() => {
          window.clearTimeout(timer.current);
        }}
        onPointerLeave={peekOut}
        className={`fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col border-r border-glass-border bg-sidebar-bg transition-transform duration-300 motion-reduce:transition-none lg:top-[var(--header-h,3.5rem)] lg:z-50 lg:duration-200 lg:shadow-[0_0_60px_rgba(0,0,0,0.55)] lg:focus-within:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        } ${shown ? "lg:translate-x-0" : "lg:-translate-x-full lg:shadow-none"}`}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 rounded-lg p-1 text-muted hover:text-foreground lg:hidden"
          aria-label={t("nav.closeMenu")}
        >
          <X size={18} />
        </button>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-3 pt-6 lg:pt-3">
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
                aria-current={active ? "page" : undefined}
                className={`flex h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${
                  active ? "bg-foreground/10 text-foreground" : "text-muted hover:bg-foreground/[0.06] hover:text-foreground"
                }`}
              >
                <Icon size={20} strokeWidth={1.75} className={`shrink-0 ${danger && !active ? "text-red-400" : ""}`} aria-hidden="true" />
                <span className="truncate">{t(labelKey)}</span>
              </a>
            );
          })}
        </nav>

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
