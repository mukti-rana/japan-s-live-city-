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

// One master grid for the whole page. Every section sits inside the same
// centred container, cards in a row stretch to equal height (so bottoms line
// up), and spacing comes in tiers: tight inside a section, wider between
// sections. Nothing has a fixed height, so cards simply grow with their
// content and the page itself is the only thing that scrolls.
function Cell({
  children,
  delay = 0,
  inView = true,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  inView?: boolean;
  className?: string;
}) {
  return (
    <Reveal delay={delay} inView={inView} className={`h-full min-w-0 [&>*]:h-full ${className}`}>
      {children}
    </Reveal>
  );
}

export default function Home() {
  return (
    <LiveLocationProvider>
      <WelcomeGate />
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 lg:gap-10">
        {/* 1 — First screen: where you are, the time, the AI, then the weather */}
        <section className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[3fr_1fr]">
            <Cell inView={false}>
              <HeroCard />
            </Cell>
            <Cell inView={false} delay={0.08}>
              <AlwaysAliveCard />
            </Cell>
          </div>
          <Cell inView={false} delay={0.1}>
            <LiveWeatherCard />
          </Cell>
        </section>

        {/* 2 — Across Japan: the map and a live view */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Cell>
            <JapanMapWidget />
          </Cell>
          <Cell delay={0.06}>
            <LiveCityCamCard />
          </Cell>
        </section>

        {/* 3 — Getting around and what's being reported */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Cell>
            <TrainListWidget />
          </Cell>
          <div className="flex min-w-0 flex-col gap-4">
            <Cell className="flex-1">
              <NewsWidget />
            </Cell>
            <Cell delay={0.06} className="flex-1">
              <TrendingWidget />
            </Cell>
          </div>
        </section>

        {/* 4 — What's on, with the sun times beside it */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Cell className="lg:col-span-2">
            <EventsListWidget columns={2} />
          </Cell>
          <Cell delay={0.06}>
            <WeatherSunWidget />
          </Cell>
        </section>

        {/* 5 — Discover */}
        <section>
          <Cell>
            <ExploreJapanWidget />
          </Cell>
        </section>

        {/* 6 — Tools */}
        <section>
          <Cell>
            <QuickAccessWidget />
          </Cell>
        </section>
      </div>
    </LiveLocationProvider>
  );
}
