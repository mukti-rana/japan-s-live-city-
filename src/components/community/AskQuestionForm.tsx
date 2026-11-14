"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Check, Lightbulb, Loader2, MapPin, Tag } from "lucide-react";
import Bi from "@/components/community/Bi";
import { useAuth } from "@/lib/supabase/AuthContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { localize, useTranslate } from "@/lib/i18n/inline";
import { AREA_BY_ID } from "@/lib/community/areas";
import { CATEGORIES } from "@/lib/community/categories";
import { DISCUSSION_LIMITS, QUESTION_MAX_PHOTOS, validateQuestionFields, type QuestionErrors } from "@/lib/community/validation";
import { REGIONS } from "@/lib/explore/regions";
import PhotoPicker, { type PhotoPickerHandle } from "@/components/community/PhotoPicker";
import PlacePicker, { type PickedPlace } from "@/components/community/PlacePicker";

const input = "w-full rounded-xl border border-white/10 bg-cm-input px-3.5 text-base text-foreground outline-none transition-colors placeholder:text-foreground/45 hover:border-white/20 focus:border-azure/60 focus-visible:ring-2 focus-visible:ring-azure/30 sm:text-sm";
const label = "mb-1.5 block text-sm font-semibold text-foreground";
const hint = "font-normal text-foreground/60";
const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const card = "rounded-2xl border border-white/[0.08] bg-cm-card p-5 sm:p-6";

const TIPS = ["Be specific: the place, the season, what you plan to do.", "Say who you travel with, or what you already tried.", "A photo (a sign, a menu, a map) helps people answer faster."];

