"use client";

import { useState } from "react";
import { Check, X, RotateCcw, GraduationCap } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import type { JlptLevel, JlptQuestion } from "@/lib/quiz/jlptQuestions";

export default function QuizCard({
  level,
  questions,
}: {
  level: JlptLevel;
  questions: JlptQuestion[];
}) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const question = questions[index];
  const isLast = index === questions.length - 1;
  const answered = selected !== null;

  function selectChoice(choiceIndex: number) {
    if (answered) return;
    setSelected(choiceIndex);
    if (choiceIndex === question.correctIndex) {
      setCorrectCount((c) => c + 1);
    }
  }

  function next() {
    if (isLast) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
  }

  function retry() {
    setIndex(0);
    setSelected(null);
    setCorrectCount(0);
    setFinished(false);
  }

  if (finished) {
    const pct = Math.round((correctCount / questions.length) * 100);
    return (
      <GlassCard className="flex flex-col items-center gap-4 p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sakura/15 text-sakura">
          <GraduationCap size={26} />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted">
            {level.toUpperCase()} results
          </p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-foreground">
            {correctCount} / {questions.length}
          </p>
          <p className="mt-1 text-sm text-muted">{pct}% correct</p>
        </div>
        <button
          type="button"
          onClick={retry}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sakura to-gold px-5 py-2.5 text-sm font-semibold text-background"
        >
          <RotateCcw size={15} />
          Try again
        </button>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="flex flex-col gap-5 p-5 sm:p-6">
      <div>
        <div className="flex items-center justify-between text-xs text-muted">
          <span>
            Question {index + 1} of {questions.length}
          </span>
          <span className="font-medium text-foreground/80">
            {correctCount} correct
          </span>
        </div>
        <div className="mt-2 flex gap-1.5">
          {questions.map((q, i) => (
            <div
              key={q.id}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < index
                  ? "bg-sakura"
                  : i === index
                    ? "bg-gold"
                    : "bg-glass-border"
              }`}
            />
          ))}
        </div>
      </div>

      <p className="font-jp text-lg leading-relaxed text-foreground">
        {question.prompt}
      </p>

      <div className="flex flex-col gap-2.5">
        {question.choices.map((choice, i) => {
          const isCorrect = i === question.correctIndex;
          const isSelected = i === selected;

          let style =
            "border-glass-border bg-glass-bg hover:border-azure/30 hover:bg-glass-bg-strong";
          if (answered && isCorrect) {
            style = "border-mint/40 bg-mint/10";
          } else if (answered && isSelected && !isCorrect) {
            style = "border-sakura/40 bg-sakura/10";
          }

          return (
            <button
              key={choice}
              type="button"
              onClick={() => selectChoice(i)}
              disabled={answered}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-jp transition-colors disabled:cursor-default ${style}`}
            >
              <span className="text-foreground">{choice}</span>
              {answered && isCorrect && <Check size={16} className="text-mint" />}
              {answered && isSelected && !isCorrect && (
                <X size={16} className="text-sakura" />
              )}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="rounded-xl border border-glass-border bg-glass-bg p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold">
            {selected === question.correctIndex ? "Correct" : "Explanation"}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground/85">
            {question.explanation}
          </p>
        </div>
      )}

      {answered && (
        <button
          type="button"
          onClick={next}
          className="self-start rounded-xl bg-gradient-to-r from-sakura to-gold px-5 py-2.5 text-sm font-semibold text-background"
        >
          {isLast ? "See results" : "Next question"}
        </button>
      )}
    </GlassCard>
  );
}
