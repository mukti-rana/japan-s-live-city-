"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import Bi from "@/components/community/Bi";
import ListingCard from "@/components/community/listings/ListingCard";
import ListingDetailView from "@/components/community/listings/ListingDetailView";
import { KIND_LABEL, type PhotoSrc } from "@/lib/community/listings/display";
import PhotoPicker, { type ExistingPhoto, type PhotoPickerHandle } from "@/components/community/PhotoPicker";
import PlacePicker from "@/components/community/PlacePicker";
import Tx from "@/components/i18n/Tx";
import { AREAS } from "@/lib/community/areas";
import { LISTING_CATEGORIES } from "@/lib/community/listings/categories";
import { nowMs } from "@/lib/community/listings/time";
import { EMPTY_LISTING, LISTING_LIMITS, parseListingInput, type ListingErrors, type ListingInput, type ListingRow } from "@/lib/community/listings/validation";
import type { Listing, ListingKind, ListingStatus } from "@/lib/community/listings/types";
import { NO_PLACE, type PickedPlace } from "@/lib/community/pickedPlace";
import { useTranslate } from "@/lib/i18n/inline";

export interface WizardInitial {
  id: string;
  status: ListingStatus;
  input: ListingInput;
  photos: ExistingPhoto[];
}

const input = "h-12 w-full rounded-xl border border-white/20 bg-transparent px-3.5 text-base text-white outline-none transition-colors placeholder:text-white/40 hover:border-white/35 focus:border-white/60 focus-visible:ring-2 focus-visible:ring-white/30 [&>option]:bg-[#0b0b0c] [&>option]:text-white";
const area = "w-full rounded-xl border border-white/20 bg-transparent p-3.5 text-base text-white outline-none transition-colors placeholder:text-white/40 hover:border-white/35 focus:border-white/60 focus-visible:ring-2 focus-visible:ring-white/30";
const pill = "inline-flex h-11 items-center gap-2 rounded-full border border-white/30 px-5 text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-50";

const STEP_OF: Partial<Record<keyof ListingInput, number>> = {
  title: 0, summary: 0, description: 0, categorySlug: 0, businessName: 0,
  startDate: 1, startTime: 1, endDate: 1, endTime: 1, recurrence: 1, recurrenceUntil: 1, areaId: 1, cityLabel: 1, venueName: 1, address: 1, lat: 1, lon: 1,
  priceText: 2, ticketUrl: 2, registrationUrl: 2, websiteUrl: 2, socialUrl: 2, organizerName: 2, organizerContact: 2, ageRestriction: 2, accessibility: 2, instructions: 2, offerDetails: 2, terms: 2, scheduleNote: 2,
  images: 3, videoUrl: 3,
};

function Field({ label, hint, error, children, wide = false }: { label: string; hint?: string; error?: string; children: ReactNode; wide?: boolean }) {
  const tr = useTranslate();
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-sm font-medium text-white/90">{tr(label)}</span>
      {children}
      {hint && !error && <span className="text-xs text-white/50">{tr(hint)}</span>}
      {error && (
        <span role="alert" className="flex items-center gap-1.5 text-xs font-medium text-[#ffb0b0]">
          <AlertTriangle size={12} aria-hidden="true" />
          {tr(error)}
        </span>
      )}
    </label>
  );
}

function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  const tr = useTranslate();
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex w-full items-start gap-3 rounded-xl border border-white/15 p-3.5 text-left transition-colors hover:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:col-span-2">
      <span aria-hidden="true" className={`mt-0.5 flex h-6 w-10 shrink-0 items-center rounded-full border p-0.5 transition-colors ${on ? "border-[#4ade80]/60 bg-[#4ade80]/25" : "border-white/25"}`}>
        <span className={`h-4 w-4 rounded-full bg-white transition-transform motion-reduce:transition-none ${on ? "translate-x-4" : ""}`} />
      </span>
      <span>
        <span className="block text-sm font-medium text-white">{tr(label)}</span>
        {hint && <span className="mt-0.5 block text-xs text-white/55">{tr(hint)}</span>}
      </span>
    </button>
  );
}

