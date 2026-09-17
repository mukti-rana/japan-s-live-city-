import { Sun } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import WeatherIcon from "@/components/ui/WeatherIcon";
import CardHeader from "@/components/ai/cards/CardHeader";
import type { WeatherCardData } from "@/lib/ai/types";

export default function WeatherCard({ data }: { data: WeatherCardData }) {
  return (
    <GlassCard className="flex w-full max-w-xs flex-col gap-3 p-4">
      <CardHeader icon={Sun} label={`Weather — ${data.city}`} accent="gold" />
      <div className="flex items-center gap-3">
        <WeatherIcon icon={data.icon} size={32} className="text-gold" />
        <div>
          <p className="text-2xl font-semibold text-foreground">{Math.round(data.tempC)}°C</p>
          <p className="text-[11px] text-muted">
            {data.condition} · Feels {Math.round(data.feelsLikeC)}°
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[10px] text-muted">
        <p>Humidity {data.humidity}%</p>
        <p>Wind {Math.round(data.windKmh)} km/h</p>
        <p>High {Math.round(data.todayHigh)}° / Low {Math.round(data.todayLow)}°</p>
        <p>
          Sunrise {data.sunrise} · Sunset {data.sunset}
        </p>
      </div>
      <p className="text-[9px] text-muted/70">{data.source} · checked {new Date(data.updatedAt).toLocaleTimeString()}</p>
    </GlassCard>
  );
}
