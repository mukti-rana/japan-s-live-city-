"use client";

import { useEffect, useState } from "react";
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
// It tucks away while the page is scrolled down, so it never sits over a card being read,
// and comes back when scrolling up, near the top or bottom of the page, when the pointer
// goes to the bottom edge, or when a keyboard user tabs into it.
export default function QuickDock() {
  const { t } = useLanguage();
  const [away, setAway] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        const dy = y - last;
        if (Math.abs(dy) < 8) return;
        last = y;
        const nearTop = y < 160;
        const nearEnd = y + window.innerHeight >= document.documentElement.scrollHeight - 200;
        setAway(!(nearTop || nearEnd || dy < 0));
      });
    };
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== "touch" && event.clientY > window.innerHeight - 96) setAway(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
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
    <div
      data-away={away}
      onFocusCapture={() => setAway(false)}
      className={`pointer-events-none sticky bottom-4 z-30 hidden justify-center transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none lg:flex ${
        away ? "translate-y-[calc(100%+1.5rem)] opacity-0 [&>nav]:pointer-events-none" : ""
      }`}
    >
      <MagneticDock items={items} label={t("quickaccess.title")} className="pointer-events-auto" />
    </div>
  );
}
