import type { Metadata } from "next";
import Reveal from "@/components/ui/Reveal";
import T from "@/components/i18n/T";
import HeroAIBox from "@/components/home/HeroAIBox";
import ExploreDiscovery from "@/components/explore/ExploreDiscovery";
import ExploreNearYou from "@/components/explore/ExploreNearYou";
import { getPopularPlaces } from "@/lib/services/places";
import { LiveLocationProvider } from "@/lib/geo/LiveLocationContext";

export const metadata: Metadata = {
  title: "Explore Japan — Live City Japan",
  description:
    "Discover famous places, hidden gems, local culture & things to do across Japan.",
};

export default async function ExplorePage() {
  const places = await getPopularPlaces();

  return (
    <LiveLocationProvider>
      <div className="flex flex-col gap-5">
        <Reveal>
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-sakura">
              🇯🇵 <T k="explore.allJapan" />
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              <T k="explore.title" />
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-muted">
              <T k="explore.subtitle" />
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
          <Reveal delay={0.06}>
            <ExploreDiscovery places={places} />
          </Reveal>

          <div className="flex flex-col gap-5">
            <Reveal delay={0.1}>
              <ExploreNearYou places={places} />
            </Reveal>
            <Reveal delay={0.14}>
              <div className="overflow-hidden rounded-2xl border border-glass-border bg-panel p-1">
                <HeroAIBox />
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </LiveLocationProvider>
  );
}
