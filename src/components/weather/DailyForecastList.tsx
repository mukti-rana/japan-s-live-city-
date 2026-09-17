import { Droplets } from "lucide-react";
import WeatherIcon from "@/components/ui/WeatherIcon";
import T from "@/components/i18n/T";
import type { ForecastDay, WeatherIconKind } from "@/lib/services/weather";

interface TodaySummary {
  high: number;
  low: number;
  icon: WeatherIconKind;
  precipProbability: number;
}

export default function DailyForecastList({
  today,
  days,
}: {
  today: TodaySummary;
  days: ForecastDay[];
}) {
  const allLows = [today.low, ...days.map((d) => d.low)];
  const allHighs = [today.high, ...days.map((d) => d.high)];
  const rangeLow = Math.min(...allLows);
  const rangeHigh = Math.max(...allHighs);
  const rangeSpan = Math.max(rangeHigh - rangeLow, 1);

  const rows = [
    {
      key: "today",
      label: <T k="weather.today" />,
      icon: today.icon,
      low: today.low,
      high: today.high,
      precipProbability: today.precipProbability,
    },
    ...days.map((d) => ({
      key: d.date,
      label: d.weekday,
      icon: d.icon,
      low: d.low,
      high: d.high,
      precipProbability: d.precipProbability,
    })),
  ];

  return (
    <div className="flex flex-col divide-y divide-glass-border">
      {rows.map((row) => {
        const barStart = ((row.low - rangeLow) / rangeSpan) * 100;
        const barEnd = ((row.high - rangeLow) / rangeSpan) * 100;
        return (
          <div key={row.key} className="flex items-center gap-3 py-2.5 text-sm">
            <span className="w-10 shrink-0 font-medium text-foreground">{row.label}</span>
            <WeatherIcon icon={row.icon} size={18} className="shrink-0 text-gold" />
            <span className="flex w-11 shrink-0 items-center gap-0.5 text-xs text-azure">
              {row.precipProbability > 0 && (
                <>
                  <Droplets size={11} />
                  {row.precipProbability}%
                </>
              )}
            </span>
            <span className="w-6 shrink-0 text-right tabular-nums text-muted">{row.low}°</span>
            <div className="relative h-1 flex-1 rounded-full bg-glass-bg-strong">
              <div
                className="absolute h-full rounded-full bg-gradient-to-r from-azure to-gold"
                style={{ left: `${barStart}%`, right: `${100 - barEnd}%` }}
              />
            </div>
            <span className="w-6 shrink-0 tabular-nums text-foreground">{row.high}°</span>
          </div>
        );
      })}
    </div>
  );
}
