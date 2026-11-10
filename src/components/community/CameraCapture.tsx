"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { useTranslate } from "@/lib/i18n/inline";

// A live camera view for laptops and desktops (phones use their own camera app
// through the file picker instead). The camera is requested only when the
// person presses the button, stops the moment the window closes, and nothing is
// recorded or sent anywhere until they choose to use the picture.
export default function CameraCapture({ onCapture, onClose }: { onCapture: (file: File) => void; onClose: () => void }) {
  const tr = useTranslate();
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1920 } }, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (video.current) {
          video.current.srcObject = stream;
          await video.current.play();
          setReady(true);
        }
      } catch (e) {
        const name = e instanceof DOMException ? e.name : "";
        setError(
          name === "NotAllowedError" || name === "SecurityError"
            ? "Camera access was blocked. You can allow it in your browser's settings, or choose a photo instead."
            : name === "NotFoundError"
              ? "No camera was found on this device."
              : "The camera couldn't be started. You can choose a photo instead.",
        );
      }
    })();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function snap() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d")?.drawImage(v, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" }));
        onClose();
      },
      "image/jpeg",
      0.9,
    );
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={tr("Take a photo")} className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-glass-border bg-panel p-4">
        <button type="button" onClick={onClose} aria-label={tr("Close")} className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
          <X size={18} aria-hidden="true" />
        </button>
        {error ? (
          <p role="alert" className="px-2 py-10 text-center text-sm text-foreground">
            {tr(error)}
          </p>
        ) : (
          <>
            <video ref={video} playsInline muted className="aspect-video w-full rounded-xl bg-black object-cover" />
            <div className="mt-4 flex justify-center">
              <button type="button" onClick={snap} disabled={!ready} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-lilac to-sakura px-6 py-3 text-sm font-semibold text-background transition hover:brightness-110 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
                <Camera size={18} aria-hidden="true" />
                {tr("Take photo")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
