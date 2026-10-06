import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/siteUrl";
import { CITIES } from "@/lib/data/cities";

// Only real, content-bearing public pages — no account pages, and no
// auto-generated filler pages.
const PUBLIC_PATHS = [
  "/",
  "/map",
  "/explore",
  "/trains",
  "/weather",
  "/news",
  "/events",
  "/trending",
  "/cities",
  "/earthquakes",
  "/emergency",
  "/yen-converter",
  "/salary-calculator",
  "/rent-calculator",
  "/jlpt",
  "/jlpt/n5",
  "/jlpt/n4",
  "/jlpt/n3",
  "/jlpt/n2",
  "/jlpt/n1",
  "/explain-japanese",
  "/sign-assistant",
  "/ai-assistant",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [...PUBLIC_PATHS, ...CITIES.map((city) => `/${city.slug}`)];
  return paths.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
  }));
}
