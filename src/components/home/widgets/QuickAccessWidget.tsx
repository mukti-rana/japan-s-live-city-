"use client";

import {
  Zap,
  TrainFront,
  CloudSun,
  GraduationCap,
  Coins,
  Sparkles,
  Calculator,
  Activity,
  ShieldAlert,
  Home,
  Languages,
  Camera,
} from "lucide-react";
import WidgetFrame from "@/components/home/WidgetFrame";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translationKeys";

type Accent = "azure" | "sakura" | "gold";

interface QuickLink {
  labelKey: TranslationKey;
  subKey: TranslationKey;
  href: string;
  icon: typeof TrainFront;
}

// Grouped by purpose; each group has its own accent so the panel reads as
// three sets of tools rather than one pile of buttons.
const QUICK_GROUPS: { accent: Accent; links: QuickLink[] }[] = [
  {
    accent: "azure",
    links: [
      { labelKey: "quickaccess.trainRoutes", subKey: "quickaccess.trainRoutesSub", href: "/trains", icon: TrainFront },
      { labelKey: "quickaccess.weather", subKey: "quickaccess.weatherSub", href: "/weather", icon: CloudSun },
      { labelKey: "quickaccess.rent", subKey: "quickaccess.rentSub", href: "/rent-calculator", icon: Home },
    ],
  },
  {
    accent: "sakura",
    links: [
      { labelKey: "quickaccess.ai", subKey: "quickaccess.aiSub", href: "/ai-assistant", icon: Sparkles },
      { labelKey: "quickaccess.explainJapanese", subKey: "quickaccess.explainJapaneseSub", href: "/explain-japanese", icon: Languages },
      { labelKey: "quickaccess.signAssistant", subKey: "quickaccess.signAssistantSub", href: "/sign-assistant", icon: Camera },
      { labelKey: "quickaccess.jlpt", subKey: "quickaccess.jlptSub", href: "/jlpt", icon: GraduationCap },
    ],
  },
  {
    accent: "gold",
    links: [
      { labelKey: "quickaccess.yen", subKey: "quickaccess.yenSub", href: "/yen-converter", icon: Coins },
      { labelKey: "quickaccess.salary", subKey: "quickaccess.salarySub", href: "/salary-calculator", icon: Calculator },
      { labelKey: "quickaccess.earthquakes", subKey: "quickaccess.earthquakesSub", href: "/earthquakes", icon: Activity },
      { labelKey: "quickaccess.emergency", subKey: "quickaccess.emergencySub", href: "/emergency", icon: ShieldAlert },
    ],
  },
];

const ACCENT_CLASS: Record<Accent, string> = {
  azure: "bg-azure/15 text-azure",
  sakura: "bg-sakura/15 text-sakura",
  gold: "bg-gold/15 text-gold",
};

export default function QuickAccessWidget() {
  const { t } = useLanguage();

  return (
    <WidgetFrame icon={Zap} labelKey="quickaccess.title" accent="azure">
      <div className="flex flex-col gap-4">
        {QUICK_GROUPS.map(({ accent, links }) => (
          <div key={accent} className="grid grid-cols-2 gap-2">
            {links.map(({ labelKey, subKey, href, icon: Icon }) => (
              <a
                key={labelKey}
                href={href}
                className="flex items-center gap-2 rounded-xl border border-glass-border bg-glass-bg p-2.5 transition-colors hover:border-azure/30 hover:bg-glass-bg-strong"
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ACCENT_CLASS[accent]}`}
                >
                  <Icon size={15} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-medium text-foreground">
                    {t(labelKey)}
                  </span>
                  <span className="block truncate text-[9px] text-muted">
                    {t(subKey)}
                  </span>
                </span>
              </a>
            ))}
          </div>
        ))}
      </div>
    </WidgetFrame>
  );
}
