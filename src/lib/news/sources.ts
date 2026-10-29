import type { NewsLanguage, TopicId } from "@/lib/news/types";

// Every provider the news pages read from. Adding a source later means adding
// an entry here — the rest of the pipeline (parsing, categories, places,
// duplicates, filters) is shared.
//
// Only free, public feeds that publishers offer for linking are used: we
// show the headline, a short excerpt, the publisher's own preview image and a
// link back. We never copy full articles. Nothing here needs an API key.
//
// Not used, on purpose:
//  • Nikkei Asia — its feed terms limit use to personal, non-commercial readers.
//  • Asahi Shimbun — its feed forbids republication.
//  • The Japan News (Yomiuri) — its server now blocks automated requests with
//    a bot challenge, and we do not work around that.
//  • Reuters — no public RSS any more.
//  • BBC — its RSS terms are for personal, non-commercial use only.

export interface FeedConfig {
  url: string;
  // What the publisher's own section means, if it has one.
  topic?: TopicId;
  scope?: "japan" | "international";
  asia?: boolean;
  // The publisher's top-headlines feed: its stories count as "breaking".
  top?: boolean;
}

export interface SourceDef {
  id: string;
  name: string;
  language: NewsLanguage;
  // Article links must be on one of these domains.
  hosts: string[];
  // Whether to read the publisher's preview image (og:image) from the article
  // page when the feed has no image. Done only for stories being displayed.
  previewImage: boolean;
  feeds: FeedConfig[];
}

const NHK = (n: number) => `https://news.web.nhk/n-data/conf/na/rss/cat${n}.xml`;
const JT = (section: string) => `https://www.japantimes.co.jp/${section}/feed/`;

export const NEWS_SOURCES: SourceDef[] = [
  {
    id: "nhk",
    name: "NHK",
    language: "ja",
    hosts: ["news.web.nhk", "www3.nhk.or.jp", "www.nhk.or.jp"],
    previewImage: true,
    feeds: [
      { url: NHK(0), top: true },
      { url: NHK(1), topic: "society" },
      { url: NHK(2), topic: "society" },
      // 科学・文化 mixes science and culture, so keyword rules decide each story.
      { url: NHK(3), topic: "general" },
      { url: NHK(4), topic: "politics" },
      { url: NHK(5), topic: "economy" },
      { url: NHK(6), scope: "international" },
      { url: NHK(7), topic: "sports" },
    ],
  },
  {
    id: "japan-times",
    name: "The Japan Times",
    language: "en",
    hosts: ["japantimes.co.jp"],
    previewImage: false,
    feeds: [
      { url: JT("news") },
      { url: JT("national"), topic: "society" },
      { url: JT("politics"), topic: "politics" },
      { url: JT("business"), topic: "economy" },
      { url: JT("sports"), topic: "sports" },
      { url: JT("life"), topic: "society" },
      { url: JT("culture"), topic: "entertainment" },
      { url: JT("world"), scope: "international" },
    ],
  },
  {
    id: "japan-today",
    name: "Japan Today",
    language: "en",
    hosts: ["japantoday.com"],
    previewImage: true,
    feeds: [{ url: "https://japantoday.com/feed/atom" }],
  },
  {
    id: "dw",
    name: "DW",
    language: "en",
    hosts: ["dw.com"],
    previewImage: true,
    feeds: [{ url: "https://rss.dw.com/rdf/rss-en-asia", scope: "international", asia: true }],
  },
  {
    id: "aljazeera",
    name: "Al Jazeera",
    language: "en",
    hosts: ["aljazeera.com"],
    previewImage: true,
    feeds: [{ url: "https://www.aljazeera.com/xml/rss/all.xml", scope: "international" }],
  },
];

// Official YouTube channels of news organisations. YouTube publishes a free
// feed for every channel, and the videos are shown with YouTube's own
// embeddable player — nothing is downloaded or re-hosted.
export interface VideoChannel {
  channelId: string;
  name: string;
  language: NewsLanguage;
  scope: "japan" | "international";
  asia?: boolean;
}

export const VIDEO_CHANNELS: VideoChannel[] = [
  { channelId: "UCuTAXTexrhetbOe3zgskJBQ", name: "日テレNEWS", language: "ja", scope: "japan" },
  { channelId: "UCGCZAYq5Xxojl_tSXcVJhiQ", name: "ANNnewsCH", language: "ja", scope: "japan" },
  { channelId: "UC6AG81pAkf6Lbi_1VC5NmPA", name: "TBS NEWS DIG", language: "ja", scope: "japan" },
  { channelId: "UCoQBJMzcwmXrRSHBFAlTsIw", name: "FNNプライムオンライン", language: "ja", scope: "japan" },
  { channelId: "UCknLrEdhRCp1aegoMqRaCZg", name: "DW News", language: "en", scope: "international" },
  { channelId: "UCNye-wNBqNL5ZzHSJj3l8Bg", name: "Al Jazeera English", language: "en", scope: "international" },
];

export function getSource(id: string): SourceDef | undefined {
  return NEWS_SOURCES.find((s) => s.id === id);
}

// Source ids as shown in the source filter, including the video channels.
export interface SourceOption {
  id: string;
  name: string;
}

export const SOURCE_OPTIONS: SourceOption[] = [
  ...NEWS_SOURCES.map((s) => ({ id: s.id, name: s.name })),
  ...VIDEO_CHANNELS.map((c) => ({ id: `yt:${c.channelId}`, name: c.name })),
];
