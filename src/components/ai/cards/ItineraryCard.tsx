import { Luggage } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import CardHeader from "@/components/ai/cards/CardHeader";
import type { ItineraryCardData } from "@/lib/ai/types";

export default function ItineraryCard({ data }: { data: ItineraryCardData }) {
  return (
    <GlassCard className="flex w-full max-w-lg flex-col gap-4 p-4">
      <CardHeader icon={Luggage} label={data.title} accent="gold" />
      <div className="flex flex-col gap-4">
        {data.days.map((day) => (
          <div key={day.label}>
            <p className="text-xs font-semibold text-gold">{day.label}</p>
            <ul className="mt-2 flex flex-col gap-2 border-l border-glass-border pl-3">
              {day.items.map((item, i) => (
                <li key={i} className="text-xs">
                  <span className="font-medium text-azure">{item.time}</span>{" "}
                  <span className="text-foreground/90">— {item.title}</span>
                  {item.note && <p className="mt-0.5 text-[10px] text-muted">{item.note}</p>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
