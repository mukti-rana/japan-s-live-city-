import { Newspaper } from "lucide-react";
import WidgetFrame from "@/components/home/WidgetFrame";
import Thumb from "@/components/ui/Thumb";
import { mockNews } from "@/lib/mock/dashboard";

export default function NewsWidget() {
  return (
    <WidgetFrame icon={Newspaper} label="Latest News" accent="azure" viewAll>
      <ul className="flex flex-col">
        {mockNews.map((item) => (
          <li
            key={item.headline}
            className="flex gap-3 border-b border-glass-border py-2.5 last:border-0"
          >
            <Thumb
              gradient={item.gradient}
              icon={Newspaper}
              src={item.image}
              alt={item.headline}
              className="h-14 w-16"
            />
            <div className="min-w-0">
              <p className="text-[11px] text-muted">{item.time}</p>
              <p className="mt-0.5 text-xs font-medium leading-snug text-foreground">
                {item.headline}
              </p>
              <p className="mt-1 text-[10px] text-muted">{item.category}</p>
            </div>
          </li>
        ))}
      </ul>
    </WidgetFrame>
  );
}
