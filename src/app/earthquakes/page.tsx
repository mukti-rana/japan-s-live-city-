import type { Metadata } from "next";
import Reveal from "@/components/ui/Reveal";
import { getEarthquakeFeed, type QuakeDetail } from "@/lib/services/earthquake";
import Tx from "@/components/i18n/Tx";
import EarthquakeDashboard from "@/components/earthquakes/EarthquakeDashboard";

export const metadata: Metadata = {
  title: "Earthquakes — Live City Japan",
  description: "Recent earthquake activity in Japan, from the JMA via P2P Quake: a live map, every earthquake's details, and what to do.",
};

export default async function EarthquakesPage() {
  const quakes = await getEarthquakeFeed().catch<QuakeDetail[] | null>(() => null);

  return (
    <div className="flex flex-col gap-5">
      <Reveal>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-sakura">
            <Tx en="Live" />
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            <Tx en="Earthquakes" />
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted">
            <Tx en="Recent seismic activity across Japan, relayed from the JMA (Japan Meteorological Agency) via P2P Quake — no invented data." />
          </p>
        </div>
      </Reveal>

      {!quakes ? (
        <p className="text-sm text-sakura">
          <Tx en="Live earthquake data couldn't be loaded right now. Please try again shortly." />
        </p>
      ) : quakes.length === 0 ? (
        <p className="text-sm text-muted">
          <Tx en="No recent significant earthquakes." />
        </p>
      ) : (
        <Reveal delay={0.08}>
          <EarthquakeDashboard initial={quakes} />
        </Reveal>
      )}
    </div>
  );
}
