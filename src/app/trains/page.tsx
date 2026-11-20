import type { Metadata } from "next";
import Reveal from "@/components/ui/Reveal";
import PageHero from "@/components/page/PageHero";
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
        <PageHero labelKey="footer.demoData" titleKey="trains.title" introKey="trains.subtitle" />

        <Reveal delay={0.06}>
          <TrainAssistant />
        </Reveal>
      </div>
    </LiveLocationProvider>
  );
}
