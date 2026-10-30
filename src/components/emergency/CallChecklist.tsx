"use client";

import { ListChecks } from "lucide-react";
import { CALL_CHECKLIST } from "@/lib/emergency/content";
import { pickJaEn, useInline, type Table } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const TEXT = {
  title: { en: "What to tell the operator", ja: "通報するときに伝えること" },
  note: {
    en: "Stay calm and speak slowly. The operator leads the call — answer their questions.",
    ja: "落ち着いて、ゆっくり話してください。質問には指令員が順に聞きます。",
  },
} satisfies Table;

export default function CallChecklist() {
  const { language } = useLanguage();
  const text = useInline(TEXT);
  const steps = pickJaEn(CALL_CHECKLIST, language);
  return (
    <section id="checklist" aria-labelledby="checklist-title" className="scroll-mt-24 rounded-2xl border border-glass-border bg-glass-bg p-4 backdrop-blur-xl sm:p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-azure/15 text-azure">
          <ListChecks size={18} aria-hidden="true" />
        </span>
        <h3 id="checklist-title" className="text-base font-semibold text-foreground">
          {text("title")}
        </h3>
      </div>
      <p className="mt-2 text-xs text-muted">{text("note")}</p>
      <ol className="mt-3 grid gap-2 sm:grid-cols-2">
        {steps.map((step, i) => (
          <li key={step} className="flex gap-3 rounded-xl border border-glass-border bg-background/30 p-3 text-sm leading-snug text-foreground/90">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-azure/15 text-xs font-semibold text-azure">{i + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
