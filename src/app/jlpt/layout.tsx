import type { Metadata } from "next";
import Reveal from "@/components/ui/Reveal";
import LevelTabs from "@/components/quiz/LevelTabs";

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
            Student
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            JLPT Practice
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted">
            Quick multiple-choice questions from N5 to N1. Demo question set —
            more are on the way.
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
