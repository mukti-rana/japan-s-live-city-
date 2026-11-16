"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Languages,
  Camera,
  GraduationCap,
  Coins,
  Home,
  Calculator,
  Activity,
  Users,
} from "lucide-react";
import { MagneticDock, type DockItemData } from "@/components/ui/magnetic-dock";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translationKeys";

// Community first, then the tools that have no sidebar entry, kept one click away while the home
// page scrolls. Accents follow QuickAccessWidget: sakura for language & AI,
// gold for money, azure for the rest.
const TOOLS: {
  labelKey: TranslationKey;
  href: string;
  icon: typeof Sparkles;
  accent: NonNullable<DockItemData["accent"]>;
  dividerAfter?: boolean;
}[] = [
  // Community comes first, set apart from the tools by a divider. It links to the
  // same /community page as the sidebar entry on the other pages.
  { labelKey: "nav.community", href: "/community", icon: Users, accent: "azure", dividerAfter: true },
  { labelKey: "quickaccess.ai", href: "/ai-assistant", icon: Sparkles, accent: "sakura" },
  { labelKey: "quickaccess.explainJapanese", href: "/explain-japanese", icon: Languages, accent: "sakura" },
  { labelKey: "quickaccess.signAssistant", href: "/sign-assistant", icon: Camera, accent: "sakura" },
  { labelKey: "quickaccess.jlpt", href: "/jlpt", icon: GraduationCap, accent: "sakura" },
  { labelKey: "quickaccess.yen", href: "/yen-converter", icon: Coins, accent: "gold" },
  { labelKey: "quickaccess.salary", href: "/salary-calculator", icon: Calculator, accent: "gold" },
  { labelKey: "quickaccess.rent", href: "/rent-calculator", icon: Home, accent: "azure" },
  { labelKey: "quickaccess.earthquakes", href: "/earthquakes", icon: Activity, accent: "azure" },
];

// Pointer-driven, so it is desktop-only; below lg the floating menu button
// owns the bottom edge. Sticky rather than fixed, so it centres on the content
// column and comes to rest above the footer instead of covering it.
//
// It never sits over what is being read. It is shown on the opening screen (only while the
// hero's last control, [data-dock-clear], is above it, which matters on short screens) and at
// the very end of the page, where there is nothing under it; everywhere else it is tucked away, and
// comes up only when asked for: the pointer going to the bottom edge, or a keyboard user
// tabbing into it. A thin line at the bottom edge shows it is there.
export default function QuickDock() {
  const { t } = useLanguage();
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
      setAtEnds(nearEnd || (nearTop && clear <= dockTop));
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

  const items: DockItemData[] = TOOLS.map(({ labelKey, href, icon: Icon, accent, dividerAfter }) => ({
    id: href,
    label: t(labelKey),
    href,
    accent,
    dividerAfter,
    icon: <Icon size={20} />,
  }));

  return (
    <>
      <div
        ref={wrap}
        data-away={!shown}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={() => setFocused(false)}
        className={`pointer-events-none sticky bottom-4 z-30 hidden justify-center transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none lg:flex ${
          shown ? "" : "translate-y-[calc(100%+1.5rem)] opacity-0 [&>nav]:pointer-events-none"
        }`}
      >
        <MagneticDock items={items} label={t("quickaccess.title")} className="pointer-events-auto" />
      </div>
      {/* The "dock is down here" cue, only while the dock is tucked away. */}
      <span aria-hidden="true" className={`pointer-events-none fixed bottom-1.5 left-1/2 z-30 hidden h-1 w-14 -translate-x-1/2 rounded-full bg-white/35 transition-opacity duration-300 motion-reduce:transition-none lg:block ${shown ? "opacity-0" : "opacity-100"}`} />
    </>
  );
}
