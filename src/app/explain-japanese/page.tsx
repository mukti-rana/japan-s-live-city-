import type { Metadata } from "next";
import Reveal from "@/components/ui/Reveal";
import ExplainJapaneseForm from "@/components/explain-japanese/ExplainJapaneseForm";
import Tx from "@/components/i18n/Tx";

export const metadata: Metadata = {
  title: "Explain Japanese — Live City Japan",
  description: "Paste Japanese text and get a clear translation and explanation in your language.",
};

export default function ExplainJapanesePage() {
  const configured = Boolean(process.env.ANTHROPIC_API_KEY);

  return (
    <div className="flex flex-col gap-5">
      <Reveal>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-sakura">
            <Tx en="LIVE CITY AI" />
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            <Tx en="Explain Japanese" />
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted">
            <Tx en="Paste any Japanese text — a sign, a message, a menu — and get a clear translation and explanation in your selected language." />
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <ExplainJapaneseForm configured={configured} />
      </Reveal>
    </div>
  );
}
