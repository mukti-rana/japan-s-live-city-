"use client";

import { useRef, useState } from "react";
import { Camera, Image as ImageIcon, TriangleAlert, Loader2, X } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { useOneShotAssistant } from "@/lib/ai/useOneShotAssistant";
import { useImageAttach } from "@/lib/ai/useImageAttach";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function SignAssistantForm({ configured }: { configured: boolean }) {
  const { language, t } = useLanguage();
  const [caption, setCaption] = useState("");
  const { image, attach, clear, error: attachError } = useImageAttach();
  const { submit, content, error, loading } = useOneShotAssistant();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit() {
    if (!configured || !image || loading) return;
    await submit({
      text: caption.trim() || "What does this say?",
      language,
      mode: "sign-assistant",
      image: { base64: image.base64, mediaType: image.mediaType },
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {!configured && (
        <GlassCard className="flex items-start gap-2.5 border-gold/25 bg-gold/5 p-4">
          <TriangleAlert size={16} className="mt-0.5 shrink-0 text-gold" />
          <p className="text-xs leading-relaxed text-muted">
            LIVE CITY AI isn&apos;t configured yet. Add{" "}
            <code className="rounded bg-glass-bg-strong px-1 py-0.5 text-foreground">ANTHROPIC_API_KEY</code>{" "}
            to <code className="rounded bg-glass-bg-strong px-1 py-0.5 text-foreground">.env.local</code> and
            restart the dev server to enable it.
          </p>
        </GlassCard>
      )}

      <GlassCard className="flex flex-col gap-3 p-5">
        {image ? (
          <div className="relative w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element -- client-side attached photo, not a static asset */}
            <img src={image.previewUrl} alt="Attached sign" className="max-h-64 rounded-xl object-contain" />
            <button
              type="button"
              onClick={clear}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-background text-muted hover:text-sakura"
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={!configured}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-glass-border bg-glass-bg px-4 py-6 text-sm font-medium text-foreground transition-colors hover:border-sakura/30 disabled:opacity-50"
            >
              <Camera size={18} className="text-sakura" />
              {t("signAssistant.captureButton")}
            </button>
            <button
              type="button"
              onClick={() => libraryInputRef.current?.click()}
              disabled={!configured}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-glass-border bg-glass-bg px-4 py-6 text-sm font-medium text-foreground transition-colors hover:border-azure/30 disabled:opacity-50"
            >
              <ImageIcon size={18} className="text-azure" />
              {t("signAssistant.uploadButton")}
            </button>
          </div>
        )}

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) attach(file);
            e.target.value = "";
          }}
        />
        <input
          ref={libraryInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) attach(file);
            e.target.value = "";
          }}
        />

        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          disabled={!configured}
          placeholder="Optional: add a question about this image…"
          rows={2}
          className="w-full resize-none rounded-xl border border-glass-border bg-glass-bg px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted outline-none focus:border-sakura/40 disabled:opacity-50"
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!configured || !image || loading}
          className="flex items-center justify-center gap-2 self-start rounded-xl bg-gradient-to-r from-sakura to-gold px-5 py-2.5 text-sm font-semibold text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
          {t("signAssistant.submit")}
        </button>
      </GlassCard>

      {(attachError || error) && (
        <GlassCard className="flex items-start gap-2.5 border-sakura/25 bg-sakura/5 p-4">
          <TriangleAlert size={16} className="mt-0.5 shrink-0 text-sakura" />
          <p className="text-xs leading-relaxed text-muted">{attachError ?? error}</p>
        </GlassCard>
      )}

      {content && (
        <GlassCard className="p-5">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{content}</p>
        </GlassCard>
      )}
    </div>
  );
}
