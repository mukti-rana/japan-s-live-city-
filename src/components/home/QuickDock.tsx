"use client";

import {
  Sparkles,
  Languages,
  Camera,
  GraduationCap,
  Coins,
  Home,
  Calculator,
  Activity,
} from "lucide-react";
import { MagneticDock, type DockItemData } from "@/components/ui/magnetic-dock";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translationKeys";

// The tools that have no sidebar entry, kept one click away while the home
// page scrolls. Accents follow QuickAccessWidget: sakura for language & AI,
// gold for money, azure for the rest.
const TOOLS: {
  labelKey: TranslationKey;
  href: string;
  icon: typeof Sparkles;
  accent: NonNullable<DockItemData["accent"]>;
}[] = [
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
export default function QuickDock() {
  const { t } = useLanguage();

  const items: DockItemData[] = TOOLS.map(({ labelKey, href, icon: Icon, accent }) => ({
    id: href,
    label: t(labelKey),
    href,
    accent,
    icon: <Icon size={20} />,
  }));

  return (
    <div className="pointer-events-none sticky bottom-4 z-30 hidden justify-center lg:flex">
      <MagneticDock items={items} label={t("quickaccess.title")} className="pointer-events-auto" />
    </div>
  );
}
