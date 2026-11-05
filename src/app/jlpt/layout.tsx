import type { Metadata } from "next";
import Reveal from "@/components/ui/Reveal";
import LevelTabs from "@/components/quiz/LevelTabs";
import Tx from "@/components/i18n/Tx";

export const metadata: Metadata = {
  title: "JLPT Practice — Live City Japan",
  description:
    "Practice JLPT N5 to N1 with quick multiple-choice vocabulary and grammar questions.",
};

export default function JlptLayout({ children }: LayoutProps<"/jlpt">) {
  return (
    <div className="flex flex-col gap-5">
      <Reveal>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-sakura">
            <Tx en="Student" />
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            <Tx en="JLPT Practice" />
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted">
            <Tx en="Quick multiple-choice questions from N5 to N1. Demo question set — more are on the way." />
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.06}>
        <LevelTabs />
      </Reveal>

      {children}
    </div>
  );
}
