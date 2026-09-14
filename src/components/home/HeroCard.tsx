import Image from "next/image";
import { MapPin, Moon, Sun, CloudSun, Cloud } from "lucide-react";
import LiveClock from "@/components/home/LiveClock";
import { mockCity, mockWeather, mockForecast } from "@/lib/mock/dashboard";

const FORECAST_ICONS = { sun: Sun, partly: CloudSun, cloud: Cloud };

export default function HeroCard() {
  return (
    <div className="grid grid-cols-1 gap-3 overflow-hidden rounded-2xl border border-glass-border bg-panel lg:grid-cols-[1.6fr_1fr]">
      <div className="relative min-h-[240px] overflow-hidden rounded-2xl p-5 sm:p-6">
        <Image
          src="/images/hero-tokyo.jpg"
          alt="Tokyo skyline at night"
          fill
          priority
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b0e1a]/90 via-[#0b0e1a]/55 to-[#0b0e1a]/20" />

        <div className="relative">
          <LiveClock timeZone={mockCity.timeZone}>
            <div className="mt-1 flex items-center gap-1.5">
              <MapPin size={20} className="text-sakura" />
              <span className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {mockCity.name}
              </span>
            </div>
            <p className="ml-7 font-jp text-sm text-foreground/60">
              {mockCity.nameJa}
            </p>
          </LiveClock>

          <div className="mt-4 flex items-start gap-2">
            <span className="text-sm">🌸</span>
            <div>
              <p className="font-jp text-sm text-foreground/85">
                今日もいい一日を
              </p>
              <p className="text-xs text-muted">Have a great day</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <div className="rounded-xl border border-glass-border bg-glass-bg p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-azure/15 text-azure">
              <Moon size={24} />
            </div>
            <div>
              <p className="text-3xl font-semibold leading-none text-foreground">
                {mockWeather.tempC}°C
              </p>
              <p className="mt-1 text-sm text-muted">{mockWeather.condition}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-glass-border pt-3 text-center">
            {[
              { label: "Humidity", value: `${mockWeather.humidity}%` },
              { label: "Wind", value: `${mockWeather.windMs} m/s` },
              { label: "Feels like", value: `${mockWeather.feelsLikeC}°C` },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-[10px] text-muted">{stat.label}</p>
                <p className="mt-0.5 text-sm font-medium text-foreground">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-xl border border-glass-border bg-glass-bg p-3 text-center">
          {mockForecast.map((day) => {
            const Icon = FORECAST_ICONS[day.icon];
            return (
              <div key={day.day} className="flex flex-col items-center gap-1">
                <Icon size={18} className="text-gold" />
                <p className="text-[11px] text-muted">{day.day}</p>
                <p className="text-xs font-medium tabular-nums text-foreground">
                  {day.high}°/{day.low}°
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
