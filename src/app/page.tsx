import type { ReactNode } from "react";
import HeroCard from "@/components/home/HeroCard";
import AlwaysAliveCard from "@/components/home/AlwaysAliveCard";
import LiveWeatherCard from "@/components/home/LiveWeatherCard";
import LiveCityCamCard from "@/components/home/LiveCityCamCard";
import Reveal from "@/components/ui/Reveal";
import JapanMapWidget from "@/components/home/widgets/JapanMapWidget";
import TrainListWidget from "@/components/home/widgets/TrainListWidget";
import NewsWidget from "@/components/home/widgets/NewsWidget";
import EventsListWidget from "@/components/home/widgets/EventsListWidget";
import ExploreJapanWidget from "@/components/home/widgets/ExploreJapanWidget";
import TrendingWidget from "@/components/home/widgets/TrendingWidget";
import WeatherSunWidget from "@/components/home/widgets/WeatherSunWidget";
import QuickAccessWidget from "@/components/home/widgets/QuickAccessWidget";
import WelcomeGate from "@/components/auth/WelcomeGate";
import { LiveLocationProvider } from "@/lib/geo/LiveLocationContext";

// One master grid. Spacing comes in two tiers — 16/20 px between cards that
// belong together, 24/32 px between the page's main rows — and everything
// sits inside the same centred container so left and right edges line up.
// Cards in a row stretch to the same height, but none has a fixed height, so
// each simply grows with its content.
function Cell({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <Reveal delay={delay} className={`h-full min-w-0 [&>*]:h-full ${className}`}>
      {children}
    </Reveal>
  );
}

export default function Home() {
  return (
    <LiveLocationProvider>
      <WelcomeGate />
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 lg:gap-8">
        {/* Where you are, what time it is, the AI, and the weather — one connected unit */}
        <div className="flex flex-col gap-4">
          <Cell>
            <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-glass-border bg-panel xl:grid-cols-[3fr_1fr]">
              <HeroCard />
              <div className="hidden border-l border-glass-border xl:block">
                <AlwaysAliveCard />
              </div>
            </div>
          </Cell>
          <Cell delay={0.08}>
            <LiveWeatherCard />
          </Cell>
        </div>

        {/* The map and the live window into Japan — a matched pair */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[3fr_2fr] lg:gap-5">
          <Cell delay={0.12}>
            <JapanMapWidget />
          </Cell>
          <Cell delay={0.16}>
            <LiveCityCamCard />
          </Cell>
        </div>

        {/* Getting around, what's being reported, what's on */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[1.25fr_1fr_1fr] lg:gap-5">
          <Cell delay={0.2}>
            <TrainListWidget />
          </Cell>
          <Cell delay={0.24}>
            <NewsWidget />
          </Cell>
          <Cell delay={0.28} className="md:col-span-2 xl:col-span-1">
            <EventsListWidget limit={4} />
          </Cell>
        </div>

        {/* Discover, and the everyday tools */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr] lg:gap-5">
          <Cell delay={0.32}>
            <ExploreJapanWidget />
          </Cell>
          <Cell delay={0.36}>
            <QuickAccessWidget />
          </Cell>
        </div>

        {/* Secondary information */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-5">
          <Cell delay={0.4}>
            <TrendingWidget />
          </Cell>
          <Cell delay={0.44}>
            <WeatherSunWidget />
          </Cell>
        </div>
      </div>
    </LiveLocationProvider>
  );
}