// What the person sees of their own listing before it is public. The same code that draws a real listing draws this.
function previewListing(row: ListingRow, author: { username: string; avatarUrl: string | null }): Listing {
  return {
    id: "preview",
    userId: "",
    kind: row.kind,
    status: "draft",
    title: row.title || "Your title",
    summary: row.summary,
    description: row.description,
    categorySlug: row.category_slug,
    areaId: row.area_id,
    cityLabel: row.city_label,
    venueName: row.venue_name,
    address: row.address,
    lat: row.lat,
    lon: row.lon,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    allDay: row.all_day,
    recurrence: row.recurrence,
    recurrenceUntil: row.recurrence_until,
    registrationRequired: row.registration_required,
    isFree: row.is_free,
    priceText: row.price_text,
    ticketUrl: row.ticket_url,
    registrationUrl: row.registration_url,
    websiteUrl: row.website_url,
    socialUrl: row.social_url,
    organizerName: row.organizer_name,
    organizerContact: row.organizer_contact,
    businessName: row.business_name,
    offerDetails: row.offer_details,
    terms: row.terms,
    ageRestriction: row.age_restriction,
    accessibility: row.accessibility,
    instructions: row.instructions,
    inquiriesEnabled: row.inquiries_enabled,
    postponed: row.postponed,
    scheduleNote: row.schedule_note,
    featured: false,
    sponsored: false,
    holdReason: null,
    interestedCount: 0,
    goingCount: 0,
    saveCount: 0,
    questionCount: 0,
    publishedAt: null,
    createdAt: "",
    author,
    media: [],
  };
}

type Outcome = { kind: "published" | "pending" | "saved"; id: string; reason?: string | null } | null;

