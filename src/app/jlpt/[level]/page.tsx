import { notFound } from "next/navigation";
import Reveal from "@/components/ui/Reveal";
import QuizCard from "@/components/quiz/QuizCard";
import { JLPT_LEVELS, JLPT_QUESTIONS, type JlptLevel } from "@/lib/quiz/jlptQuestions";

export function generateStaticParams() {
  return JLPT_LEVELS.map(({ level }) => ({ level }));
}

export async function generateMetadata({ params }: PageProps<"/jlpt/[level]">) {
  const { level } = await params;
  const label = level.toUpperCase();
  return {
    title: `JLPT ${label} Practice — Live City Japan`,
    description: `Practice JLPT ${label} vocabulary and grammar with quick multiple-choice questions.`,
  };
}

export default async function JlptLevelPage({ params }: PageProps<"/jlpt/[level]">) {
  const { level } = await params;
  const questions = JLPT_QUESTIONS[level as JlptLevel];

  if (!questions) notFound();

  return (
    <Reveal delay={0.12}>
      <QuizCard key={level} level={level as JlptLevel} questions={questions} />
    </Reveal>
  );
}
