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
} from "lucide-react";
import WidgetFrame from "@/components/home/WidgetFrame";

const QUICK_LINKS = [
  { label: "Train Routes", sub: "Plan your trip", href: "/trains", icon: TrainFront, accent: "azure" },
  { label: "Weather", sub: "Check forecast", href: "/weather", icon: CloudSun, accent: "azure" },
  { label: "JLPT Quiz", sub: "Practice N5–N1", href: "/jlpt", icon: GraduationCap, accent: "sakura" },
  { label: "Yen Convert", sub: "Live exchange rate", href: "/yen-converter", icon: Coins, accent: "sakura" },
  { label: "LIVE CITY AI", sub: "Ask Japan anything", href: "/ai-assistant", icon: Sparkles, accent: "sakura" },
  { label: "Salary Calc", sub: "Estimate income", href: "/salary-calculator", icon: Calculator, accent: "azure" },
  { label: "Rent Calc", sub: "Move-in costs", href: "/rent-calculator", icon: Home, accent: "azure" },
  { label: "Earthquakes", sub: "Recent activity", href: "/earthquakes", icon: Activity, accent: "sakura" },
  { label: "Emergency", sub: "Active alerts", href: "/emergency", icon: ShieldAlert, accent: "azure" },
];

export default function QuickAccessWidget() {
  return (
    <WidgetFrame icon={Zap} label="Quick Access" accent="azure">
      <div className="grid grid-cols-2 gap-2">
        {QUICK_LINKS.map(({ label, sub, href, icon: Icon, accent }) => (
          <a
            key={label}
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
                {label}
              </span>
              <span className="block truncate text-[9px] text-muted">
                {sub}
              </span>
            </span>
          </a>
        ))}
      </div>
    </WidgetFrame>
  );
}
