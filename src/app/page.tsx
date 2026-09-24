import HeroCard from "@/components/home/HeroCard";
import AlwaysAliveCard from "@/components/home/AlwaysAliveCard";
import LiveWeatherCard from "@/components/home/LiveWeatherCard";
import LiveCityCamCard from "@/components/home/LiveCityCamCard";
import OpsReveal from "@/components/home/OpsReveal";
import JapanMapWidget from "@/components/home/widgets/JapanMapWidget";
import TrainListWidget from "@/components/home/widgets/TrainListWidget";
import NewsWidget from "@/components/home/widgets/NewsWidget";
import EventsListWidget from "@/components/home/widgets/EventsListWidget";
import ExploreJapanWidget from "@/components/home/widgets/ExploreJapanWidget";
import TrendingWidget from "@/components/home/widgets/TrendingWidget";
import WeatherSunWidget from "@/components/home/widgets/WeatherSunWidget";
import QuickAccessWidget from "@/components/home/widgets/QuickAccessWidget";
import { LiveLocationProvider } from "@/lib/geo/LiveLocationContext";

const COLUMNS = [
  [TrainListWidget, ExploreJapanWidget],
  [NewsWidget, TrendingWidget],
  [EventsListWidget, WeatherSunWidget],
  [QuickAccessWidget],
];

export default function Home() {
  return (
    <LiveLocationProvider>
      <div className="ops-home flex flex-col gap-2">
        <div className="grid grid-cols-1 gap-2 xl:grid-cols-[3fr_1fr]">
          <OpsReveal>
            <HeroCard />
          </OpsReveal>
          <OpsReveal delay={0.08}>
            <AlwaysAliveCard />
          </OpsReveal>
        </div>

        <OpsReveal delay={0.1}>
          <LiveWeatherCard />
        </OpsReveal>

        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          <OpsReveal delay={0.16}>
            <JapanMapWidget />
          </OpsReveal>
          <OpsReveal delay={0.18}>
            <LiveCityCamCard />
          </OpsReveal>
        </div>

        <div className="grid grid-cols-1 items-start gap-2 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((column, columnIndex) => (
            <div key={columnIndex} className="flex flex-col gap-2">
              {column.map((WidgetComponent, rowIndex) => (
                <OpsReveal
                  key={WidgetComponent.name}
                  delay={0.22 + columnIndex * 0.06 + rowIndex * 0.1}
                >
                  <WidgetComponent />
                </OpsReveal>
              ))}
            </div>
          ))}
        </div>
      </div>
    </LiveLocationProvider>
  );
}
