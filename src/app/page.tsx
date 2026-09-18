import HeroCard from "@/components/home/HeroCard";
import AlwaysAliveCard from "@/components/home/AlwaysAliveCard";
import AIAssistantCard from "@/components/home/AIAssistantCard";
import LiveWeatherCard from "@/components/home/LiveWeatherCard";
import Reveal from "@/components/ui/Reveal";
import JapanMapWidget from "@/components/home/widgets/JapanMapWidget";
import TrainListWidget from "@/components/home/widgets/TrainListWidget";
import NewsWidget from "@/components/home/widgets/NewsWidget";
import EventsListWidget from "@/components/home/widgets/EventsListWidget";
import PopularPlacesWidget from "@/components/home/widgets/PopularPlacesWidget";
import TrendingWidget from "@/components/home/widgets/TrendingWidget";
import WeatherSunWidget from "@/components/home/widgets/WeatherSunWidget";
import QuickAccessWidget from "@/components/home/widgets/QuickAccessWidget";
import { LiveLocationProvider } from "@/lib/geo/LiveLocationContext";

const COLUMNS = [
  [JapanMapWidget, PopularPlacesWidget],
  [TrainListWidget, TrendingWidget],
  [NewsWidget, WeatherSunWidget],
  [EventsListWidget, QuickAccessWidget],
];

export default function Home() {
  return (
    <LiveLocationProvider>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[3fr_1fr]">
          <Reveal>
            <HeroCard />
          </Reveal>
          <Reveal delay={0.08}>
            <AlwaysAliveCard />
          </Reveal>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.3fr_1fr]">
          <Reveal delay={0.1}>
            <AIAssistantCard />
          </Reveal>
          <Reveal delay={0.14}>
            <LiveWeatherCard />
          </Reveal>
        </div>

        <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((column, columnIndex) => (
            <div key={columnIndex} className="flex flex-col gap-3">
              {column.map((WidgetComponent, rowIndex) => (
                <Reveal
                  key={WidgetComponent.name}
                  delay={0.2 + columnIndex * 0.06 + rowIndex * 0.1}
                >
                  <WidgetComponent />
                </Reveal>
              ))}
            </div>
          ))}
        </div>
      </div>
    </LiveLocationProvider>
  );
}
