import type { Metadata } from "next";
import Reveal from "@/components/ui/Reveal";
import AssistantForm from "@/components/ai/AssistantForm";

export const metadata: Metadata = {
  title: "Japan AI Assistant — Live City Japan",
  description:
    "Get help writing polite Japanese for work, school, and daily life — with hiragana and English translation.",
};

export default function AiAssistantPage() {
  const configured = Boolean(process.env.ANTHROPIC_API_KEY);

  return (
    <div className="flex flex-col gap-5">
      <Reveal>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-sakura">
            AI
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Japan AI Assistant
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted">
            Describe what you need to say — get polite Japanese, hiragana,
            and an English translation.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <AssistantForm configured={configured} />
      </Reveal>
    </div>
  );
}
