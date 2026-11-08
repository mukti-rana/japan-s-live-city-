import type { Metadata } from "next";
import TrendRadarPage from "@/components/trends/TrendRadarPage";
import { getTrendRadar } from "@/lib/services/trendRadar";

export const metadata: Metadata = {
  title: "Trending — Live City Japan",
  description: "Japan Trend Radar: the most-viewed Japanese Wikipedia articles, with pictures, explanations and sources.",
};

// The same data (and the same server cache) as the Home page's Trend Radar,
// fetched here so the page arrives with it.
export default async function TrendingPage() {
  const initial = await getTrendRadar().catch(() => null);
  return <TrendRadarPage initial={initial} />;
}
