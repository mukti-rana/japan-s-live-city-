import { Link2, ExternalLink } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import CardHeader from "@/components/ai/cards/CardHeader";
import type { SourcesCardData } from "@/lib/ai/types";

export default function SourcesCard({ data }: { data: SourcesCardData }) {
  if (data.webResults.length === 0 && data.internalSources.length === 0) return null;

  return (
    <GlassCard className="flex w-full max-w-sm flex-col gap-2 p-4">
      <CardHeader icon={Link2} label="Sources" accent="azure" />
      <ul className="flex flex-col gap-1.5">
        {data.internalSources.map((source) => (
          <li key={source.tool} className="flex items-center gap-2 text-xs text-muted">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${source.isLive ? "bg-mint" : "bg-gold"}`} />
            {source.label}
          </li>
        ))}
        {data.webResults.map((link) => (
          <li key={link.url}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 text-xs text-azure hover:underline"
            >
              <ExternalLink size={12} className="mt-0.5 shrink-0" />
              <span className="line-clamp-1">{link.title || link.url}</span>
            </a>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
