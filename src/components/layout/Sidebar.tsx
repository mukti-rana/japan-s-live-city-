"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type TouchEvent } from "react";
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
import Logo from "@/components/ui/Logo";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import ThemeToggle from "@/components/layout/ThemeToggle";

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

// One look for every item (links and the language / theme buttons): on the phone a row with a label, on desktop
// a floating icon that arrives with a stagger (--i) and shows its label as a tag on hover or focus.
function itemClass(active: boolean, shown: boolean) {
  return `drawer-item group/item flex h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure lg:relative lg:h-10 lg:w-10 lg:justify-center lg:rounded-full lg:bg-transparent lg:px-0 lg:transition-[opacity,transform,color] lg:duration-300 lg:ease-[cubic-bezier(0.22,1,0.36,1)] lg:hover:bg-transparent lg:hover:scale-110 lg:[filter:drop-shadow(0_0_2px_var(--background))_drop-shadow(0_0_7px_var(--background))_drop-shadow(0_0_14px_var(--background))] motion-reduce:lg:transition-none [@media(max-height:720px)]:lg:h-9 ${
  active ? "bg-foreground/10 text-foreground max-lg:bg-gradient-to-r max-lg:from-foreground/[0.14] max-lg:to-transparent max-lg:shadow-[inset_3px_0_0_0_#ff9a7a] lg:before:absolute lg:before:-left-2 lg:before:h-1 lg:before:w-1 lg:before:rounded-full lg:before:bg-foreground" : "text-muted hover:bg-foreground/[0.06] hover:text-foreground lg:text-foreground/90 lg:hover:text-foreground"
                } ${
                  shown
                    ? "lg:pointer-events-auto lg:translate-x-0 lg:scale-100 lg:opacity-100 lg:[transition-delay:calc(var(--i)*35ms)]"
                    : "lg:pointer-events-none lg:-translate-x-4 lg:scale-75 lg:opacity-0 lg:group-focus-within/rail:pointer-events-auto lg:group-focus-within/rail:translate-x-0 lg:group-focus-within/rail:scale-100 lg:group-focus-within/rail:opacity-100"
                }`;
}

const LABEL_CLASS =
  "truncate lg:pointer-events-none lg:absolute lg:left-full lg:ml-3 lg:-translate-x-1 lg:whitespace-nowrap lg:rounded-md lg:bg-background/90 lg:px-2.5 lg:py-1 lg:text-xs lg:font-medium lg:text-foreground lg:opacity-0 lg:shadow-lg lg:transition-[opacity,transform] lg:duration-150 lg:group-hover/item:translate-x-0 lg:group-hover/item:opacity-100 lg:group-focus-visible/item:translate-x-0 lg:group-focus-visible/item:opacity-100";

