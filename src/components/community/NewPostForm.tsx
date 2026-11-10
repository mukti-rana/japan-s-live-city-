"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus, Loader2, ShieldCheck, X } from "lucide-react";
import { useAuth } from "@/lib/supabase/AuthContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { localize, useTranslate } from "@/lib/i18n/inline";
import { AREA_BY_ID } from "@/lib/community/areas";
import { CATEGORIES } from "@/lib/community/categories";
import { PhotoError, preparePhoto } from "@/lib/community/clientImage";
import { LIMITS, todayInJapan, validateFields, type FieldErrors } from "@/lib/community/validation";
import { REGIONS } from "@/lib/explore/regions";
import CameraCapture from "@/components/community/CameraCapture";
import PlacePicker, { type PickedPlace } from "@/components/community/PlacePicker";

interface Photo {
  id: string;
  preview: string;
  blob: Blob | null;
  status: "preparing" | "ready" | "error";
  error?: string;
  uploaded?: { path: string };
}

const input = "h-11 w-full rounded-xl border border-glass-border bg-black/30 px-3.5 text-base text-foreground outline-none transition-colors placeholder:text-foreground/55 hover:border-white/20 focus:border-azure/60 focus-visible:ring-2 focus-visible:ring-azure/40 sm:text-sm";
const label = "mb-1.5 block text-xs font-semibold text-foreground";
const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const PHOTO_PROBLEMS: Record<string, string> = {
  type: "That file isn't a photo.",
  size: "That photo is too large. Please use one under 30 MB.",
  decode: "We couldn't open that photo. Try a JPEG or PNG (iPhone photos work best as 'Most Compatible').",
};

