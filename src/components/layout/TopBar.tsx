"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import TopBarActions from "@/components/layout/TopBarActions";

// The header stays pinned while the page scrolls. Past a short distance it
// eases down to a compact height (and a smaller logo), and returns to full
// size once the visitor is back at the top. Two different thresholds stop it
// flickering around the boundary.
const SHRINK_AT = 32;
const RESTORE_AT = 6;

let compact = false;

function subscribe(callback: () => void) {
  window.addEventListener("scroll", callback, { passive: true });
  return () => window.removeEventListener("scroll", callback);
}

function getSnapshot(): boolean {
  const y = window.scrollY;
  if (!compact && y > SHRINK_AT) compact = true;
  else if (compact && y < RESTORE_AT) compact = false;
  return compact;
}

// Deliberately has no server-side user lookup: reading cookies here would
// force every page in the app to render per request. Sign-in state is read
// in the browser instead (see AuthProvider), so public pages stay static.
export default function TopBar() {
  const isCompact = useSyncExternalStore(subscribe, getSnapshot, () => false);

  // The sidebar sticks just under the header, so it follows the same height.
  useEffect(() => {
    document.documentElement.style.setProperty("--header-h", isCompact ? "3rem" : "3.5rem");
  }, [isCompact]);

  return (
    // This outer box always keeps the full height, so shrinking the bar never
    // moves the page content underneath it.
    <div data-site-header className="sticky top-0 z-30 h-14">
      <header
        data-compact={isCompact}
        className="group absolute inset-x-0 top-0 flex h-[var(--header-h,3.5rem)] items-center gap-3 border-b border-glass-border bg-sidebar-bg/95 px-3 backdrop-blur-xl transition-[height,box-shadow] duration-300 ease-out motion-reduce:transition-none data-[compact=true]:shadow-[0_8px_24px_-16px_rgba(0,0,0,0.8)] sm:gap-4 sm:px-5"
      >
        <Link
          href="/"
          aria-label="LIVE CITY JAPAN"
          className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
        >
          <span className="block h-8 w-8 transition-[width,height] duration-300 ease-out motion-reduce:transition-none group-data-[compact=true]:h-7 group-data-[compact=true]:w-7 [&>svg]:h-full [&>svg]:w-full">
            <Logo size={32} />
          </span>
          <div className="hidden whitespace-nowrap sm:block">
            <p className="text-sm font-bold leading-none tracking-tight text-foreground transition-[font-size] duration-300 group-data-[compact=true]:text-[13px]">LIVE CITY</p>
            <p className="mt-1 text-[9px] font-medium leading-none tracking-[0.18em] text-muted">JAPAN — REAL TIME</p>
          </div>
        </Link>

        <TopBarActions />
      </header>
    </div>
  );
}
