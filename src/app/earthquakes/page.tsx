import type { Metadata } from "next";
import { Activity, Waves } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import GlassCard from "@/components/ui/GlassCard";
import { getRecentEarthquakes, type EarthquakeEvent } from "@/lib/services/earthquake";

export const metadata: Metadata = {
  title: "Earthquakes — Live City Japan",
  description: "Recent earthquake activity in Japan, from the JMA via P2P Quake.",
};

function severity(maxIntensity: string): "mint" | "gold" | "sakura" {
  if (["5-", "5+", "6-", "6+", "7"].includes(maxIntensity)) return "sakura";
  if (["3", "4"].includes(maxIntensity)) return "gold";
  return "mint";
}

function formatTime(raw: string) {
  const iso = raw.replace(/\//g, "-").replace(" ", "T") + "+09:00";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function EarthquakesPage() {
  const earthquakes = await getRecentEarthquakes(10).catch<EarthquakeEvent[] | null>(() => null);

  return (
    <div className="flex flex-col gap-5">
      <Reveal>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-sakura">
            Live
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Earthquakes
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted">
            Recent seismic activity across Japan, relayed from the JMA
            (Japan Meteorological Agency) via P2P Quake — no invented data.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <GlassCard className="p-5">
          {!earthquakes ? (
            <p className="text-sm text-sakura">
              Live earthquake data couldn&apos;t be loaded right now. Please
              try again shortly.
            </p>
          ) : earthquakes.length === 0 ? (
            <p className="text-sm text-muted">
              No recent significant earthquakes.
            </p>
          ) : (
            <ul className="flex flex-col">
              {earthquakes.map((quake) => {
                const accent = severity(quake.maxIntensity);
                return (
                  <li
                    key={quake.id}
                    className="flex items-center gap-4 border-b border-glass-border py-3.5 last:border-0"
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl text-center ${
                        accent === "sakura"
                          ? "bg-sakura/15 text-sakura"
                          : accent === "gold"
                            ? "bg-gold/15 text-gold"
                            : "bg-mint/15 text-mint"
                      }`}
                    >
                      <span className="text-[9px] leading-none">Shindo</span>
                      <span className="text-sm font-bold leading-tight">
                        {quake.maxIntensity}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-jp text-sm font-medium text-foreground">
                        {quake.location}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
                        <span className="flex items-center gap-1">
                          <Activity size={11} />
                          M{quake.magnitude.toFixed(1)}
                        </span>
                        <span>Depth {quake.depthKm}km</span>
                        <span className="flex items-center gap-1">
                          <Waves size={11} />
                          {quake.tsunami}
                        </span>
                      </p>
                    </div>

                    <span className="shrink-0 text-xs text-muted">
                      {formatTime(quake.time)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="mt-4 text-[11px] text-muted">
            Source: P2P Quake (relaying JMA data). Updated every few minutes.
          </p>
        </GlassCard>
      </Reveal>
    </div>
  );
}
