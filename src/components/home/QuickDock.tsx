"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Activity, Banknote, GraduationCap, House, JapaneseYen, Languages, ScanText, Sparkles, Users } from "lucide-react";
import { MagneticDock, type DockItemData } from "@/components/ui/magnetic-dock";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translationKeys";

// Community first, then the tools that have no sidebar entry, kept one click away while the home page scrolls. The icons are
// all Lucide, one stroke weight, all silver (only the current page is accented, see MagneticDock).
const TOOLS: {
  labelKey: TranslationKey;
  href: string;
  icon: typeof Sparkles;
  dividerAfter?: boolean;
}[] = [
  // Community comes first, set apart from the tools by a divider. It links to the
  // same /community page as the sidebar entry on the other pages.
  { labelKey: "nav.community", href: "/community", icon: Users, dividerAfter: true },
  { labelKey: "quickaccess.ai", href: "/ai-assistant", icon: Sparkles },
  { labelKey: "quickaccess.explainJapanese", href: "/explain-japanese", icon: Languages },
  { labelKey: "quickaccess.signAssistant", href: "/sign-assistant", icon: ScanText },
  { labelKey: "quickaccess.jlpt", href: "/jlpt", icon: GraduationCap },
  { labelKey: "quickaccess.yen", href: "/yen-converter", icon: JapaneseYen },
  { labelKey: "quickaccess.salary", href: "/salary-calculator", icon: Banknote },
  { labelKey: "quickaccess.rent", href: "/rent-calculator", icon: House },
  { labelKey: "quickaccess.earthquakes", href: "/earthquakes", icon: Activity },
];

// Larger tiles on a desktop, slightly smaller on a tablet, so the row always fits.
const wide = "(min-width: 1024px)";
function useWide() {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(wide);
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia(wide).matches,
    () => true,
  );
}

// Shown on tablets and desktops; on a phone the floating menu button
// owns the bottom edge (and the drawer holds every one of these links). Sticky rather than fixed, so it centres on the content
// column and comes to rest above the footer instead of covering it.
//
// It never sits over what is being read. It is shown on the opening screen (only while the
// hero's last control, [data-dock-clear], is above it, which matters on short screens) and at
// the very end of the page, where there is nothing under it; everywhere else it is tucked away, and
// comes up only when asked for: the pointer going to the bottom edge, or a keyboard user
// tabbing into it.
export default function QuickDock() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const roomy = useWide();
  const [atEnds, setAtEnds] = useState(true);
  const [edge, setEdge] = useState(false);
  const [focused, setFocused] = useState(false);
  const shown = atEnds || edge || focused;
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const y = window.scrollY;
      const nearTop = y < window.innerHeight * 0.6;
      const nearEnd = y + window.innerHeight >= document.documentElement.scrollHeight - 160;
      // On the opening screen, only if the hero's last control is clear of where the dock sits.
      const clear = document.querySelector("[data-dock-clear]")?.getBoundingClientRect().bottom ?? 0;
      const dockTop = window.innerHeight - 16 - (wrap.current?.offsetHeight ?? 80) - 12;
      // ...and only while the Your Day strip under the hero has not come into view (it would sit under the dock).
      const stripTop = document.getElementById("your-day")?.getBoundingClientRect().top ?? Infinity;
      setAtEnds(nearEnd || (nearTop && clear <= dockTop && stripTop >= window.innerHeight - 2));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      // Reveal at the bottom edge; once the pointer has moved well clear of the dock, tuck it away again.
      const fromBottom = window.innerHeight - event.clientY;
      if (fromBottom < 72) setEdge(true);
      else if (fromBottom > 168) setEdge(false);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const items: DockItemData[] = TOOLS.map(({ labelKey, href, icon: Icon, dividerAfter }) => ({
    id: href,
    label: t(labelKey),
    href,
    dividerAfter,
    isActive: pathname === href || pathname.startsWith(`${href}/`),
    icon: <Icon size={roomy ? 23 : 21} strokeWidth={1.6} />,
  }));

  return (
    <div
        ref={wrap}
        data-away={!shown}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={() => setFocused(false)}
        className={`pointer-events-none sticky bottom-4 z-30 hidden justify-center transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none md:flex ${
          shown ? "" : "translate-y-[calc(100%+1.5rem)] opacity-0 [&>nav]:pointer-events-none"
        }`}
      >
        <MagneticDock items={items} label={t("quickaccess.title")} iconSize={roomy ? 46 : 40} className="pointer-events-auto" />
    </div>
  );
}
