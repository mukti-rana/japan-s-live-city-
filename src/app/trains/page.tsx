import type { Metadata } from "next";
import Reveal from "@/components/ui/Reveal";
import CityTrainPanel from "@/components/city/CityTrainPanel";
import { CITIES } from "@/lib/data/cities";

export const metadata: Metadata = {
  title: "Train Status — Live City Japan",
  description: "Train line status across major Japanese cities.",
};

export default function TrainsPage() {
  return (
    <div className="flex flex-col gap-5">
      <Reveal>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-sakura">
            Live
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Train Status
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted">
            Line status across major cities. Demo data for now — a live feed
            will replace this once a train-data provider is connected.
          </p>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CITIES.map((city, i) => (
          <Reveal key={city.slug} delay={0.06 + i * 0.06}>
            <CityTrainPanel city={city.slug} />
          </Reveal>
        ))}
      </div>
    </div>
  );
}
