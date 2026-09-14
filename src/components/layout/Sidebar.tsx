"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  Home,
  Map,
  TrainFront,
  CloudSun,
  Newspaper,
  CalendarDays,
  Flame,
  MapPin,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { CITIES } from "@/lib/data/cities";

const CITY_PATHS = CITIES.map((city) => `/${city.slug}`);

const NAV_ITEMS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Japan Map", href: "/map", icon: Map },
  { label: "Trains", href: "/trains", icon: TrainFront },
  { label: "Weather", href: "/weather", icon: CloudSun },
  { label: "News", href: "/news", icon: Newspaper },
  { label: "Events", href: "/events", icon: CalendarDays },
  { label: "Trending", href: "/trending", icon: Flame },
  { label: "Cities", href: "/cities", icon: MapPin },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-5 z-40 rounded-full border border-glass-border bg-panel p-3 shadow-lg backdrop-blur-xl lg:hidden"
        aria-label="Open navigation"
      >
        <Menu size={18} />
      </button>

      {open && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col border-r border-glass-border bg-sidebar-bg transition-transform duration-300 lg:sticky lg:top-16 lg:z-0 lg:h-[calc(100vh-4rem)] lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 rounded-lg p-1 text-muted hover:text-foreground lg:hidden"
          aria-label="Close navigation"
        >
          <X size={18} />
        </button>

        <nav className="flex flex-1 flex-col gap-1 px-3 pt-6 lg:pt-4">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active =
              href === "/"
                ? pathname === "/"
                : pathname.startsWith(href) ||
                  (label === "Cities" && CITY_PATHS.includes(pathname));
            return (
              <a
                key={label}
                href={href}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-azure/10 text-foreground"
                    : "text-muted hover:bg-glass-bg hover:text-foreground"
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                    active
                      ? "bg-sakura/20 text-sakura"
                      : "text-muted group-hover:text-azure"
                  }`}
                >
                  <Icon size={16} />
                </span>
                {label}
              </a>
            );
          })}
        </nav>

        <div className="relative h-44 overflow-hidden">
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
              Live the
              <br />
              real Japan
            </p>
            <span className="mt-1 inline-block text-xs text-sakura">🌸</span>
          </div>
        </div>
      </aside>
    </>
  );
}
