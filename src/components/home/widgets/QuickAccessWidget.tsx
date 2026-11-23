"use client";

import { useRef, useSyncExternalStore, type CSSProperties } from "react";
import { useInView } from "motion/react";
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

// The panel looks exactly as it always did (three groups of small tiles, each group with its own colour). Only the arrival is new: each time
// the panel scrolls into view (and again on the way back), a point of light opens at its middle and the tiles travel out of it from deep behind
// the screen (small, tilted back, blurred) to their places, the middle tiles first and the outer ones after. Reduced motion, or before the page
// is running, shows the tiles in place (see "Quick access" in cinematic.css). Pointing at a tile reacts in its icon only (it pops and tips with a
// glow in its group's colour); the tile itself, its border and its words stay still.
// Each group's colour, as numbers, for the glow its icon takes when its tile is pointed at.
const ACCENT_RGB: Record<Accent, string> = { azure: "77 163 255", sakura: "255 122 168", gold: "245 185 74" };
const COLS = 2;
const TOTAL_ROWS = QUICK_GROUPS.reduce((n, g) => n + Math.ceil(g.links.length / COLS), 0);
// The row at which each group starts.
const STARTS = QUICK_GROUPS.map((_, gi) => QUICK_GROUPS.slice(0, gi).reduce((n, g) => n + Math.ceil(g.links.length / COLS), 0));

export default function QuickAccessWidget() {
  const { t } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const live = useInView(ref, { amount: 0.2, margin: "0px 0px -6% 0px" });

  return (
    <WidgetFrame icon={Zap} labelKey="quickaccess.title" accent="azure">
      <div ref={ref} className="qa relative" data-live={mounted ? String(live) : undefined}>
        <div className="qa-grid flex flex-col gap-4">
          {QUICK_GROUPS.map(({ accent, links }, gi) => {
            const start = STARTS[gi];
            return (
              <div key={accent} className="grid grid-cols-2 gap-2">
                {links.map(({ labelKey, subKey, href, icon: Icon }, i) => {
                  // Where this tile stands from the middle of the panel, and so when it arrives.
                  const cx = (i % COLS) - (COLS - 1) / 2;
                  const cy = start + Math.floor(i / COLS) - (TOTAL_ROWS - 1) / 2;
                  const dist = Math.hypot(cx * 1.4, cy);
                  const style = { "--cx": cx, "--cy": cy, "--d": (0.04 + dist * 0.07).toFixed(2), "--acc": ACCENT_RGB[accent] } as CSSProperties;

                  return (
                    <a
                      key={labelKey}
                      href={href}
                      style={style}
                      className="qa-item flex items-center gap-2 rounded-xl border border-glass-border bg-glass-bg p-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                    >
                      <span className={`qa-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ACCENT_CLASS[accent]}`}>
                        <Icon size={15} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[11px] font-medium text-foreground">{t(labelKey)}</span>
                        <span className="block truncate text-[9px] text-muted">{t(subKey)}</span>
                      </span>
                    </a>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </WidgetFrame>
  );
}