// Share an experience: photos, words, and where it was. Photos are shrunk and
// stripped of location data on the device, uploaded one at a time with
// progress, and only then is the post created from them.
export default function NewPostForm() {
  const tr = useTranslate();
  const { language } = useLanguage();
  const { user, loading, configured } = useAuth();
  const router = useRouter();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [areaId, setAreaId] = useState("");
  const [cityLabel, setCityLabel] = useState("");
  const [place, setPlace] = useState<PickedPlace>({ label: "", ref: null, areaId: null });
  const [categorySlug, setCategorySlug] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [rights, setRights] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [canUseCamera, setCanUseCamera] = useState(false);
  const [touch, setTouch] = useState(false);
  const clientKey = useRef<string>("");
  const photoRef = useRef(photos);
  useEffect(() => {
    photoRef.current = photos;
  }, [photos]);

  // One random key per attempt: pressing Share twice, or a retry, can never make two posts.
  useEffect(() => {
    clientKey.current = crypto.randomUUID();
    // These depend on the browser, so they are read after the page has loaded.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanUseCamera(Boolean(navigator.mediaDevices?.getUserMedia));
    setTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  // After a failed submit, move the keyboard to the first field that needs fixing
  // (once the error state has been drawn).
  useEffect(() => {
    if (focusNonce) document.querySelector<HTMLElement>("[data-invalid='true']")?.focus();
  }, [focusNonce]);

  // Free the preview pictures when leaving the page.
  useEffect(() => () => photoRef.current.forEach((p) => URL.revokeObjectURL(p.preview)), []);

  const clearError = useCallback((k: keyof FieldErrors) => setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e)), []);

  const addFiles = useCallback(async (files: File[]) => {
    const room = LIMITS.maxPhotos - photoRef.current.length;
    if (room <= 0) {
      setMessage("You can add up to 8 photos.");
      return;
    }
    if (files.length > room) setMessage("Only the first photos were added: you can add up to 8.");
    for (const file of files.slice(0, room)) {
      const id = crypto.randomUUID();
      setPhotos((p) => [...p, { id, preview: "", blob: null, status: "preparing" }]);
      try {
        const { blob } = await preparePhoto(file);
        setPhotos((p) => p.map((x) => (x.id === id ? { ...x, blob, preview: URL.createObjectURL(blob), status: "ready" } : x)));
        clearError("uploadPaths");
      } catch (e) {
        const code = e instanceof PhotoError ? e.code : "decode";
        setPhotos((p) => p.map((x) => (x.id === id ? { ...x, status: "error", error: PHOTO_PROBLEMS[code] } : x)));
      }
    }
  }, [clearError]);

  function removePhoto(id: string) {
    setPhotos((p) => {
      const gone = p.find((x) => x.id === id);
      if (gone?.preview) URL.revokeObjectURL(gone.preview);
      return p.filter((x) => x.id !== id);
    });
  }

  async function uploadOne(photo: Photo): Promise<string> {
    const body = new FormData();
    body.append("file", photo.blob!, "photo.jpg");
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch("/api/community/upload", { method: "POST", body });
        const data = (await res.json().catch(() => ({}))) as { path?: string; error?: string };
        if (res.ok && data.path) return data.path;
        // A "no" from the server will not change on a retry; only network failures are retried.
        throw new Error(data.error ?? "We couldn't upload that photo. Please try again.");
      } catch (e) {
        if (e instanceof TypeError && attempt === 0) continue;
        throw e instanceof Error ? e : new Error("We couldn't upload that photo. Please try again.");
      }
    }
    throw new Error("We couldn't upload that photo. Please try again.");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setMessage(null);

    const effectiveArea = place.areaId ?? areaId;
    const checked = validateFields({ title, caption, areaId: effectiveArea, cityLabel, placeRef: place.ref ?? "", placeLabel: place.label, categorySlug, visitDate, rightsConfirmed: rights });
    const next: FieldErrors = checked.ok ? {} : { ...checked.errors };
    const ready = photos.filter((p) => p.status === "ready");
    if (photos.some((p) => p.status === "preparing")) {
      setMessage("Please wait for your photos to finish preparing.");
      return;
    }
    if (ready.length === 0) next.uploadPaths = "Add at least one photo.";
    setErrors(next);
    if (Object.keys(next).length || !checked.ok) {
      setMessage("Please check the highlighted fields.");
      setFocusNonce((n) => n + 1);
      return;
    }

    try {
      const paths: string[] = [];
      for (let i = 0; i < ready.length; i++) {
        const photo = ready[i];
        if (photo.uploaded) {
          paths.push(photo.uploaded.path);
          continue;
        }
        setBusy(`${tr("Uploading photo")} ${i + 1} / ${ready.length}…`);
        const path = await uploadOne(photo);
        setPhotos((p) => p.map((x) => (x.id === photo.id ? { ...x, uploaded: { path } } : x)));
        paths.push(path);
      }
      setBusy(`${tr("Sharing your post")}…`);
      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...checked.value, uploadPaths: paths, clientKey: clientKey.current }),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string; fields?: FieldErrors };
      if (res.ok && data.id) {
        router.push(`/community/post/${data.id}`);
        return;
      }
      if (data.fields) setErrors(data.fields);
      setMessage(data.error ?? "We couldn't share your post. Please try again.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "We couldn't share your post. Please try again.");
    }
    setBusy(null);
  }

  if (loading) return <div className="h-64 animate-pulse rounded-3xl border border-glass-border bg-glass-bg" aria-busy="true" />;

  if (!configured) {
    return <Gate heading="Sharing isn't available right now" body="Please try again in a little while." />;
  }
  if (!user) {
    return (
      <Gate heading="Sign in to share your experience" body="Browsing is open to everyone. A free account lets you share photos, write reviews and join the conversation.">
        <Link href="/login?form=1" className={`rounded-xl bg-gradient-to-r from-lilac to-sakura px-5 py-2.5 text-sm font-semibold text-background transition hover:brightness-110 ${ring}`}>
          {tr("Sign in")}
        </Link>
        <Link href="/signup?form=1" className={`rounded-xl border border-glass-border bg-glass-bg px-5 py-2.5 text-sm font-medium text-foreground transition hover:border-white/30 ${ring}`}>
          {tr("Create account")}
        </Link>
      </Gate>
    );
  }

  const err = (k: keyof FieldErrors) =>
    errors[k] ? (
      <p id={`err-${k}`} role="alert" className="mt-1.5 text-xs font-medium text-sakura">
        {tr(errors[k]!)}
      </p>
    ) : null;
  const bad = (k: keyof FieldErrors) => ({ "aria-invalid": errors[k] ? true : undefined, "aria-describedby": errors[k] ? `err-${k}` : undefined, "data-invalid": errors[k] ? "true" : undefined });
  const effectiveArea = place.areaId ?? areaId;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      {/* Photos */}
      <section aria-labelledby="photos-h" className="rounded-3xl border border-glass-border bg-glass-bg p-5 backdrop-blur-xl sm:p-6">
        <h2 id="photos-h" className="text-base font-semibold text-foreground">
          {tr("Photos")} <span className="text-xs font-normal text-foreground/70">({photos.filter((p) => p.status !== "error").length} / {LIMITS.maxPhotos})</span>
        </h2>
        <p className="mt-1 text-xs text-foreground/80">{tr("The first photo is the cover. Add up to 8.")}</p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((p, i) => (
            <div key={p.id} className="relative aspect-square overflow-hidden rounded-xl border border-glass-border bg-black/30">
              {p.status === "ready" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.preview} alt={`${tr("Photo")} ${i + 1}`} className="h-full w-full object-cover" />
              )}
              {p.status === "preparing" && (
                <div className="flex h-full items-center justify-center" role="status">
                  <Loader2 className="animate-spin text-foreground/80" size={22} aria-hidden="true" />
                  <span className="sr-only">{tr("Preparing photo")}</span>
                </div>
              )}
              {p.status === "error" && (
                <p role="alert" className="flex h-full items-center p-2 text-center text-xs text-sakura">
                  {tr(p.error ?? PHOTO_PROBLEMS.decode)}
                </p>
              )}
              {i === 0 && p.status === "ready" && <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">{tr("Cover")}</span>}
              <button type="button" onClick={() => removePhoto(p.id)} disabled={Boolean(busy)} aria-label={`${tr("Remove photo")} ${i + 1}`} className={`absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white hover:bg-black/85 disabled:opacity-40 ${ring}`}>
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-lilac to-sakura px-4 py-2.5 text-sm font-semibold text-background transition hover:brightness-110 focus-within:ring-2 focus-within:ring-white/70 ${photos.length >= LIMITS.maxPhotos || busy ? "pointer-events-none opacity-50" : ""}`}>
            <ImagePlus size={16} aria-hidden="true" />
            {tr("Choose photos")}
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              disabled={photos.length >= LIMITS.maxPhotos || Boolean(busy)}
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = "";
                if (files.length) void addFiles(files);
              }}
            />
          </label>
          {touch ? (
            // On a phone the file picker's camera option opens the real camera app.
            <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-glass-border bg-glass-bg px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-white/30 focus-within:ring-2 focus-within:ring-azure ${photos.length >= LIMITS.maxPhotos || busy ? "pointer-events-none opacity-50" : ""}`}>
              <Camera size={16} aria-hidden="true" />
              {tr("Take a photo")}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                disabled={photos.length >= LIMITS.maxPhotos || Boolean(busy)}
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  e.target.value = "";
                  if (files.length) void addFiles(files);
                }}
              />
            </label>
          ) : (
            canUseCamera && (
              <button type="button" onClick={() => setCameraOpen(true)} disabled={photos.length >= LIMITS.maxPhotos || Boolean(busy)} className={`inline-flex items-center gap-2 rounded-xl border border-glass-border bg-glass-bg px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-white/30 disabled:opacity-50 ${ring}`}>
                <Camera size={16} aria-hidden="true" />
                {tr("Take a photo")}
              </button>
            )
          )}
        </div>
        {err("uploadPaths")}
        <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-foreground/80">
          <ShieldCheck size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-lilac" />
          {tr("Your photos are re-saved on your device and again on our server without any location or camera details. Only the place you name is shown.")}
        </p>
      </section>

      {/* Details */}
      <section aria-labelledby="details-h" className="rounded-3xl border border-glass-border bg-glass-bg p-5 backdrop-blur-xl sm:p-6">
        <h2 id="details-h" className="text-base font-semibold text-foreground">
          {tr("About your experience")}
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="cp-title" className={label}>
              {tr("Title")}
            </label>
            <input id="cp-title" value={title} onChange={(e) => { setTitle(e.target.value); clearError("title"); }} maxLength={LIMITS.titleMax} placeholder={tr("A Beautiful Afternoon in Nara")} className={input} {...bad("title")} />
            {err("title")}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="cp-caption" className={label}>
              {tr("Caption")} <span className="font-normal text-foreground/70">({tr("optional")})</span>
            </label>
            <textarea id="cp-caption" value={caption} onChange={(e) => { setCaption(e.target.value); clearError("caption"); }} maxLength={LIMITS.captionMax} rows={4} placeholder={tr("Tell people what made it special.")} className={`${input} h-auto py-2.5`} {...bad("caption")} />
            <p className="mt-1 text-right text-[11px] text-foreground/70">
              {caption.length} / {LIMITS.captionMax}
            </p>
            {err("caption")}
          </div>
          <div>
            <label htmlFor="cp-place" className={label}>
              {tr("Place")} <span className="font-normal text-foreground/70">({tr("optional")})</span>
            </label>
            <PlacePicker value={place} onChange={(p) => { setPlace(p); clearError("placeRef"); if (p.areaId) { setAreaId(p.areaId); clearError("areaId"); } }} describedBy={errors.placeRef ? "err-placeRef" : undefined} />
            {err("placeRef")}
            {err("placeLabel")}
          </div>
          <div>
            <label htmlFor="cp-area" className={label}>
              {tr("Where in Japan")}
            </label>
            <select id="cp-area" value={effectiveArea} onChange={(e) => { setAreaId(e.target.value); clearError("areaId"); }} disabled={Boolean(place.areaId)} className={input} {...bad("areaId")}>
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
          <div>
            <label htmlFor="cp-city" className={label}>
              {tr("City or neighbourhood")} <span className="font-normal text-foreground/70">({tr("optional")})</span>
            </label>
            <input id="cp-city" value={cityLabel} onChange={(e) => setCityLabel(e.target.value)} maxLength={LIMITS.cityMax} className={input} {...bad("cityLabel")} />
            {err("cityLabel")}
          </div>
          <div>
            <label htmlFor="cp-topic" className={label}>
              {tr("Topic")}
            </label>
            <select id="cp-topic" value={categorySlug} onChange={(e) => { setCategorySlug(e.target.value); clearError("categorySlug"); }} className={input} {...bad("categorySlug")}>
              <option value="">{tr("Choose a topic")}…</option>
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {localize(c.en, c.ja, language)}
                </option>
              ))}
            </select>
            {err("categorySlug")}
          </div>
          <div>
            <label htmlFor="cp-date" className={label}>
              {tr("Visit date")} <span className="font-normal text-foreground/70">({tr("optional")})</span>
            </label>
            <input id="cp-date" type="date" value={visitDate} max={todayInJapan()} min="1990-01-01" onChange={(e) => { setVisitDate(e.target.value); clearError("visitDate"); }} className={input} {...bad("visitDate")} />
            {err("visitDate")}
          </div>
        </div>

        <div className="mt-5">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
            <input type="checkbox" checked={rights} onChange={(e) => { setRights(e.target.checked); clearError("rightsConfirmed"); }} className="mt-0.5 h-5 w-5 shrink-0 accent-[#c4b5fd]" {...bad("rightsConfirmed")} />
            <span>{tr("I took these photos, or I have the right to share them.")}</span>
          </label>
          {err("rightsConfirmed")}
        </div>
      </section>

      {message && (
        <p role="alert" className="rounded-2xl border border-sakura/40 bg-sakura/10 px-4 py-3 text-sm text-foreground">
          {tr(message)}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={Boolean(busy)} aria-busy={Boolean(busy)} className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-azure to-neon-purple px-7 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-70 ${ring}`}>
          {busy ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              {busy}
            </>
          ) : (
            tr("Share")
          )}
        </button>
        <Link href="/community" className={`rounded text-sm text-foreground/80 underline-offset-2 hover:text-foreground hover:underline ${ring}`}>
          {tr("Cancel")}
        </Link>
      </div>

      {cameraOpen && <CameraCapture onClose={() => setCameraOpen(false)} onCapture={(f) => void addFiles([f])} />}
    </form>
  );
}

function Gate({ heading, body, children }: { heading: string; body: string; children?: React.ReactNode }) {
  const tr = useTranslate();
  return (
    <div className="rounded-3xl border border-glass-border bg-glass-bg px-5 py-12 text-center backdrop-blur-xl">
      <h2 className="text-xl font-semibold text-foreground">{tr(heading)}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-foreground/85">{tr(body)}</p>
      {children && <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}
