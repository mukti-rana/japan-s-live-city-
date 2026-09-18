import type { Metadata } from "next";
import Reveal from "@/components/ui/Reveal";
import ChatAssistant from "@/components/ai/ChatAssistant";

export const metadata: Metadata = {
  title: "LIVE CITY AI — Live City Japan",
  description:
    "A live window into Japan — ask about weather, trains, festivals, places, news, or plan a trip, with real sources.",
};

export default async function AiAssistantPage({ searchParams }: PageProps<"/ai-assistant">) {
  const configured = Boolean(process.env.ANTHROPIC_API_KEY);
  const { q } = await searchParams;
  const initialQuery = Array.isArray(q) ? q[0] : q;

  return (
    <div className="flex flex-col gap-5">
      <Reveal>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-sakura">LIVE CITY AI</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            A live window into Japan
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted">
            Ask anything about Japan — weather, trains, festivals, places, news, or a full trip
            plan. LIVE CITY AI researches live data and the web, and always shows its sources.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <ChatAssistant configured={configured} initialQuery={initialQuery} />
      </Reveal>
    </div>
  );
}
