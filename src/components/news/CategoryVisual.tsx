"use client";

import {
  Activity,
  CalendarDays,
  Clapperboard,
  Cpu,
  FlaskConical,
  Globe2,
  Landmark,
  Newspaper,
  Plane,
  ShieldAlert,
  TrainFront,
  TrendingUp,
  Trophy,
  Users,
  CloudLightning,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties } from "react";
import { useInline, type Table } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translationKeys";
import type { TopicId } from "@/lib/news/types";

// An editorial illustration used when a story has no picture of its own: a
// dark gradient, a faint pattern and a large icon for the story's category.
// It is deliberately abstract and is labelled as an illustration — it is never
// meant to look like a photograph of the event.

export type VisualTopic = TopicId | "international" | "event";
export type VisualSize = "thumb" | "card" | "hero" | "backdrop";

type Pattern = "dots" | "columns" | "diagonal" | "bars" | "grid" | "rain" | "meridian" | "wave" | "lines";

interface Look {
  icon: LucideIcon;
  from: string;
  to: string;
  accent: string;
  pattern: Pattern;
  label: TranslationKey | null;
}

const LOOKS: Record<VisualTopic, Look> = {
  politics: { icon: Landmark, from: "#1d2f6b", to: "#0d1533", accent: "#8fb0ff", pattern: "columns", label: "news.cat.politics" },
  crime: { icon: ShieldAlert, from: "#33204f", to: "#0e1230", accent: "#f59ac0", pattern: "diagonal", label: "news.cat.crime" },
  society: { icon: Users, from: "#16376a", to: "#0d1634", accent: "#7ed3ff", pattern: "dots", label: "news.cat.society" },
  economy: { icon: TrendingUp, from: "#13405f", to: "#0c1530", accent: "#63e6bd", pattern: "bars", label: "news.cat.economy" },
  tech: { icon: Cpu, from: "#2f2373", to: "#0d1236", accent: "#bba6ff", pattern: "grid", label: "news.cat.tech" },
  science: { icon: FlaskConical, from: "#1d2f78", to: "#0b1a3a", accent: "#86e4ff", pattern: "grid", label: "news.cat.science" },
  weather: { icon: CloudLightning, from: "#1b3f78", to: "#0c1432", accent: "#94cdff", pattern: "rain", label: "news.cat.weather" },
  earthquake: { icon: Activity, from: "#40284f", to: "#0e1230", accent: "#ffbd78", pattern: "wave", label: "news.cat.earthquake" },
  sports: { icon: Trophy, from: "#10426a", to: "#0c1430", accent: "#6be6ff", pattern: "diagonal", label: "news.cat.sports" },
  entertainment: { icon: Clapperboard, from: "#512478", to: "#0f1236", accent: "#ff92dc", pattern: "dots", label: "news.cat.entertainment" },
  travel: { icon: Plane, from: "#194a86", to: "#0d1535", accent: "#ffd884", pattern: "meridian", label: "news.cat.travel" },
  transport: { icon: TrainFront, from: "#1f3878", to: "#0d1433", accent: "#8db6ff", pattern: "columns", label: "news.cat.transport" },
  international: { icon: Globe2, from: "#2d2585", to: "#0b1433", accent: "#a3b0ff", pattern: "meridian", label: "news.cat.international" },
  general: { icon: Newspaper, from: "#212f63", to: "#0d1331", accent: "#a2b8ff", pattern: "lines", label: null },
  event: { icon: CalendarDays, from: "#442478", to: "#0e1236", accent: "#ff9fd4", pattern: "dots", label: null },
};

const TEXT = {
  illustration: { en: "Editorial illustration", ja: "イメージイラスト" },
  news: { en: "News", ja: "ニュース" },
  event: { en: "Event", ja: "イベント" },
} satisfies Table;

