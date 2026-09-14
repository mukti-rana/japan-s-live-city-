import { notFound } from "next/navigation";
import Reveal from "@/components/ui/Reveal";
import CityWeatherHero from "@/components/city/CityWeatherHero";
import CityTrainPanel from "@/components/city/CityTrainPanel";
import { CITIES, getCity } from "@/lib/data/cities";
import { getWeather } from "@/lib/services/weather";

export function generateStaticParams() {
  return CITIES.map(({ slug }) => ({ city: slug }));
}

export async function generateMetadata({ params }: PageProps<"/[city]">) {
  const { city: slug } = await params;
  const city = getCity(slug);
  if (!city) return {};
  return {
    title: `Live City ${city.name} — Live City Japan`,
    description: `Live weather and train status for ${city.name}, Japan.`,
  };
}

export default async function CityPage({ params }: PageProps<"/[city]">) {
  const { city: slug } = await params;
  const city = getCity(slug);
  if (!city) notFound();

  const weather = await getWeather(city.lat, city.lon).catch(() => null);

  return (
    <div className="flex flex-col gap-4">
      <Reveal>
        <CityWeatherHero city={city} weather={weather} />
      </Reveal>
      <Reveal delay={0.08}>
        <div className="max-w-md">
          <CityTrainPanel city={city.slug} />
        </div>
      </Reveal>
    </div>
  );
}
