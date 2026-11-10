"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { Camera, ImagePlus, Loader2, ShieldCheck, X } from "lucide-react";
import { useTranslate } from "@/lib/i18n/inline";
import { PhotoError, preparePhoto } from "@/lib/community/clientImage";
import CameraCapture from "@/components/community/CameraCapture";

interface Photo {
  id: string;
  preview: string;
  blob: Blob | null;
  status: "preparing" | "ready" | "error";
  error?: string;
  uploaded?: { path: string };
}

// A photo already saved on a review being edited.
export interface ExistingPhoto {
  path: string;
  url: string;
}

export interface PhotoPickerHandle {
  // Photos that are ready to send (new ones) plus saved ones still kept.
  count(): number;
  preparing(): boolean;
  // Uploads every new photo (one at a time) and returns their server paths.
  uploadAll(onProgress: (done: number, total: number) => void): Promise<string[]>;
  // Saved photos the person kept (editing only).
  keptPaths(): string[];
}

const PHOTO_PROBLEMS: Record<string, string> = {
  type: "That file isn't a photo.",
  size: "That photo is too large. Please use one under 30 MB.",
  decode: "We couldn't open that photo. Try a JPEG or PNG (iPhone photos work best as 'Most Compatible').",
};

const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure focus-visible:ring-offset-2 focus-visible:ring-offset-background";

