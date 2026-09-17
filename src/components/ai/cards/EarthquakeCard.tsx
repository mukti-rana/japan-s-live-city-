import { TriangleAlert } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import CardHeader from "@/components/ai/cards/CardHeader";
import type { EarthquakeCardData } from "@/lib/ai/types";

export default function EarthquakeCard({ data }: { data: EarthquakeCardData }) {
  return (
    <GlassCard className="flex w-full max-w-sm flex-col gap-3 p-4">
      <CardHeader icon={TriangleAlert} label="Recent Earthquakes" accent="sakura" />

      {data.events.length === 0 ? (
        <p className="text-xs text-muted">No recent significant earthquakes reported.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {data.events.slice(0, 5).map((eq) => (
            <li key={eq.id} className="border-b border-glass-border pb-2 last:border-0 last:pb-0">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-medium text-foreground">{eq.location}</span>
                <span className="text-sakura">M{eq.magnitude}</span>
              </div>
              <p className="mt-0.5 text-[10px] text-muted">
                Depth {eq.depthKm}km · Max intensity {eq.maxIntensity} · Tsunami: {eq.tsunami}
              </p>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[9px] text-muted/70">{data.source}</p>
    </GlassCard>
  );
}
