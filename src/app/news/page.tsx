import type { Metadata } from "next";
import Reveal from "@/components/ui/Reveal";
import NewsWidget from "@/components/home/widgets/NewsWidget";

export const metadata: Metadata = {
  title: "News — Live City Japan",
  description: "Latest news headlines relevant to life in Japan.",
};

export default function NewsPage() {
  return (
    <div className="flex flex-col gap-5">
      <Reveal>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-sakura">
            Live
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            News
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted">
            Headlines relevant to life, work, and travel in Japan.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <div className="max-w-md">
          <NewsWidget />
        </div>
      </Reveal>
    </div>
  );
}