export default function ListingWizard({ kind, author, initial }: { kind: ListingKind; author: { username: string; avatarUrl: string | null }; initial?: WizardInitial }) {
  const tr = useTranslate();
  const router = useRouter();
  const reduced = useReducedMotion();
  const picker = useRef<PhotoPickerHandle>(null);
  const clientKey = useRef("");
  const [id, setId] = useState<string | null>(initial?.id ?? null);
  const [step, setStep] = useState(0);
  const [v, setV] = useState<ListingInput>(initial?.input ?? { kind, ...EMPTY_LISTING });
  const [place, setPlace] = useState<PickedPlace>(initial?.input.venueName ? { label: initial.input.venueName, ref: null, areaId: initial.input.areaId || null, address: initial.input.address || null, city: initial.input.cityLabel || null, lat: initial.input.lat, lon: initial.input.lon } : NO_PLACE);
  const [errors, setErrors] = useState<ListingErrors>({});
  const [busy, setBusy] = useState<"" | "uploading" | "saving" | "publishing">("");
  const [progress, setProgress] = useState("");
  const [problem, setProblem] = useState("");
  const [done, setDone] = useState<Outcome>(null);
  const [photoCount, setPhotoCount] = useState(initial?.photos.length ?? 0);
  const [shots, setShots] = useState<{ src: string }[]>([]);
  // The last step shows the pictures as chosen so far, so they are read from the picker as the person arrives.
  const go = (i: number) => {
    if (i === 4) setShots(picker.current?.previews() ?? []);
    setStep(i);
  };
  const bar = useRef<HTMLOListElement>(null);
  // On a narrow screen the row of steps scrolls; keep the current one in view.
  useEffect(() => {
    bar.current?.querySelector('[aria-current="step"]')?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [step]);
  const timed = kind === "event" || kind === "activity";
  const promo = kind === "promotion";
  const editing = Boolean(initial);
  const live = initial?.status === "published" || initial?.status === "pending";

  const set = <K extends keyof ListingInput>(k: K, value: ListingInput[K]) => {
    setV((x) => ({ ...x, [k]: value }));
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
    setProblem("");
  };
  const pickPlace = (p: PickedPlace) => {
    setPlace(p);
    setV((x) => ({ ...x, venueName: p.label, address: p.address ?? "", cityLabel: p.city ?? x.cityLabel, areaId: p.areaId ?? x.areaId, lat: p.lat ?? null, lon: p.lon ?? null }));
    setErrors((e) => ({ ...e, areaId: undefined, venueName: undefined, lat: undefined }));
  };

  const steps = [
    { id: "basics", label: "The basics" },
    { id: "when", label: timed ? "When & where" : "Dates & place" },
    { id: "details", label: "Details" },
    { id: "photos", label: "Photos" },
    { id: "preview", label: "Preview & publish" },
  ];

  // Check everything the same way the server will, and jump to the first step with a problem.
  function check(mode: "draft" | "submit"): boolean {
    const r = parseListingInput({ ...v, images: [] }, mode);
    if (r.ok) {
      setErrors({});
      return true;
    }
    setErrors(r.errors);
    const first = Math.min(...(Object.keys(r.errors) as (keyof ListingInput)[]).map((k) => STEP_OF[k] ?? 0));
    go(first);
    setProblem("Please check the highlighted fields.");
    return false;
  }

  // Photos first (each is re-encoded and stripped of location data), then the listing, then (for "Publish") the database's own publish step.
  async function save(publish: boolean) {
    setProblem("");
    if (!check(publish ? "submit" : "draft")) return;
    if (picker.current?.preparing()) {
      setProblem("Your photos are still being prepared. One moment, then try again.");
      return;
    }
    try {
      setBusy("uploading");
      const kept = picker.current?.keptPaths() ?? [];
      const fresh = (await picker.current?.uploadAll((d, t) => setProgress(`${d}/${t}`))) ?? [];
      setBusy(publish ? "publishing" : "saving");
      if (!clientKey.current) clientKey.current = crypto.randomUUID();
      const body = { ...v, images: [...kept, ...fresh], clientKey: clientKey.current };
      const headers = { "Content-Type": "application/json" };
      let listingId = id;
      if (!listingId) {
        const res = await fetch("/api/community/listings", { method: "POST", headers, body: JSON.stringify(body) });
        const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string; fields?: ListingErrors };
        if (!res.ok || !data.id) return fail(data);
        listingId = data.id;
        setId(listingId);
      } else {
        const res = await fetch(`/api/community/listings/${listingId}`, { method: "PATCH", headers, body: JSON.stringify(body) });
        const data = (await res.json().catch(() => ({}))) as { error?: string; fields?: ListingErrors; status?: string; holdReason?: string | null };
        if (!res.ok) return fail(data);
        if (!publish && data.status === "pending") {
          setDone({ kind: "pending", id: listingId, reason: data.holdReason });
          return;
        }
      }
      if (!publish || initial?.status === "published" || initial?.status === "pending") {
        setDone({ kind: initial?.status === "published" ? "published" : "saved", id: listingId });
        return;
      }
      const res = await fetch(`/api/community/listings/${listingId}/submit`, { method: "POST", headers, body: "{}" });
      const data = (await res.json().catch(() => ({}))) as { error?: string; status?: string; holdReason?: string | null };
      if (!res.ok) {
        setProblem(data.error ?? "That didn't work. Please try again.");
        return;
      }
      setDone({ kind: data.status === "published" ? "published" : "pending", id: listingId, reason: data.holdReason });
    } catch (e) {
      setProblem(e instanceof Error && e.message ? e.message : "That didn't work. Please try again.");
    } finally {
      setBusy("");
      setProgress("");
    }
  }
  function fail(data: { error?: string; fields?: ListingErrors }) {
    if (data.fields) {
      setErrors(data.fields);
      const first = Math.min(...(Object.keys(data.fields) as (keyof ListingInput)[]).map((k) => STEP_OF[k] ?? 0));
      go(first);
    }
    setProblem(data.error ?? "That didn't work. Please try again.");
  }

  if (done) {
    const head = done.kind === "published" ? "It's live." : done.kind === "pending" ? "Sent for a quick review." : "Saved.";
    const body =
      done.kind === "published"
        ? "Everyone can see it now."
        : done.kind === "pending"
          ? "Our automated checks asked a person to look at it first. It will appear as soon as a moderator approves it. Only you can see it until then."
          : "It is saved as a private draft. Publish it whenever you are ready.";
    return (
      <div role="status" className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-[28px] border border-white/15 px-6 py-14 text-center">
        <CheckCircle2 size={36} aria-hidden="true" className={done.kind === "pending" ? "text-[#ffc26b]" : "text-[#4ade80]"} />
        <h2 className="text-2xl font-semibold text-foreground">{tr(head)}</h2>
        <p className="text-sm text-white/70">{tr(body)}</p>
        {done.reason && <p className="rounded-xl border border-white/15 px-3 py-2 text-xs text-white/70">{tr("Why it was held")}: {done.reason}</p>}
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Link href={`/community/listing/${done.id}`} className={`${pill} border-white/60 bg-white/10`}>
            {tr(done.kind === "saved" ? "Open your draft" : "View it")}
          </Link>
          <button type="button" onClick={() => router.push("/community/me?tab=listings")} className={pill}>
            {tr("My contributions")}
          </button>
        </div>
      </div>
    );
  }

  const lastStep = steps.length - 1;
  const parsedPreview = parseListingInput({ ...v, images: [], videoUrl: "" }, "draft");
  const prevRow = parsedPreview.ok ? parsedPreview.value.row : null;
  const photos: PhotoSrc[] = shots.map((p, i) => ({ src: p.src, thumb: p.src, alt: `${v.title} ${i + 1}` }));

  return (
    <div className="flex flex-col gap-6">
      {/* Progress */}
      <nav aria-label={tr("Progress")}>
        <ol ref={bar} className="relative flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {steps.map((s, i) => {
            const on = i === step;
            const past = i < step;
            return (
              <li key={s.id} className="flex shrink-0 items-center gap-2">
                <button type="button" onClick={() => go(i)} aria-current={on ? "step" : undefined} className={`flex h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${on ? "border-white/60 bg-white/12 text-white" : past ? "border-[#4ade80]/40 text-[#9bf3b6]" : "border-white/15 text-white/60 hover:text-white"}`}>
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${past ? "bg-[#4ade80]/25" : "bg-white/10"}`}>{past ? <Check size={12} aria-hidden="true" /> : i + 1}</span>
                  <span className={on ? "" : "sr-only"}>{tr(s.label)}</span>
                </button>
                {i < lastStep && <span aria-hidden="true" className={`h-px w-4 sm:w-8 ${past ? "bg-[#4ade80]/50" : "bg-white/15"}`} />}
              </li>
            );
          })}
        </ol>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
          <div className="h-full rounded-full bg-[linear-gradient(90deg,#f5a524,#ff5c93,#9b6bff)] transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
      </nav>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={step} initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }} transition={{ duration: reduced ? 0 : 0.22, ease: "easeOut" }}>
          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title" error={errors.title} wide hint="A clear name people will recognise.">
                <input value={v.title} onChange={(e) => set("title", e.target.value)} maxLength={LISTING_LIMITS.titleMax} className={input} placeholder={tr(kind === "event" ? "e.g. Tenjin Night Market" : kind === "promotion" ? "e.g. Winter ramen set" : kind === "announcement" ? "e.g. Road closed this Sunday" : "e.g. Beach clean-up")} />
              </Field>
              <Field label="Category" error={errors.categorySlug}>
                <select value={v.categorySlug} onChange={(e) => set("categorySlug", e.target.value)} className={input}>
                  {LISTING_CATEGORIES.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      <Bi en={c.en} ja={c.ja} />
                    </option>
                  ))}
                </select>
              </Field>
              {promo && (
                <Field label="Business name" error={errors.businessName}>
                  <input value={v.businessName} onChange={(e) => set("businessName", e.target.value)} maxLength={LISTING_LIMITS.businessMax} className={input} />
                </Field>
              )}
              <Field label="Short description" error={errors.summary} wide hint={`${v.summary.length}/${LISTING_LIMITS.summaryMax}`}>
                <input value={v.summary} onChange={(e) => set("summary", e.target.value)} maxLength={LISTING_LIMITS.summaryMax} className={input} placeholder={tr("One line for cards and previews")} />
              </Field>
              <Field label="Full description" error={errors.description} wide hint="Optional if you wrote a short description. Please keep links out of it (a few are fine).">
                <textarea value={v.description} onChange={(e) => set("description", e.target.value)} maxLength={LISTING_LIMITS.descriptionMax} rows={7} className={area} />
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={timed ? "Start date" : "Starts (optional)"} error={errors.startDate}>
                <input type="date" value={v.startDate} onChange={(e) => set("startDate", e.target.value)} className={input} />
              </Field>
              {timed ? (
                <Field label="Start time" hint="Leave empty for an all-day event. Times are Japan time." error={errors.startTime}>
                  <input type="time" value={v.startTime} onChange={(e) => set("startTime", e.target.value)} className={input} />
                </Field>
              ) : (
                <span className="hidden sm:block" />
              )}
              <Field label={timed ? "End date (optional)" : "Expires on (optional)"} error={errors.endDate} hint={timed ? "Leave empty if it ends the same day." : "It stays up until the end of this day."}>
                <input type="date" value={v.endDate} onChange={(e) => set("endDate", e.target.value)} className={input} />
              </Field>
              {timed && (
                <Field label="End time (optional)" error={errors.endTime}>
                  <input type="time" value={v.endTime} onChange={(e) => set("endTime", e.target.value)} className={input} />
                </Field>
              )}
              {timed && (
                <>
                  <Field label="Repeats" error={errors.recurrence}>
                    <select value={v.recurrence} onChange={(e) => set("recurrence", e.target.value as ListingInput["recurrence"])} className={input}>
                      <option value="none">{tr("Does not repeat")}</option>
                      <option value="daily">{tr("Every day")}</option>
                      <option value="weekly">{tr("Every week")}</option>
                      <option value="monthly">{tr("Every month")}</option>
                    </select>
                  </Field>
                  {v.recurrence !== "none" && (
                    <Field label="Repeats until" error={errors.recurrenceUntil}>
                      <input type="date" value={v.recurrenceUntil} onChange={(e) => set("recurrenceUntil", e.target.value)} className={input} />
                    </Field>
                  )}
                </>
              )}
              <div className="flex flex-col gap-2 sm:col-span-2">
                <span className="text-sm font-medium text-white/90">{tr(timed ? "Venue" : "Place (optional)")}</span>
                <PlacePicker value={place} onChange={pickPlace} />
                {errors.lat && <span role="alert" className="text-xs font-medium text-[#ffb0b0]">{tr(errors.lat)}</span>}
              </div>
              <Field label="Prefecture" error={errors.areaId} hint={place.areaId ? "Set from the place you chose." : undefined}>
                <select value={v.areaId} onChange={(e) => set("areaId", e.target.value)} className={input}>
                  <option value="">{tr("Choose…")}</option>
                  {AREAS.map((a) => (
                    <option key={a.id} value={a.id}>
                      <Bi en={a.en} ja={a.ja} />
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="City or area" error={errors.cityLabel}>
                <input value={v.cityLabel} onChange={(e) => set("cityLabel", e.target.value)} maxLength={LISTING_LIMITS.cityMax} className={input} />
              </Field>
              <Field label="Address (optional)" error={errors.address} wide>
                <input value={v.address} onChange={(e) => set("address", e.target.value)} maxLength={LISTING_LIMITS.addressMax} className={input} />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {timed && (
                <>
                  <Toggle on={v.isFree} onChange={(x) => set("isFree", x)} label="Free entry" hint="Turn off if people pay to attend." />
                  {!v.isFree && (
                    <>
                      <Field label="Ticket price" error={errors.priceText} hint="e.g. ¥1,500 or ¥800 – ¥2,000">
                        <input value={v.priceText} onChange={(e) => set("priceText", e.target.value)} maxLength={LISTING_LIMITS.priceMax} className={input} />
                      </Field>
                      <Field label="Ticket link (optional)" error={errors.ticketUrl} hint="https://…">
                        <input type="url" inputMode="url" value={v.ticketUrl} onChange={(e) => set("ticketUrl", e.target.value)} className={input} />
                      </Field>
                    </>
                  )}
                  <Toggle on={v.registrationRequired} onChange={(x) => set("registrationRequired", x)} label="Registration is required" />
                </>
              )}
              {promo && (
                <>
                  <Field label="Offer details" error={errors.offerDetails} wide>
                    <textarea value={v.offerDetails} onChange={(e) => set("offerDetails", e.target.value)} maxLength={LISTING_LIMITS.offerMax} rows={4} className={area} />
                  </Field>
                  <Field label="Terms and conditions (optional)" error={errors.terms} wide>
                    <textarea value={v.terms} onChange={(e) => set("terms", e.target.value)} maxLength={LISTING_LIMITS.termsMax} rows={3} className={area} />
                  </Field>
                </>
              )}
              <Field label={promo ? "Booking link (optional)" : timed ? "Registration link (optional)" : "Link (optional)"} error={errors.registrationUrl} hint="https://…">
                <input type="url" inputMode="url" value={v.registrationUrl} onChange={(e) => set("registrationUrl", e.target.value)} className={input} />
              </Field>
              <Field label="Website (optional)" error={errors.websiteUrl} hint="https://…">
                <input type="url" inputMode="url" value={v.websiteUrl} onChange={(e) => set("websiteUrl", e.target.value)} className={input} />
              </Field>
              <Field label="Social page (optional)" error={errors.socialUrl} hint="https://…">
                <input type="url" inputMode="url" value={v.socialUrl} onChange={(e) => set("socialUrl", e.target.value)} className={input} />
              </Field>
              <Field label="Organizer name (optional)" error={errors.organizerName} hint="Shown instead of your username.">
                <input value={v.organizerName} onChange={(e) => set("organizerName", e.target.value)} maxLength={LISTING_LIMITS.organizerMax} className={input} />
              </Field>
              <Field label="Contact details (optional)" error={errors.organizerContact} hint="Shown publicly. Use an email or a number you are happy to share." wide>
                <input value={v.organizerContact} onChange={(e) => set("organizerContact", e.target.value)} maxLength={LISTING_LIMITS.contactMax} className={input} />
              </Field>
              {timed && (
                <>
                  <Field label="Age restrictions (optional)" error={errors.ageRestriction}>
                    <input value={v.ageRestriction} onChange={(e) => set("ageRestriction", e.target.value)} maxLength={LISTING_LIMITS.ageMax} className={input} />
                  </Field>
                  <Field label="Accessibility (optional)" error={errors.accessibility} wide>
                    <textarea value={v.accessibility} onChange={(e) => set("accessibility", e.target.value)} maxLength={LISTING_LIMITS.accessibilityMax} rows={2} className={area} />
                  </Field>
                  <Field label="Additional instructions (optional)" error={errors.instructions} wide>
                    <textarea value={v.instructions} onChange={(e) => set("instructions", e.target.value)} maxLength={LISTING_LIMITS.instructionsMax} rows={3} className={area} />
                  </Field>
                </>
              )}
              <Toggle on={v.inquiriesEnabled} onChange={(x) => set("inquiriesEnabled", x)} label="Let visitors send me questions" hint="You can change this at any time." />
              {editing && timed && (
                <>
                  <Toggle on={v.postponed} onChange={(x) => set("postponed", x)} label="This has been postponed" hint="Shows a notice on the page. Update the date when you know it." />
                  {(v.postponed || v.scheduleNote) && (
                    <Field label="Note for visitors (optional)" error={errors.scheduleNote} wide>
                      <input value={v.scheduleNote} onChange={(e) => set("scheduleNote", e.target.value)} maxLength={LISTING_LIMITS.noteMax} className={input} placeholder={tr("e.g. New date to be announced")} />
                    </Field>
                  )}
                </>
              )}
            </div>
          )}

          {step === lastStep && (
            <div className="flex flex-col gap-6">
              <div className="flex items-start gap-3 rounded-2xl border border-white/15 p-4 text-sm text-white/80">
                <ShieldCheck size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-[#4ade80]" />
                <p>
                  {tr(live ? "Your changes are checked again when you save. If something looks off, it goes back to a moderator for a quick look." : "Most publications go live straight away. If our automated checks notice something unusual (many links, a shortened link, or certain words), a moderator looks at it first. Nothing is ever marked as officially verified.")}
                </p>
              </div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/50">{tr("How it looks in the lists")}</p>
              {prevRow ? (
                <>
                  <div className="max-w-sm">
                    <ListingCard l={previewListing(prevRow, author)} now={nowMs()} preview photo={photos[0] ?? null} />
                  </div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/50">{tr("How its page looks")}</p>
                  <div className="rounded-[30px] border border-white/10 p-3 sm:p-5">
                    <ListingDetailView l={previewListing(prevRow, author)} now={nowMs()} photos={photos} video={v.videoUrl || null} preview />
                  </div>
                </>
              ) : (
                <p role="alert" className="rounded-xl border border-dashed border-[#ffb0b0]/50 p-4 text-sm text-[#ffb0b0]">{tr("Some fields need attention before there is a preview.")}</p>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Always mounted so chosen photos survive moving between steps; only shown on the Photos step. */}
      <div hidden={step !== 3} className="flex flex-col gap-5">
        <div>
          <p className="mb-2 text-sm font-medium text-white/90">{tr("Photos (optional)")}</p>
          <p className="mb-3 text-xs text-white/55">{tr("The first photo is the cover. Each photo is shrunk and stripped of location data on your device.")}</p>
          <PhotoPicker ref={picker} max={LISTING_LIMITS.maxImages} existing={initial?.photos ?? []} disabled={busy !== ""} onChange={setPhotoCount} />
          {errors.images && <p role="alert" className="mt-2 text-xs font-medium text-[#ffb0b0]">{tr(errors.images)}</p>}
          <p className="mt-2 text-xs text-white/50" aria-live="polite">{photoCount} / {LISTING_LIMITS.maxImages}</p>
        </div>
        <Field label="Video link (optional)" error={errors.videoUrl} hint="A YouTube or Vimeo link. Videos are not uploaded here.">
          <input type="url" inputMode="url" value={v.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} className={input} />
        </Field>
      </div>

      {problem && (
        <p role="alert" className="flex items-center gap-2 rounded-xl border border-[#ff7a7a]/40 px-4 py-3 text-sm text-[#ffb0b0]">
          <AlertTriangle size={16} aria-hidden="true" />
          {tr(problem)}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
        <button type="button" onClick={() => go(Math.max(0, step - 1))} disabled={step === 0 || busy !== ""} className={pill}>
          <ArrowLeft size={15} aria-hidden="true" />
          {tr("Back")}
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {!(initial && live) && (
            <button type="button" onClick={() => save(false)} disabled={busy !== ""} className={pill}>
              {busy === "saving" || busy === "uploading" ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : null}
              {busy === "uploading" && progress ? `${tr("Uploading photos")} ${progress}` : tr("Save draft")}
            </button>
          )}
          {step < lastStep ? (
            <button type="button" onClick={() => go(step + 1)} disabled={busy !== ""} className={`${pill} border-white/60 bg-white/10`}>
              {tr("Next")}
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          ) : (
            <button type="button" onClick={() => save(true)} disabled={busy !== ""} className={`${pill} border-white/70 bg-white/15`}>
              {busy === "publishing" || busy === "uploading" ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : null}
              {busy === "uploading" && progress ? `${tr("Uploading photos")} ${progress}` : tr(live ? "Save changes" : "Publish")}
            </button>
          )}
        </div>
      </div>
      <p className="text-xs text-white/45">
        <Tx en={KIND_LABEL[kind]} />
      </p>
    </div>
  );
}
