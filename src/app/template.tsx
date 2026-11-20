"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";

// How every inner page is entered. Choosing "View all", a card, a menu item or any other link brings the new page in with a zoom: it grows
// from slightly smaller and softly blurred to full size, out of the very spot that was pressed (so the page seems to open from the button).
// The home page and the full-screen sign-in pages are left exactly as they are. Reduced motion shows the page at once.
//
// This is a template (not a layout), so it is made fresh for every page that is opened; the wrapper is also keyed on the path, so moving
// between two pages of the same section (Community, then its photos) is animated too, while only changing a filter in the address is not.
const PLAIN = new Set(["/", "/login", "/signup", "/forgot-password", "/reset-password"]);
const KEY = "lc:nav-origin";

export default function Template({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const box = useRef<HTMLDivElement>(null);

  // Remember where the last internal link or button was pressed, for the page that opens next (kept for a few seconds, across a full reload).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || !a.href.startsWith(window.location.origin)) return;
      const x = e.clientX || window.innerWidth / 2;
      const y = e.clientY || window.innerHeight / 2;
      try {
        sessionStorage.setItem(KEY, JSON.stringify({ x, y, t: Date.now() }));
      } catch {}
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // The page that has just opened grows out of that spot.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    try {
      const raw = sessionStorage.getItem(KEY);
      if (!raw) return;
      const o = JSON.parse(raw) as { x: number; y: number; t: number };
      sessionStorage.removeItem(KEY);
      if (Date.now() - o.t > 6000) return;
      const r = el.getBoundingClientRect();
      el.style.transformOrigin = `${Math.min(100, Math.max(0, ((o.x - r.left) / Math.max(r.width, 1)) * 100))}% ${Math.min(100, Math.max(0, ((o.y - r.top) / Math.max(r.height, 1)) * 100))}%`;
    } catch {}
  }, [pathname]);

  if (PLAIN.has(pathname)) return <>{children}</>;
  return (
    <div key={pathname} ref={box} className="page-enter">
      {children}
    </div>
  );
}
