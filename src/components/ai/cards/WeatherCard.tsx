"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { dateFormatter } from "@/lib/i18n/datetime";
import { useTranslate } from "@/lib/i18n/inline";
import { Sun } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import WeatherIcon from "@/components/ui/WeatherIcon";
import CardHeader from "@/components/ai/cards/CardHeader";
import type { WeatherCardData } from "@/lib/ai/types";

export default function WeatherCard({ data }: { data: WeatherCardData }) {
  const { language } = useLanguage();
  const tr = useTranslate();
  return (
    <GlassCard className="flex w-full max-w-xs flex-col gap-3 p-4">
      <CardHeader icon={Sun} label={`Weather — ${data.city}`} accent="gold" />
      <div className="flex items-center gap-3">
        <WeatherIcon icon={data.icon} size={32} className="text-gold" />
        <div>
          <p className="text-2xl font-semibold text-foreground">{Math.round(data.tempC)}°C</p>
          <p className="text-[11px] text-muted">
            {tr(data.condition)} · {tr("Feels")} {Math.round(data.feelsLikeC)}°
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[10px] text-muted">
        <p>{tr("Humidity")} {data.humidity}%</p>
        <p>{tr("Wind")} {Math.round(data.windKmh)} km/h</p>
        <p>{tr("High")} {Math.round(data.todayHigh)}° / {tr("Low")} {Math.round(data.todayLow)}°</p>
        <p>
          {tr("Sunrise")} {data.sunrise} · {tr("Sunset")} {data.sunset}
        </p>
      </div>
      <p className="text-[9px] text-muted/70">{data.source} · {tr("checked")} {dateFormatter(language, { timeStyle: "short" }).format(new Date(data.updatedAt))}</p>
    </GlassCard>
  );
}
