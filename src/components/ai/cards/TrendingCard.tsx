import { Flame, ExternalLink } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import CardHeader from "@/components/ai/cards/CardHeader";
import type { TrendingCardData } from "@/lib/ai/types";

export default function TrendingCard({ data }: { data: TrendingCardData }) {
  return (
    <GlassCard className="flex w-full max-w-sm flex-col gap-2 p-4">
      <CardHeader icon={Flame} label="Trending in Japan" accent="sakura" />
      <ul className="flex flex-col gap-1.5">
        {data.topics.map((topic) => (
          <li key={topic.rank} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex min-w-0 items-center gap-2">
              <span className="w-4 shrink-0 text-muted">{topic.rank}</span>
              <span className="truncate text-foreground/90">{topic.title}</span>
            </span>
            <a
              href={topic.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center gap-1 text-[10px] text-muted hover:text-azure"
            >
              {topic.viewsLabel}
              <ExternalLink size={10} />
            </a>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
