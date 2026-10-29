export type NewsLanguage = "en" | "ja";

// What a story is mainly about. Set from the publisher's own section where it
// gives one, and from plain keyword rules in the headline/summary otherwise.
export type TopicId =
  | "politics"
  | "economy"
  | "tech"
  | "transport"
  | "weather"
  | "earthquake"
  | "crime"
  | "society"
  | "sports"
  | "entertainment"
  | "travel"
  | "science"
  | "general";

export interface ArticleVideo {
  provider: "youtube";
  videoId: string;
  channel: string;
}

// One story in the common format every provider is converted into.
export interface Article {
  id: string;
  title: string;
  // The publisher's own description, as plain text and shortened. Never
  // rewritten — see summaryOf() in normalize.ts.
  summary: string | null;
  url: string;
  sourceId: string;
  sourceName: string;
  language: NewsLanguage;
  publishedAt: string;
  topic: TopicId;
  scope: "japan" | "international";
  asia: boolean;
  // Prefecture ids named in the headline or summary.
  places: string[];
  // True for stories the publisher put in its top-headlines feed, or marked
  // as breaking in the headline.
  breaking: boolean;
  imageUrl: string | null;
  video: ArticleVideo | null;
}

export interface SourceStatus {
  id: string;
  name: string;
  ok: boolean;
  count: number;
  error?: string;
}