// "I Need Help": ask the community. Only the title is required. Everything else —
// details, up to four photos, a topic, a place, an area — is optional, so a
// question can be about one temple or about Japan in general.
export default function AskQuestionForm({ initialPlace, initialArea }: { initialPlace?: PickedPlace; initialArea?: string }) {
  const tr = useTranslate();
  const { language } = useLanguage();
  const router = useRouter();
  const { user, loading, configured } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [areaId, setAreaId] = useState(initialPlace?.areaId ?? initialArea ?? "");
  const [categorySlug, setCategorySlug] = useState("");
  const [place, setPlace] = useState<PickedPlace>(initialPlace ?? { label: "", ref: null, areaId: null });
  const [errors, setErrors] = useState<QuestionErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const picker = useRef<PhotoPickerHandle>(null);

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
    const checked = validateQuestionFields({ title, body, areaId: effectiveArea, placeRef: place.ref ?? "", categorySlug });
    if (!checked.ok) {
      setErrors(checked.errors);
      setMessage("Please check the highlighted fields.");
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[data-invalid='true']")?.focus());
      return;
    }
    if (picker.current?.preparing()) {
      setMessage("Please wait for your photos to finish preparing.");
      return;
    }
    setErrors({});
    setBusy(`${tr("Posting…")}`);
    try {
      // Photos are uploaded one at a time first; the question then points at them.
      const uploadPaths = picker.current && picker.current.count() > 0 ? await picker.current.uploadAll((done, all) => setBusy(`${tr("Uploading photo")} ${done} / ${all}…`)) : [];
      setBusy(`${tr("Posting…")}`);
      const res = await fetch("/api/community/questions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...checked.value, uploadPaths }) });
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string; fields?: QuestionErrors };
      if (res.ok && data.id) {
        router.push(`/community/question/${data.id}`);
        return;
      }
      if (data.fields) setErrors(data.fields);
      setMessage(data.error ?? "We couldn't post your question. Please try again.");
    } catch (err2) {
      setMessage(err2 instanceof Error ? err2.message : "We couldn't post your question. Please try again.");
    }
    setBusy(null);
  }

  if (loading) return <div className="h-64 animate-pulse rounded-2xl border border-white/10 bg-cm-card" aria-busy="true" />;
  if (!configured || !user) {
    return (
      <div className={`${card} px-5 py-12 text-center`}>
        <h2 className="text-xl font-semibold text-foreground">{tr(configured ? "Sign in to ask a question" : "Questions aren't available right now")}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-foreground/75">{tr(configured ? "Browsing is open to everyone. A free account lets you ask questions, answer them and join the conversation." : "Please try again in a little while.")}</p>
        {configured && (
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/login?form=1" className={`rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90 ${ring}`}>
              {tr("Sign in")}
            </Link>
            <Link href="/signup?form=1" className={`rounded-xl border border-white/15 px-5 py-2.5 text-sm font-medium text-foreground transition hover:border-white/30 hover:bg-white/[0.06] ${ring}`}>
              {tr("Create account")}
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {/* The question itself. */}
        <section className={card}>
          <label htmlFor="q-title" className={label}>
            {tr("Your question")}
          </label>
          <input id="q-title" value={title} onChange={(e) => { setTitle(e.target.value); clear("title"); }} maxLength={DISCUSSION_LIMITS.questionTitleMax} placeholder={tr("Is Nara Park worth visiting in the evening?")} className={`${input} h-12 text-base`} {...bad("title")} />
          {err("title")}
          <label htmlFor="q-body" className={`${label} mt-5`}>
            {tr("Details")} <span className={hint}>({tr("optional")})</span>
          </label>
          <textarea id="q-body" value={body} onChange={(e) => { setBody(e.target.value); clear("body"); }} maxLength={DISCUSSION_LIMITS.questionBodyMax} rows={5} placeholder={tr("Add anything that helps people answer: dates, who you travel with, what you like.")} className={`${input} py-3`} {...bad("body")} />
          <p className="mt-1 text-right text-[11px] text-foreground/60">
            {body.length} / {DISCUSSION_LIMITS.questionBodyMax}
          </p>
          {err("body")}
        </section>

        {/* Photos */}
        <section className={card} aria-labelledby="q-photos-h">
          <h2 id="q-photos-h" className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Camera size={16} aria-hidden="true" className="text-azure" />
            {tr("Photos")} <span className={hint}>({tr("optional")})</span>
          </h2>
          <p className="mb-4 mt-1 text-xs text-foreground/65">{tr("Add up to 4 photos. Location data is removed from every photo.")}</p>
          <PhotoPicker ref={picker} max={QUESTION_MAX_PHOTOS} disabled={Boolean(busy)} onChange={(n) => n > 0 && clear("uploadPaths")} onMessage={setMessage} />
          {err("uploadPaths")}
        </section>

        {/* Topic */}
        <section className={card} aria-labelledby="q-topic-h">
          <h2 id="q-topic-h" className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Tag size={16} aria-hidden="true" className="text-azure" />
            {tr("Topic")} <span className={hint}>({tr("optional")})</span>
          </h2>
          <div role="group" aria-labelledby="q-topic-h" className="mt-3 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const on = categorySlug === c.slug;
              return (
                <button key={c.slug} type="button" onClick={() => { setCategorySlug(on ? "" : c.slug); clear("categorySlug"); }} aria-pressed={on} className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors ${ring} ${on ? "border-azure/60 bg-azure/15 text-white" : "border-white/12 bg-white/[0.03] text-foreground/80 hover:border-white/30 hover:text-white"}`}>
                  <Bi en={c.en} ja={c.ja} />
                  {on && <Check size={13} aria-hidden="true" className="text-azure" />}
                </button>
              );
            })}
          </div>
          {err("categorySlug")}
        </section>

        {/* Where */}
        <section className={card} aria-labelledby="q-where-h">
          <h2 id="q-where-h" className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MapPin size={16} aria-hidden="true" className="text-azure" />
            {tr("Where")} <span className={hint}>({tr("optional")})</span>
          </h2>
          <p className="mb-4 mt-1 text-xs text-foreground/65">{tr("Leave both empty to ask about Japan in general.")}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className={label}>{tr("About a place")}</span>
              <PlacePicker value={place} onChange={(p) => { setPlace(p); clear("placeRef"); if (p.areaId) { setAreaId(p.areaId); clear("areaId"); } }} describedBy={errors.placeRef ? "q-err-placeRef" : undefined} />
              {err("placeRef")}
            </div>
            <div>
              <label htmlFor="q-area" className={label}>
                {tr("Where in Japan")}
              </label>
              <select id="q-area" value={effectiveArea} onChange={(e) => { setAreaId(e.target.value); clear("areaId"); }} disabled={Boolean(place.areaId)} className={`${input} h-11`} {...bad("areaId")}>
                <option value="">{tr("Anywhere in Japan")}</option>
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
        </section>

        {message && (
          <p role="alert" className="rounded-2xl border border-sakura/40 bg-sakura/10 px-4 py-3 text-sm text-foreground">
            {tr(message)}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={Boolean(busy)} aria-busy={Boolean(busy)} className={`inline-flex h-12 items-center gap-2 rounded-xl bg-white px-7 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-70 ${ring}`}>
            {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {busy ?? tr("Ask the community")}
          </button>
          <Link href="/community/help" className={`rounded text-sm text-foreground/75 underline-offset-2 hover:text-foreground hover:underline ${ring}`}>
            {tr("Cancel")}
          </Link>
        </div>
      </form>

      {/* A few tips, beside the form on a wide screen and under it on a phone. */}
      <aside aria-labelledby="q-tips-h" className="h-fit rounded-2xl border border-white/[0.08] bg-cm-surface p-5 lg:sticky lg:top-24">
        <h2 id="q-tips-h" className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Lightbulb size={16} aria-hidden="true" className="text-gold" />
          {tr("Tips for a good question")}
        </h2>
        <ul className="mt-3 flex flex-col gap-3 text-sm leading-relaxed text-foreground/70">
          {TIPS.map((t) => (
            <li key={t} className="flex gap-2">
              <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-azure" />
              {tr(t)}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