// Choosing, taking, previewing and uploading photos — shared by the share form
// and the review form. Each photo is shrunk and stripped of location data on the
// device as soon as it is added, so problems show straight away; nothing is
// sent until the person submits.
export default function PhotoPicker({
  max,
  disabled = false,
  existing = [],
  onChange,
  onMessage,
  ref,
  note,
}: {
  max: number;
  disabled?: boolean;
  existing?: ExistingPhoto[];
  // Called with how many photos there are (new and kept) whenever that changes.
  onChange?: (count: number) => void;
  onMessage?: (message: string | null) => void;
  ref?: Ref<PhotoPickerHandle>;
  note?: string;
}) {
  const tr = useTranslate();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [kept, setKept] = useState<ExistingPhoto[]>(existing);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [canUseCamera, setCanUseCamera] = useState(false);
  const [touch, setTouch] = useState(false);
  const photosRef = useRef(photos);
  const keptRef = useRef(kept);
  const onChangeRef = useRef(onChange);
  const count = photos.filter((p) => p.status === "ready").length + kept.length;
  useEffect(() => {
    photosRef.current = photos;
    keptRef.current = kept;
    onChangeRef.current = onChange;
  }, [photos, kept, onChange]);
  useEffect(() => {
    onChangeRef.current?.(count);
  }, [count]);

  useEffect(() => {
    // These depend on the browser, so they are read after the page has loaded.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanUseCamera(Boolean(navigator.mediaDevices?.getUserMedia));
    setTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  // Free the preview pictures when leaving the page.
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview)), []);

  const total = () => photosRef.current.filter((p) => p.status !== "error").length + keptRef.current.length;

  const addFiles = useCallback(
    async (files: File[]) => {
      const room = max - total();
      if (room <= 0) {
        onMessage?.(`You can add up to ${max} photos.`);
        return;
      }
      if (files.length > room) onMessage?.(`Only the first photos were added: you can add up to ${max}.`);
      for (const file of files.slice(0, room)) {
        const id = crypto.randomUUID();
        setPhotos((p) => [...p, { id, preview: "", blob: null, status: "preparing" }]);
        try {
          const { blob } = await preparePhoto(file);
          setPhotos((p) => p.map((x) => (x.id === id ? { ...x, blob, preview: URL.createObjectURL(blob), status: "ready" } : x)));
        } catch (e) {
          const code = e instanceof PhotoError ? e.code : "decode";
          setPhotos((p) => p.map((x) => (x.id === id ? { ...x, status: "error", error: PHOTO_PROBLEMS[code] } : x)));
        }
      }
    },
    [max, onMessage],
  );

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

  useImperativeHandle(ref, () => ({
    count: () => photosRef.current.filter((p) => p.status === "ready").length + keptRef.current.length,
    preparing: () => photosRef.current.some((p) => p.status === "preparing"),
    keptPaths: () => keptRef.current.map((k) => k.path),
    uploadAll: async (onProgress) => {
      const ready = photosRef.current.filter((p) => p.status === "ready");
      const paths: string[] = [];
      for (let i = 0; i < ready.length; i++) {
        const photo = ready[i];
        if (photo.uploaded) {
          paths.push(photo.uploaded.path);
          continue;
        }
        onProgress(i + 1, ready.length);
        const path = await uploadOne(photo);
        // Remember it, so a retry after a later failure does not upload it again.
        setPhotos((p) => p.map((x) => (x.id === photo.id ? { ...x, uploaded: { path } } : x)));
        photo.uploaded = { path };
        paths.push(path);
      }
      return paths;
    },
  }));

  function removePhoto(id: string) {
    setPhotos((p) => {
      const gone = p.find((x) => x.id === id);
      if (gone?.preview) URL.revokeObjectURL(gone.preview);
      return p.filter((x) => x.id !== id);
    });
  }

  const full = photos.filter((p) => p.status !== "error").length + kept.length >= max;
  const blocked = full || disabled;
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length) void addFiles(files);
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kept.map((k, i) => (
          <div key={k.path} className="relative aspect-square overflow-hidden rounded-xl border border-glass-border bg-black/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={k.url} alt={`${tr("Photo")} ${i + 1}`} className="h-full w-full object-cover" />
            {i === 0 && <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">{tr("Cover")}</span>}
            <button type="button" onClick={() => setKept((p) => p.filter((x) => x.path !== k.path))} disabled={disabled} aria-label={`${tr("Remove photo")} ${i + 1}`} className={`absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white hover:bg-black/85 disabled:opacity-40 ${ring}`}>
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        ))}
        {photos.map((p, i) => {
          const n = kept.length + i + 1;
          return (
            <div key={p.id} className="relative aspect-square overflow-hidden rounded-xl border border-glass-border bg-black/30">
              {p.status === "ready" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.preview} alt={`${tr("Photo")} ${n}`} className="h-full w-full object-cover" />
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
              {n === 1 && p.status === "ready" && <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">{tr("Cover")}</span>}
              <button type="button" onClick={() => removePhoto(p.id)} disabled={disabled} aria-label={`${tr("Remove photo")} ${n}`} className={`absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white hover:bg-black/85 disabled:opacity-40 ${ring}`}>
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-lilac to-sakura px-4 py-2.5 text-sm font-semibold text-background transition hover:brightness-110 focus-within:ring-2 focus-within:ring-white/70 ${blocked ? "pointer-events-none opacity-50" : ""}`}>
          <ImagePlus size={16} aria-hidden="true" />
          {tr("Choose photos")}
          <input type="file" accept="image/*" multiple className="sr-only" disabled={blocked} onChange={pick} />
        </label>
        {touch ? (
          // On a phone this opens the real camera app.
          <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-glass-border bg-glass-bg px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-white/30 focus-within:ring-2 focus-within:ring-azure ${blocked ? "pointer-events-none opacity-50" : ""}`}>
            <Camera size={16} aria-hidden="true" />
            {tr("Take a photo")}
            <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={blocked} onChange={pick} />
          </label>
        ) : (
          canUseCamera && (
            <button type="button" onClick={() => setCameraOpen(true)} disabled={blocked} className={`inline-flex items-center gap-2 rounded-xl border border-glass-border bg-glass-bg px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-white/30 disabled:opacity-50 ${ring}`}>
              <Camera size={16} aria-hidden="true" />
              {tr("Take a photo")}
            </button>
          )
        )}
      </div>

      <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-foreground/80">
        <ShieldCheck size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-lilac" />
        {tr(note ?? "Your photos are re-saved on your device and again on our server without any location or camera details. Only the place you name is shown.")}
      </p>

      {cameraOpen && <CameraCapture onClose={() => setCameraOpen(false)} onCapture={(f) => void addFiles([f])} />}
    </div>
  );
}
