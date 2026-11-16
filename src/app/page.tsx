import Chapter from "@/components/home/cinematic/Chapter";
import ChapterRail from "@/components/home/cinematic/ChapterRail";
import BackdropBand from "@/components/home/cinematic/BackdropBand";
import CommunityChapter from "@/components/home/cinematic/CommunityChapter";
import HomeFooterIndex from "@/components/home/cinematic/HomeFooterIndex";
import HomeHero from "@/components/home/cinematic/HomeHero";
import SafetyStrip from "@/components/home/cinematic/SafetyStrip";
import ScrollReveal from "@/components/home/cinematic/ScrollReveal";
import WhereTo from "@/components/home/cinematic/WhereTo";
import YourDayStrip from "@/components/home/cinematic/YourDayStrip";
import { homeFontVars } from "@/components/home/cinematic/fonts";
import JapanNowCard from "@/components/home/JapanNowCard";
import LiveCityCamCard from "@/components/home/LiveCityCamCard";
import LiveWeatherCard from "@/components/home/LiveWeatherCard";
import QuickDock from "@/components/home/QuickDock";
import TrendRadarSection from "@/components/home/TrendRadarSection";
import JapanMapWidget from "@/components/home/widgets/JapanMapWidget";
import QuickAccessWidget from "@/components/home/widgets/QuickAccessWidget";
import TrainListWidget from "@/components/home/widgets/TrainListWidget";
import HeadlinesMini from "@/components/news/HeadlinesMini";
import LatestNewsNearYou from "@/components/news/LatestNewsNearYou";
import EmergencyPreview from "@/components/emergency/EmergencyPreview";
import EventsNearYou from "@/components/events/EventsNearYou";
import WelcomeGate from "@/components/auth/WelcomeGate";
import { HOME_PHOTOS } from "@/lib/data/homePhotos";
import { LiveLocationProvider } from "@/lib/geo/LiveLocationContext";

// The chapters, for the progress rail on wide screens.
const CHAPTERS = [
  { id: "top", label: "Japan, right now" },
  { id: "now", label: "Right now" },
  { id: "where", label: "Where to?" },
  { id: "live", label: "A live window" },
  { id: "news", label: "Today in Japan" },
  { id: "trains", label: "Getting around" },
  { id: "community", label: "Community" },
  { id: "tools", label: "Tools & safety" },
];

// A pitch-black, vertically scrolling page of chapters. Every card on it is the same
// working widget the old home page held — same data, same live / demo / empty / error
// states — now set between large headings and photographs. [data-home-root] keeps the
// page, top bar and footer dark in both themes (see pages/home.md).
export default function Home() {
  return (
    <LiveLocationProvider>
      <WelcomeGate />
      <div data-home-root className={`${homeFontVars} relative bg-black text-foreground`}>
        <ChapterRail chapters={CHAPTERS} />

        {/* 01 — the first screen, then Your Day as a slim strip */}
        <HomeHero />
        <YourDayStrip />

        {/* 02 — weather, official alerts, what's on */}
        <Chapter id="now" number="02" label="Live" heading="Right now" intro="Weather, official alerts and what is on today." href="/weather" linkLabel="Weather">
          <div className="flex flex-col gap-4">
            <ScrollReveal>
              <LiveWeatherCard />
            </ScrollReveal>
            <ScrollReveal className="grid grid-cols-1 gap-4 lg:grid-cols-2 [&>*]:min-w-0">
              <EmergencyPreview />
              <EventsNearYou />
            </ScrollReveal>
          </div>
        </Chapter>

        {/* 03 — places, then personalised discovery */}
        <WhereTo />

        {/* 04 — the map and a real camera */}
        <BackdropBand photo={HOME_PHOTOS.hakodate}>
          <Chapter id="live" number="04" label="Live" heading="A live window" intro="The map of Japan, and a real camera on Shibuya Crossing." href="/map" linkLabel="Open the map">
            <ScrollReveal className="grid grid-cols-1 gap-4 md:grid-cols-[3fr_2fr] [&>*]:min-w-0">
              <JapanMapWidget />
              <LiveCityCamCard />
            </ScrollReveal>
          </Chapter>
        </BackdropBand>

        {/* 05 — news, the season, what Japan is reading */}
        <Chapter id="news" number="05" label="Read" heading="Today in Japan" intro="Stories from Japan's own publishers, and what people are reading." href="/news" linkLabel="All news">
          <div className="flex flex-col gap-4">
            <ScrollReveal>
              <LatestNewsNearYou />
            </ScrollReveal>
            <ScrollReveal className="grid grid-cols-1 gap-4 lg:grid-cols-[1.25fr_1fr] [&>*]:min-w-0">
              <HeadlinesMini />
              <JapanNowCard />
            </ScrollReveal>
            <ScrollReveal>
              <TrendRadarSection />
            </ScrollReveal>
          </div>
        </Chapter>

        {/* 06 — trains (still labelled DEMO until a live feed is connected) */}
        <Chapter id="trains" number="06" label="Travel" heading="Getting around" href="/trains" linkLabel="Train status" flush>
          <ScrollReveal className="max-w-3xl">
            <TrainListWidget />
          </ScrollReveal>
        </Chapter>

        {/* 07 — the latest real Community posts */}
        <CommunityChapter />

        {/* 08 — tools and the emergency numbers */}
        <Chapter id="tools" number="08" label="Tools" heading="Tools & safety" intro="Calculators, language help and the emergency numbers.">
          <div className="flex flex-col gap-8">
            <ScrollReveal>
              <QuickAccessWidget />
            </ScrollReveal>
            <ScrollReveal>
              <SafetyStrip />
            </ScrollReveal>
          </div>
        </Chapter>

        <HomeFooterIndex />
        <QuickDock />
      </div>
    </LiveLocationProvider>
  );
}
