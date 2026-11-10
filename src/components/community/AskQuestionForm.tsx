"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/supabase/AuthContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { localize, useTranslate } from "@/lib/i18n/inline";
import { AREA_BY_ID } from "@/lib/community/areas";
import { DISCUSSION_LIMITS, validateQuestionFields, type QuestionErrors } from "@/lib/community/validation";
import { REGIONS } from "@/lib/explore/regions";
import PlacePicker, { type PickedPlace } from "@/components/community/PlacePicker";

const input = "w-full rounded-xl border border-glass-border bg-black/30 px-3.5 text-base text-foreground outline-none transition-colors placeholder:text-foreground/55 hover:border-white/20 focus:border-azure/60 focus-visible:ring-2 focus-visible:ring-azure/40 sm:text-sm";
const label = "mb-1.5 block text-xs font-semibold text-foreground";
const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure focus-visible:ring-offset-2 focus-visible:ring-offset-background";

// Ask a question about a place, or — with no place — ask a local about an area.
export default function AskQuestionForm({ initialPlace, initialArea }: { initialPlace?: PickedPlace; initialArea?: string }) {
  const tr = useTranslate();
  const { language } = useLanguage();
  const router = useRouter();
  const { user, loading, configured } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [areaId, setAreaId] = useState(initialPlace?.areaId ?? initialArea ?? "");
  const [place, setPlace] = useState<PickedPlace>(initialPlace ?? { label: "", ref: null, areaId: null });
  const [errors, setErrors] = useState<QuestionErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const clear = (k: keyof QuestionErrors) => setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  const err = (k: keyof QuestionErrors) =>
    errors[k] ? (
      <p id={`q-err-${k}`} role="alert" className="mt-1.5 text-xs font-medium text-sakura">
        {tr(errors[k]!)}
      </p>
    ) : null;
  const bad = (k: keyof QuestionErrors) => ({ "aria-invalid": errors[k] ? true : undefined, "aria-describedby": errors[k] ? `q-err-${k}` : undefined, "data-invalid": errors[k] ? "true" : undefined });
  const effectiveArea = place.areaId ?? areaId;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setMessage(null);
    const checked = validateQuestionFields({ title, body, areaId: effectiveArea, placeRef: place.ref ?? "" });
    if (!checked.ok) {
      setErrors(checked.errors);
      setMessage("Please check the highlighted fields.");
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[data-invalid='true']")?.focus());
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const res = await fetch("/api/community/questions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(checked.value) });
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string; fields?: QuestionErrors };
      if (res.ok && data.id) {
        router.push(`/community/question/${data.id}`);
        return;
      }
      if (data.fields) setErrors(data.fields);
      setMessage(data.error ?? "We couldn't post your question. Please try again.");
    } catch {
      setMessage("We couldn't post your question. Please try again.");
    }
    setBusy(false);
  }

  if (loading) return <div className="h-64 animate-pulse rounded-3xl border border-glass-border bg-glass-bg" aria-busy="true" />;
  if (!configured || !user) {
    return (
      <div className="rounded-3xl border border-glass-border bg-glass-bg px-5 py-12 text-center backdrop-blur-xl">
        <h2 className="text-xl font-semibold text-foreground">{tr(configured ? "Sign in to ask a question" : "Questions aren't available right now")}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-foreground/85">{tr(configured ? "Browsing is open to everyone. A free account lets you ask questions, answer them and join the conversation." : "Please try again in a little while.")}</p>
        {configured && (
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/login?form=1" className={`rounded-xl bg-gradient-to-r from-lilac to-sakura px-5 py-2.5 text-sm font-semibold text-background transition hover:brightness-110 ${ring}`}>
              {tr("Sign in")}
            </Link>
            <Link href="/signup?form=1" className={`rounded-xl border border-glass-border bg-glass-bg px-5 py-2.5 text-sm font-medium text-foreground transition hover:border-white/30 ${ring}`}>
              {tr("Create account")}
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5 rounded-3xl border border-glass-border bg-glass-bg p-5 backdrop-blur-xl sm:p-6">
      <div>
        <label htmlFor="q-title" className={label}>
          {tr("Your question")}
        </label>
        <input id="q-title" value={title} onChange={(e) => { setTitle(e.target.value); clear("title"); }} maxLength={DISCUSSION_LIMITS.questionTitleMax} placeholder={tr("Is Nara Park worth visiting in the evening?")} className={`${input} h-11`} {...bad("title")} />
        {err("title")}
      </div>
      <div>
        <label htmlFor="q-body" className={label}>
          {tr("Details")} <span className="font-normal text-foreground/70">({tr("optional")})</span>
        </label>
        <textarea id="q-body" value={body} onChange={(e) => { setBody(e.target.value); clear("body"); }} maxLength={DISCUSSION_LIMITS.questionBodyMax} rows={4} placeholder={tr("Add anything that helps people answer: dates, who you travel with, what you like.")} className={`${input} py-2.5`} {...bad("body")} />
        <p className="mt-1 text-right text-[11px] text-foreground/70">
          {body.length} / {DISCUSSION_LIMITS.questionBodyMax}
        </p>
        {err("body")}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className={label}>
            {tr("About a place")} <span className="font-normal text-foreground/70">({tr("optional")})</span>
          </span>
          <PlacePicker value={place} onChange={(p) => { setPlace(p); clear("placeRef"); if (p.areaId) { setAreaId(p.areaId); clear("areaId"); } }} describedBy={errors.placeRef ? "q-err-placeRef" : undefined} />
          {err("placeRef")}
          <p className="mt-1.5 text-[11px] text-foreground/70">{tr("Leave the place empty to ask a local about a city or area.")}</p>
        </div>
        <div>
          <label htmlFor="q-area" className={label}>
            {tr("Where in Japan")}
          </label>
          <select id="q-area" value={effectiveArea} onChange={(e) => { setAreaId(e.target.value); clear("areaId"); }} disabled={Boolean(place.areaId)} className={`${input} h-11`} {...bad("areaId")}>
            <option value="">{tr("Choose an area")}…</option>
            {REGIONS.map((r) => (
              <optgroup key={r.id} label={localize(r.en, r.ja, language)}>
                {r.prefectureIds.map((id) => {
                  const a = AREA_BY_ID.get(id);
                  return a ? (
                    <option key={id} value={id}>
                      {localize(a.en, a.ja, language)}
                    </option>
                  ) : null;
                })}
              </optgroup>
            ))}
          </select>
          {err("areaId")}
        </div>
      </div>
      {message && (
        <p role="alert" className="rounded-2xl border border-sakura/40 bg-sakura/10 px-4 py-3 text-sm text-foreground">
          {tr(message)}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} aria-busy={busy} className={`inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-azure to-neon-purple px-6 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-70 ${ring}`}>
          {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          {busy ? `${tr("Posting…")}` : tr("Ask the community")}
        </button>
        <Link href="/community/questions" className={`rounded text-sm text-foreground/80 underline-offset-2 hover:text-foreground hover:underline ${ring}`}>
          {tr("Cancel")}
        </Link>
      </div>
    </form>
  );
}
