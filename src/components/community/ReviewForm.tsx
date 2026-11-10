"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useTranslate } from "@/lib/i18n/inline";
import { REVIEW_LIMITS, todayInJapan, validateReviewFields, type ReviewErrors } from "@/lib/community/validation";
import PhotoPicker, { type ExistingPhoto, type PhotoPickerHandle } from "@/components/community/PhotoPicker";
import StarInput from "@/components/community/StarInput";

const input = "w-full rounded-xl border border-glass-border bg-black/30 px-3.5 text-base text-foreground outline-none transition-colors placeholder:text-foreground/55 hover:border-white/20 focus:border-azure/60 focus-visible:ring-2 focus-visible:ring-azure/40 sm:text-sm";
const labelCls = "mb-1.5 block text-xs font-semibold text-foreground";
const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export interface ReviewDraft {
  id: string;
  rating: number;
  body: string;
  recommend: boolean;
  visitDate: string | null;
  photos: ExistingPhoto[];
}

// Write a review of a place — or edit your own. Stars and "would you recommend
// it?" are required; words, a visit date and photos are optional. Everything is
// checked here with the same rules the server applies, and then again there.
export default function ReviewForm({ placeRef, draft, onDone, onCancel }: { placeRef: string; draft?: ReviewDraft; onDone: () => void; onCancel: () => void }) {
  const tr = useTranslate();
  const router = useRouter();
  const [rating, setRating] = useState(draft?.rating ?? 0);
  const [recommend, setRecommend] = useState<boolean | null>(draft ? draft.recommend : null);
  const [body, setBody] = useState(draft?.body ?? "");
  const [visitDate, setVisitDate] = useState(draft?.visitDate ?? "");
  const [rights, setRights] = useState(false);
  const [photoCount, setPhotoCount] = useState(draft?.photos.length ?? 0);
  const [errors, setErrors] = useState<ReviewErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const picker = useRef<PhotoPickerHandle>(null);
  const root = useRef<HTMLFormElement>(null);
  const editing = Boolean(draft);

  const clear = (k: keyof ReviewErrors) => setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  const err = (k: keyof ReviewErrors) =>
    errors[k] ? (
      <p id={`rv-err-${k}`} role="alert" className="mt-1.5 text-xs font-medium text-sakura">
        {tr(errors[k]!)}
      </p>
    ) : null;
  const bad = (k: keyof ReviewErrors) => ({ "aria-invalid": errors[k] ? true : undefined, "aria-describedby": errors[k] ? `rv-err-${k}` : undefined, "data-invalid": errors[k] ? "true" : undefined });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setMessage(null);
    if (picker.current?.preparing()) {
      setMessage("Please wait for your photos to finish preparing.");
      return;
    }
    const hasNewOrKept = (picker.current?.count() ?? 0) > 0;
    const checked = validateReviewFields({ placeRef, rating, body, recommend: recommend === null ? undefined : recommend, visitDate, rightsConfirmed: rights }, hasNewOrKept);
    if (!checked.ok) {
      setErrors(checked.errors);
      setMessage("Please check the highlighted fields.");
      requestAnimationFrame(() => root.current?.querySelector<HTMLElement>("[data-invalid='true']")?.focus());
      return;
    }
    setErrors({});

    try {
      const uploadPaths = await picker.current!.uploadAll((done, all) => setBusy(`${tr("Uploading photo")} ${done} / ${all}…`));
      setBusy(editing ? `${tr("Saving…")}` : `${tr("Posting…")}`);
      const res = await fetch(editing ? `/api/community/reviews/${draft!.id}` : "/api/community/reviews", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...checked.value, uploadPaths, keepPaths: picker.current!.keptPaths() }),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string; fields?: ReviewErrors };
      if (res.ok) {
        router.refresh();
        onDone();
        return;
      }
      if (data.fields) setErrors(data.fields);
      // They already have a review of this place: refresh so "Edit your review" appears.
      if (res.status === 409) router.refresh();
      setMessage(data.error ?? "We couldn't save your review. Please try again.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We couldn't save your review. Please try again.");
    }
    setBusy(null);
  }

  return (
    <form ref={root} onSubmit={submit} noValidate className="flex flex-col gap-5 rounded-3xl border border-glass-border bg-glass-bg p-5 backdrop-blur-xl sm:p-6">
      <h3 className="text-base font-semibold text-foreground">{editing ? tr("Edit your review") : tr("Write a review")}</h3>

      <div>
        <span className={labelCls}>{tr("Your rating")}</span>
        <StarInput value={rating} onChange={(n) => { setRating(n); clear("rating"); }} invalid={Boolean(errors.rating)} describedBy={errors.rating ? "rv-err-rating" : undefined} />
        {err("rating")}
      </div>

      <fieldset>
        <legend className={labelCls}>{tr("Would you recommend this place?")}</legend>
        <div className="flex flex-wrap gap-2" data-invalid={errors.recommend ? "true" : undefined} tabIndex={-1} aria-describedby={errors.recommend ? "rv-err-recommend" : undefined}>
          {[true, false].map((v) => (
            <label key={String(v)} className={`inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-azure ${recommend === v ? (v ? "border-mint/60 bg-mint/15 text-mint" : "border-sakura/60 bg-sakura/15 text-sakura") : "border-glass-border bg-glass-bg text-foreground hover:border-white/30"}`}>
              <input type="radio" name="recommend" checked={recommend === v} onChange={() => { setRecommend(v); clear("recommend"); }} className="sr-only" />
              {v ? tr("Yes, I'd recommend it") : tr("No, I wouldn't")}
            </label>
          ))}
        </div>
        {err("recommend")}
      </fieldset>

      <div>
        <label htmlFor="rv-body" className={labelCls}>
          {tr("Your review")} <span className="font-normal text-foreground/70">({tr("optional")})</span>
        </label>
        <textarea id="rv-body" value={body} onChange={(e) => { setBody(e.target.value); clear("body"); }} maxLength={REVIEW_LIMITS.bodyMax} rows={5} placeholder={tr("What was it like? Tips for the next visitor are very welcome.")} className={`${input} py-2.5`} {...bad("body")} />
        <p className="mt-1 text-right text-[11px] text-foreground/70">
          {body.length} / {REVIEW_LIMITS.bodyMax}
        </p>
        {err("body")}
      </div>

      <div className="max-w-xs">
        <label htmlFor="rv-date" className={labelCls}>
          {tr("Visit date")} <span className="font-normal text-foreground/70">({tr("optional")})</span>
        </label>
        <input id="rv-date" type="date" value={visitDate} max={todayInJapan()} min="1990-01-01" onChange={(e) => { setVisitDate(e.target.value); clear("visitDate"); }} className={`${input} h-11`} {...bad("visitDate")} />
        {err("visitDate")}
      </div>

      <div>
        <span className={labelCls}>
          {tr("Photos")} <span className="font-normal text-foreground/70">({tr("optional")} — {tr("up to 4")})</span>
        </span>
        <PhotoPicker ref={picker} max={REVIEW_LIMITS.maxPhotos} disabled={Boolean(busy)} existing={draft?.photos} onChange={setPhotoCount} onMessage={setMessage} note="Photos are re-saved without any location or camera details." />
        {err("uploadPaths")}
      </div>

      {photoCount > 0 && (
        <div>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
            <input type="checkbox" checked={rights} onChange={(e) => { setRights(e.target.checked); clear("rightsConfirmed"); }} className="mt-0.5 h-5 w-5 shrink-0 accent-[#c4b5fd]" {...bad("rightsConfirmed")} />
            <span>{tr("I took these photos, or I have the right to share them.")}</span>
          </label>
          {err("rightsConfirmed")}
        </div>
      )}

      {message && (
        <p role="alert" className="rounded-2xl border border-sakura/40 bg-sakura/10 px-4 py-3 text-sm text-foreground">
          {tr(message)}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={Boolean(busy)} aria-busy={Boolean(busy)} className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-azure to-neon-purple px-6 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-70 ${ring}`}>
          {busy ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              {busy}
            </>
          ) : editing ? (
            tr("Save changes")
          ) : (
            tr("Post review")
          )}
        </button>
        <button type="button" onClick={onCancel} disabled={Boolean(busy)} className={`rounded text-sm text-foreground/80 underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50 ${ring}`}>
          {tr("Cancel")}
        </button>
      </div>
    </form>
  );
}
