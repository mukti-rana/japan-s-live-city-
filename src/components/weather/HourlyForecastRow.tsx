import { Droplets } from "lucide-react";
import WeatherIcon from "@/components/ui/WeatherIcon";
import type { HourlyPoint } from "@/lib/services/weather";

export default function HourlyForecastRow({ hours }: { hours: HourlyPoint[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-1">
      {hours.map((hour) => (
        <div
          key={hour.time}
          className="flex min-w-[52px] flex-col items-center gap-1.5 text-center"
        >
          <span className="text-xs text-foreground/70">{hour.hourLabel}</span>
          <WeatherIcon icon={hour.icon} size={20} className="text-foreground" />
          {hour.precipProbability > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-azure">
              <Droplets size={10} />
              {hour.precipProbability}%
            </span>
          )}
          <span className="text-sm font-medium tabular-nums text-foreground">
            {hour.tempC}°
          </span>
        </div>
      ))}
    </div>
  );
}