function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function patternStyle(pattern: Pattern, accent: string): CSSProperties {
  const c = rgba(accent, 0.55);
  switch (pattern) {
    case "dots":
      return { backgroundImage: `radial-gradient(${c} 1.2px, transparent 1.6px)`, backgroundSize: "16px 16px" };
    case "columns":
      return { backgroundImage: `repeating-linear-gradient(90deg, ${c} 0 1px, transparent 1px 22px)` };
    case "diagonal":
      return { backgroundImage: `repeating-linear-gradient(135deg, ${c} 0 1px, transparent 1px 14px)` };
    case "bars":
      return { backgroundImage: `repeating-linear-gradient(90deg, ${c} 0 5px, transparent 5px 13px)`, WebkitMaskImage: "linear-gradient(to top, black, transparent 85%)", maskImage: "linear-gradient(to top, black, transparent 85%)" };
    case "grid":
      return { backgroundImage: `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`, backgroundSize: "26px 26px" };
    case "rain":
      return { backgroundImage: `repeating-linear-gradient(105deg, ${c} 0 1px, transparent 1px 12px)` };
    case "meridian":
      return { backgroundImage: `repeating-radial-gradient(circle at 82% 95%, ${c} 0 1px, transparent 1px 28px)` };
    case "wave": {
      const stroke = `%23${accent.slice(1)}`;
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='72' height='28'><path d='M0 14 H12 L17 3 L24 25 L30 14 H72' fill='none' stroke='${stroke}' stroke-opacity='0.55' stroke-width='1'/></svg>`;
      return { backgroundImage: `url("data:image/svg+xml;utf8,${svg}")`, backgroundSize: "72px 28px" };
    }
    default:
      return { backgroundImage: `repeating-linear-gradient(0deg, ${c} 0 1px, transparent 1px 15px)` };
  }
}

export function useVisualLabel() {
  const { t } = useLanguage();
  const text = useInline(TEXT);
  return (topic: VisualTopic): string => {
    const look = LOOKS[topic];
    if (look.label) return t(look.label);
    return topic === "event" ? text("event") : text("news");
  };
}

export default function CategoryVisual({
  topic,
  size = "card",
  className = "",
}: {
  topic: VisualTopic;
  size?: VisualSize;
  className?: string;
}) {
  const text = useInline(TEXT);
  const labelFor = useVisualLabel();
  const look = LOOKS[topic] ?? LOOKS.general;
  const Icon = look.icon;
  const label = labelFor(topic);
  const decorative = size === "backdrop";

  return (
    <div
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : `${label} — ${text("illustration")}`}
      className={`${className.includes("absolute") ? "" : "relative"} isolate overflow-hidden ${className}`}
      style={{ background: `linear-gradient(135deg, ${look.from} 0%, ${look.to} 78%)` }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-[0.2] [mask-image:linear-gradient(135deg,black,transparent_85%)]"
        style={patternStyle(look.pattern, look.accent)}
      />
      <div
        aria-hidden="true"
        className="absolute -right-10 -top-12 -z-10 h-44 w-44 rounded-full blur-3xl"
        style={{ background: rgba(look.accent, 0.28) }}
      />
      <Icon
        aria-hidden="true"
        strokeWidth={1.1}
        className={`absolute -z-10 ${size === "backdrop" ? "-bottom-[18%] right-[3%]" : "-bottom-[14%] -right-[4%]"}`}
        style={{ height: size === "thumb" ? "95%" : size === "backdrop" ? "125%" : "78%", width: "auto", aspectRatio: "1", color: rgba(look.accent, size === "backdrop" ? 0.2 : 0.16) }}
      />

      {size === "thumb" && (
        <div className="flex h-full w-full items-center justify-center">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border bg-white/5 backdrop-blur-sm" style={{ borderColor: rgba(look.accent, 0.4), color: look.accent }}>
            <Icon size={18} aria-hidden="true" strokeWidth={1.7} />
          </span>
        </div>
      )}

      {(size === "card" || size === "hero") && (
        <div className="flex h-full w-full flex-col justify-between p-3 sm:p-4">
          <span
            className={`flex items-center justify-center rounded-xl border bg-white/5 backdrop-blur-sm ${size === "hero" ? "h-12 w-12" : "h-10 w-10"}`}
            style={{ borderColor: rgba(look.accent, 0.4), color: look.accent }}
          >
            <Icon size={size === "hero" ? 24 : 20} aria-hidden="true" strokeWidth={1.6} />
          </span>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="rounded-full border bg-black/25 px-2.5 py-1 text-[11px] font-semibold text-foreground backdrop-blur-sm" style={{ borderColor: rgba(look.accent, 0.35) }}>
              {label}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-foreground/55">{text("illustration")}</span>
          </div>
        </div>
      )}
    </div>
  );
}
