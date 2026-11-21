"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import type { PhotoSrc } from "@/components/community/listings/ListingPieces";
import { videoEmbedUrl } from "@/lib/community/listings/video";
import { useTranslate } from "@/lib/i18n/inline";

const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70";

// The photographs of a listing as a grid of thumbnails (loaded lazily); pressing one opens it large, with arrows, Escape to close and focus kept
// inside. A video link, if there is one, shows as a poster and loads the service's own player only when pressed.
export default function ListingGallery({ photos, video }: { photos: PhotoSrc[]; video: string | null }) {
  const tr = useTranslate();
  const [open, setOpen] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const embed = video ? videoEmbedUrl(video) : null;

  const move = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + photos.length) % photos.length)), [photos.length]);
  useEffect(() => {
    if (open === null) return;
    closeRef.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowLeft") move(-1);
      if (e.key === "ArrowRight") move(1);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      document.body.style.overflow = "";
    };
  }, [open, move]);

  if (photos.length === 0 && !embed) return null;
  return (
    <div className="flex flex-col gap-3">
      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {photos.map((p, i) => (
            <li key={p.src}>
              <button type="button" onClick={() => setOpen(i)} aria-label={`${tr("Open photo")} ${i + 1}`} className={`group relative block aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/10 bg-black ${ring}`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- community photographs live in Supabase storage */}
                <img src={p.thumb} alt={p.alt} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05] motion-reduce:transition-none" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {embed && (
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
          {playing ? (
            <iframe src={embed} title={tr("Video")} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" className="absolute inset-0 h-full w-full" />
          ) : (
            <button type="button" onClick={() => setPlaying(true)} className={`absolute inset-0 flex items-center justify-center gap-2 bg-[radial-gradient(60%_80%_at_50%_50%,rgba(155,107,255,0.25),transparent)] text-white ${ring}`}>
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/40 bg-black/40 backdrop-blur-md">
                <Play size={22} aria-hidden="true" fill="currentColor" />
              </span>
              <span className="text-sm font-medium">{tr("Play video")}</span>
            </button>
          )}
        </div>
      )}

      {open !== null && photos[open] && (
        <div role="dialog" aria-modal="true" aria-label={tr("Photo")} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-3 backdrop-blur-sm sm:p-8" onClick={() => setOpen(null)}>
          <button ref={closeRef} type="button" onClick={() => setOpen(null)} aria-label={tr("Close")} className={`absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 ${ring}`}>
            <X size={20} aria-hidden="true" />
          </button>
          {photos.length > 1 && (
            <>
              <button type="button" onClick={(e) => { e.stopPropagation(); move(-1); }} aria-label={tr("Previous photo")} className={`absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:left-6 ${ring}`}>
                <ChevronLeft size={22} aria-hidden="true" />
              </button>
              <button type="button" onClick={(e) => { e.stopPropagation(); move(1); }} aria-label={tr("Next photo")} className={`absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-6 ${ring}`}>
                <ChevronRight size={22} aria-hidden="true" />
              </button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element -- community photographs live in Supabase storage */}
          <img src={photos[open].src} alt={photos[open].alt} onClick={(e) => e.stopPropagation()} className="max-h-full max-w-full rounded-xl object-contain" />
        </div>
      )}
    </div>
  );
}
