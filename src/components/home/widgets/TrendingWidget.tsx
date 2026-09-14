import { Flame, ArrowUp } from "lucide-react";
import WidgetFrame from "@/components/home/WidgetFrame";
import Thumb from "@/components/ui/Thumb";
import { mockTrending } from "@/lib/mock/dashboard";

export default function TrendingWidget() {
  return (
    <WidgetFrame icon={Flame} label="Trending Now" accent="sakura" viewAll>
      <ol className="flex flex-col">
        {mockTrending.map((item, index) => (
          <li
            key={item.tag}
            className="flex items-center gap-2.5 border-b border-glass-border py-2 last:border-0"
          >
            <span className="w-3 shrink-0 text-xs font-semibold text-muted">
              {index + 1}
            </span>
            <Thumb gradient={item.gradient} className="h-9 w-9" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground">
                {item.tag}
              </p>
              <p className="text-[10px] text-muted">{item.posts}</p>
            </div>
            <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-sakura">
              <ArrowUp size={11} />
              {item.change}
            </span>
          </li>
        ))}
      </ol>
    </WidgetFrame>
  );
}
