import type { Metadata } from "next";
import Reveal from "@/components/ui/Reveal";
import T from "@/components/i18n/T";
import TrainAssistant from "@/components/trains/TrainAssistant";
import { LiveLocationProvider } from "@/lib/geo/LiveLocationContext";

export const metadata: Metadata = {
  title: "Train Status — Live City Japan",
  description: "Japan railway & subway status, journey-focused — demo data until a live operator feed is connected.",
};

export default function TrainsPage() {
  return (
    <LiveLocationProvider>
      <div className="flex flex-col gap-5">
        <Reveal>
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-gold">
              <T k="footer.demoData" />
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              🚆 <T k="trains.title" />
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-muted">
              <T k="trains.subtitle" />
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.06}>
          <TrainAssistant />
        </Reveal>
      </div>
    </LiveLocationProvider>
  );
}
