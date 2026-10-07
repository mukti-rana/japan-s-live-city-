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

const QUICK_LINKS: {
  labelKey: TranslationKey;
  subKey: TranslationKey;
  href: string;
  icon: typeof TrainFront;
  accent: "azure" | "sakura";
}[] = [
  { labelKey: "quickaccess.trainRoutes", subKey: "quickaccess.trainRoutesSub", href: "/trains", icon: TrainFront, accent: "azure" },
  { labelKey: "quickaccess.weather", subKey: "quickaccess.weatherSub", href: "/weather", icon: CloudSun, accent: "azure" },
  { labelKey: "quickaccess.jlpt", subKey: "quickaccess.jlptSub", href: "/jlpt", icon: GraduationCap, accent: "sakura" },
  { labelKey: "quickaccess.yen", subKey: "quickaccess.yenSub", href: "/yen-converter", icon: Coins, accent: "sakura" },
  { labelKey: "quickaccess.ai", subKey: "quickaccess.aiSub", href: "/ai-assistant", icon: Sparkles, accent: "sakura" },
  { labelKey: "quickaccess.explainJapanese", subKey: "quickaccess.explainJapaneseSub", href: "/explain-japanese", icon: Languages, accent: "azure" },
  { labelKey: "quickaccess.signAssistant", subKey: "quickaccess.signAssistantSub", href: "/sign-assistant", icon: Camera, accent: "sakura" },
  { labelKey: "quickaccess.salary", subKey: "quickaccess.salarySub", href: "/salary-calculator", icon: Calculator, accent: "azure" },
  { labelKey: "quickaccess.rent", subKey: "quickaccess.rentSub", href: "/rent-calculator", icon: Home, accent: "azure" },
  { labelKey: "quickaccess.earthquakes", subKey: "quickaccess.earthquakesSub", href: "/earthquakes", icon: Activity, accent: "sakura" },
  { labelKey: "quickaccess.emergency", subKey: "quickaccess.emergencySub", href: "/emergency", icon: ShieldAlert, accent: "azure" },
];

export default function QuickAccessWidget() {
  const { t } = useLanguage();

  return (
    <WidgetFrame icon={Zap} labelKey="quickaccess.title" accent="azure">
      <div className="grid grid-cols-2 gap-2">
        {QUICK_LINKS.map(({ labelKey, subKey, href, icon: Icon, accent }) => (
          <a
            key={labelKey}
            href={href}
            className="flex items-center gap-2 rounded-xl border border-glass-border bg-glass-bg p-2.5 transition-colors hover:border-azure/30 hover:bg-glass-bg-strong"
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                accent === "azure"
                  ? "bg-azure/15 text-azure"
                  : "bg-sakura/15 text-sakura"
              }`}
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
    </WidgetFrame>
  );
}
