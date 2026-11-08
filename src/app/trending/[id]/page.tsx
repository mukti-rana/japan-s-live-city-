import type { Metadata } from "next";
import TopicDetail from "@/components/trends/TopicDetail";
import { findTopic, getTopicHistory, getTrendRadar } from "@/lib/services/trendRadar";

export const metadata: Metadata = { title: "Trend topic — Live City Japan" };

export default async function TopicPage({ params }: PageProps<"/trending/[id]">) {
  const { id } = await params;
  const articleId = decodeURIComponent(id);
  const data = await getTrendRadar().catch(() => null);
  const topic = data ? findTopic(data, articleId) : undefined;
  const history = data && topic ? await getTopicHistory(topic.id, data.dataDate) : [];
  const related = data && topic ? data.items.filter((t) => t.id !== topic.id && topic.category && t.category === topic.category).slice(0, 4) : [];
  // Without a category, the neighbours in the ranking stand in as related topics.
  const neighbours = data && topic && related.length === 0 ? data.items.filter((t) => t.id !== topic.id && Math.abs(t.rank - topic.rank) <= 2).slice(0, 4) : [];
  return <TopicDetail topic={topic ?? null} data={data} history={history} related={related.length ? related : neighbours} unavailable={!data} />;
}
