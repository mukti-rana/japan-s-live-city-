import { TrainFront } from "lucide-react";
import WidgetFrame from "@/components/home/WidgetFrame";
import type { CitySlug } from "@/lib/data/cities";
import { CITY_TRAIN_LINES } from "@/lib/data/cities";

export default function CityTrainPanel({ city }: { city: CitySlug }) {
  const lines = CITY_TRAIN_LINES[city];

  return (
    <WidgetFrame
      icon={TrainFront}
      label="Train Status"
      accent="azure"
      action={
        <span className="rounded-full border border-glass-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
          Demo data
        </span>
      }
    >
      <ul className="flex flex-col">
        {lines.map((line) => (
          <li
            key={line.name}
            className="flex items-center gap-2.5 border-b border-glass-border py-2.5 last:border-0"
          >
            <span
              className="h-6 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: line.color }}
            />
            <span className="min-w-0 flex-1 truncate text-sm text-foreground">
              {line.name}
            </span>
            <span
              className={`shrink-0 text-xs font-medium ${
                line.status === "Normal" ? "text-mint" : "text-gold"
              }`}
            >
              {line.status}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-[11px] text-muted">
        Placeholder line statuses — a live feed will replace this once a
        train-data provider is connected.
      </p>
    </WidgetFrame>
  );
}
