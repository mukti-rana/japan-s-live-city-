"use client";

import { useRef, useSyncExternalStore, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
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
  ArrowUpRight,
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

// Each group keeps its own colour, as numbers (see .qa-tile in cinematic.css).
const ACCENT_RGB: Record<Accent, [number, number, number]> = { azure: [77, 163, 255], sakura: [255, 122, 168], gold: [245, 185, 74] };

// All eleven tools as one grid of tiles (four across on a wide screen, so the last row is Salary, Earthquakes and a double-width Emergency, and
// nothing is left with a hole beside it). They arrive as if from deep inside the screen: a point of light opens at the middle of the grid and
// the tiles fly out of it toward you, the middle ones first and the outer ones after, each settling flat. It plays every time the grid scrolls
// into view (and again on the way back). Pointing at a tile tilts it toward the pointer and lays a light of its own colour under it. With reduced
// motion, or before the page is running, the tiles are simply there.
const TOOLS = QUICK_GROUPS.flatMap(({ accent, links }) => links.map((l) => ({ ...l, accent })));
const COLS = 4;

function Tile({ tool, index }: { tool: (typeof TOOLS)[number]; index: number }) {
  const { t } = useLanguage();
  const Icon = tool.icon;
  const wide = tool.labelKey === "quickaccess.emergency";
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  // Where this tile stands from the middle of the grid (columns -1.5 to 1.5, rows -1 to 1), and so when it arrives.
  const cx = wide ? 0.5 : col - 1.5;
  const cy = row - 1;
  const dist = Math.hypot(cx, cy * 1.3);
  const [r, g, b] = ACCENT_RGB[tool.accent];
  const style = { "--cx": cx, "--cy": cy, "--d": (0.05 + dist * 0.12).toFixed(2), "--acc-r": r, "--acc-g": g, "--acc-b": b } as CSSProperties;
  const follow = (e: ReactPointerEvent<HTMLAnchorElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
    el.style.setProperty("--px", (((e.clientX - rect.left) / rect.width) * 2 - 1).toFixed(3));
    el.style.setProperty("--py", (((e.clientY - rect.top) / rect.height) * 2 - 1).toFixed(3));
  };
  const rest = (e: ReactPointerEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.setProperty("--px", "0");
    e.currentTarget.style.setProperty("--py", "0");
  };
  return (
    <li className={`qa-item ${wide ? "col-span-2" : ""}`} style={style}>
      <Link href={tool.href} onPointerMove={follow} onPointerLeave={rest} className="qa-tile group flex h-full items-center gap-3.5 rounded-2xl p-3 sm:p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
        <span className="qa-icon flex h-10 w-10 shrink-0 sm:h-11 sm:w-11 items-center justify-center rounded-xl">
          <Icon size={19} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block break-words text-[14px] font-medium leading-tight text-foreground sm:truncate sm:text-[15px]">{t(tool.labelKey)}</span>
          <span className="mt-1 block line-clamp-2 text-[11.5px] leading-snug text-muted sm:truncate sm:text-[12px]">{t(tool.subKey)}</span>
        </span>
        <ArrowUpRight size={15} aria-hidden="true" className="qa-go hidden shrink-0 text-white/40 sm:block" />
      </Link>
    </li>
  );
}

export default function QuickAccessWidget() {
  const ref = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const live = useInView(ref, { amount: 0.2, margin: "0px 0px -6% 0px" });

  return (
    <WidgetFrame icon={Zap} labelKey="quickaccess.title" accent="azure">
      <div ref={ref} className="qa relative" data-live={mounted ? String(live) : undefined}>
        <span aria-hidden="true" className="qa-portal pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full" />
        <ul className="qa-grid grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {TOOLS.map((tool, i) => (
            <Tile key={tool.labelKey} tool={tool} index={i} />
          ))}
        </ul>
      </div>
    </WidgetFrame>
  );
}
