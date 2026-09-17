import { Newspaper } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import CardHeader from "@/components/ai/cards/CardHeader";
import type { NewsCardData } from "@/lib/ai/types";

export default function NewsCard({ data }: { data: NewsCardData }) {
  return (
    <GlassCard className="flex w-full max-w-sm flex-col gap-2 p-4">
      <CardHeader icon={Newspaper} label="Latest News" accent="azure" />
      <ul className="flex flex-col gap-2">
        {data.items.map((item) => (
          <li key={item.link} className="border-b border-glass-border pb-2 last:border-0 last:pb-0">
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium leading-snug text-foreground hover:text-azure"
            >
              {item.title}
            </a>
            <p className="mt-0.5 text-[10px] text-muted">
              {item.source} · {new Date(item.publishedAt).toLocaleDateString()}
            </p>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