const DESKTOP = "(min-width: 1024px)";
function useDesktop() {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(DESKTOP);
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia(DESKTOP).matches,
    () => true,
  );
}

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const desktop = useDesktop();
  const touchX = useRef<number | null>(null);
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

  // The phone drawer: closes when a page is chosen, on Escape, and the page behind it does not scroll while it is open.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        document.querySelector<HTMLElement>("[data-drawer-open]")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    asideRef.current?.querySelector<HTMLElement>("nav a")?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

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
        data-drawer-open
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="site-sidebar"
        className={`fixed bottom-5 left-5 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-foreground/15 bg-panel/90 text-foreground shadow-[0_10px_30px_-8px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-[opacity,transform] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure active:scale-90 lg:hidden ${open ? "pointer-events-none scale-75 opacity-0" : ""}`}
        aria-label={t("nav.openMenu")}
      >
        <Menu size={20} />
      </button>

      <button
        type="button"
        tabIndex={-1}
        onClick={() => setOpen(false)}
        aria-label={t("nav.closeMenu")}
        className={`fixed inset-0 z-40 bg-black/65 backdrop-blur-sm transition-opacity duration-300 motion-reduce:transition-none lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />

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
        data-open={open ? "true" : "false"}
        inert={!desktop && !open}
        onTouchStart={(e: TouchEvent) => {
          touchX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e: TouchEvent) => {
          if (touchX.current !== null && e.changedTouches[0].clientX - touchX.current < -60) setOpen(false);
          touchX.current = null;
        }}
        onPointerEnter={() => {
          window.clearTimeout(timer.current);
        }}
        onPointerLeave={peekOut}
        className={`group/rail fixed inset-y-0 left-0 z-50 flex w-[min(20rem,86vw)] shrink-0 flex-col overflow-hidden border-r border-glass-border bg-sidebar-bg pt-[env(safe-area-inset-top)] shadow-[24px_0_60px_-20px_rgba(0,0,0,0.7)] transition-transform duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none max-lg:rounded-r-[1.75rem] lg:pointer-events-none lg:bottom-auto lg:left-3 lg:top-[calc(var(--header-h,3.5rem)+0.75rem)] lg:w-12 lg:translate-x-0 lg:overflow-visible lg:border-0 lg:bg-transparent lg:pt-0 lg:shadow-none lg:transition-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="drawer-item flex items-center justify-between gap-3 px-4 pb-1 pt-4 lg:hidden" style={{ "--i": 0 } as CSSProperties}>
          <span className="flex min-w-0 items-center gap-2.5">
            <Logo size={30} />
            <span className="truncate text-[11px] font-bold tracking-[0.24em] text-foreground">LIVE CITY JAPAN</span>
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-foreground/12 text-muted transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
            aria-label={t("nav.closeMenu")}
          >
            <X size={17} />
          </button>
        </div>

        {/* Desktop: no panel at all, only the icons. They float over the page, arriving one after another, with a soft
            halo in the page's own colour so they read on a photograph and on a plain page alike. */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-3 pt-3 lg:flex-none lg:gap-1.5 lg:overflow-visible lg:px-0 lg:pt-0 [@media(max-height:720px)]:lg:gap-0">
          {NAV_ITEMS.map(({ labelKey, href, icon: Icon, danger }, index) => {
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
                style={{ "--i": index } as CSSProperties}
                className={itemClass(active, shown)}
              >
                <Icon size={22} strokeWidth={1.75} className={`shrink-0 ${danger && !active ? "text-red-400" : ""}`} aria-hidden="true" />
                <span className={LABEL_CLASS}>
                  {t(labelKey)}
                </span>
              </a>
            );
          })}

          {/* Language and the light / dark theme live here (not in the top bar): two more icons at the end of the column. */}
          <div className="mt-2 flex flex-col gap-1 border-t border-glass-border pt-2 lg:mt-1 lg:gap-1.5 lg:border-0 lg:pt-0 [@media(max-height:720px)]:lg:mt-0 [@media(max-height:720px)]:lg:gap-0">
            <div style={{ "--i": NAV_ITEMS.length } as CSSProperties}>
              <LanguageSwitcher
                variant="sidebar"
                triggerClassName={`${itemClass(false, shown)} w-full`}
                triggerLabel={<span className={LABEL_CLASS}>{t("languageSwitcher.label")}</span>}
              />
            </div>
            <div style={{ "--i": NAV_ITEMS.length + 1 } as CSSProperties}>
              <ThemeToggle className={`${itemClass(false, shown)} w-full [&>svg]:h-[22px] [&>svg]:w-[22px] [&>svg]:shrink-0`} labelClassName={LABEL_CLASS} />
            </div>
          </div>
        </nav>

        {/* A small card at the foot of the phone menu: the words on the left, the pagoda on the right, never over each other. */}
        <div className="drawer-item mx-3 mb-4 mt-2 shrink-0 overflow-hidden keep-dark-ink rounded-2xl border border-white/10 lg:hidden [@media(max-height:880px)]:hidden" style={{ "--i": NAV_ITEMS.length + 2 } as CSSProperties}>
          <div className="relative flex items-center gap-3 bg-gradient-to-br from-[#3a1d44] via-[#1a1330] to-[#0d0a1c] px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug" style={{ color: "#fff" }}>
                <Tx en="Live the" /> <Tx en="real Japan" />
              </p>
              <p className="mt-0.5 text-[11px]" style={{ color: "rgba(255,255,255,0.65)" }}>
                <Tx en="Real-time data" />
              </p>
            </div>
            <svg viewBox="0 0 80 92" className="h-14 w-12 shrink-0" aria-hidden="true">
              <g fill="none" stroke="#FF6B9D" strokeWidth="1.4" strokeLinejoin="round" opacity="0.9">
                <path d="M40 4 V14" />
                <path d="M22 26 H58 L52 16 H28 Z" />
                <path d="M28 26 V38 H52 V26" />
                <path d="M16 46 H64 L56 36 H24 Z" />
                <path d="M24 46 V60 H56 V46" />
                <path d="M10 70 H70 L60 58 H20 Z" />
                <path d="M18 70 V88 H62 V70" />
              </g>
            </svg>
          </div>
        </div>
      </aside>
    </>
  );
}
