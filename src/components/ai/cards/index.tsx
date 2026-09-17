import type { CardData } from "@/lib/ai/types";
import WeatherCard from "@/components/ai/cards/WeatherCard";
import TrainCard from "@/components/ai/cards/TrainCard";
import EarthquakeCard from "@/components/ai/cards/EarthquakeCard";
import PlacesCard from "@/components/ai/cards/PlacesCard";
import EventsCard from "@/components/ai/cards/EventsCard";
import NewsCard from "@/components/ai/cards/NewsCard";
import TrendingCard from "@/components/ai/cards/TrendingCard";
import ItineraryCard from "@/components/ai/cards/ItineraryCard";
import SourcesCard from "@/components/ai/cards/SourcesCard";

export default function CardRenderer({ card }: { card: CardData }) {
  switch (card.kind) {
    case "weather":
      return <WeatherCard data={card.data} />;
    case "train":
      return <TrainCard data={card.data} />;
    case "earthquake":
      return <EarthquakeCard data={card.data} />;
    case "places":
      return <PlacesCard data={card.data} />;
    case "events":
      return <EventsCard data={card.data} />;
    case "news":
      return <NewsCard data={card.data} />;
    case "trending":
      return <TrendingCard data={card.data} />;
    case "itinerary":
      return <ItineraryCard data={card.data} />;
    case "sources":
      return <SourcesCard data={card.data} />;
  }
}
