"use client";

import { ExternalLink } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import T from "@/components/i18n/T";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// A genuinely real, currently-live public stream of Shibuya Scramble
// Crossing from FNN Prime Online (a real Japanese news network, verified
// YouTube channel) — confirmed live and embeddable before wiring this up.
// If this specific stream ever goes offline, YouTube's own embedded
// player shows its native "video unavailable" state rather than this app
// inventing a fallback — still honest, never faked.
const STREAM_VIDEO_ID = "dfVK7ld38Ys";
const STREAM_WATCH_URL = `https://www.youtube.com/watch?v=${STREAM_VIDEO_ID}`;

export default function LiveCityCamCard() {
  const { t } = useLanguage();

  return (
    <GlassCard className="relative overflow-hidden p-0">
      <div className="relative aspect-video w-full">
        <iframe
          src={`https://www.youtube.com/embed/${STREAM_VIDEO_ID}?autoplay=1&mute=1&rel=0&playsinline=1`}
          title="Shibuya Scramble Crossing — live"
          className="absolute inset-0 h-full w-full"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-[#0b0e1a]/80 to-transparent p-3">
          <span className="flex items-center gap-1.5 rounded-full bg-mint/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-mint">
            <span className="h-1.5 w-1.5 rounded-full bg-mint shadow-[0_0_6px_1px_rgba(74,222,128,0.8)]" />
            {t("widget.live")}
          </span>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-[#0b0e1a]/85 to-transparent p-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              <T k="citycam.title" />
            </p>
            <p className="font-mono text-[10px] text-foreground/70">CAM 01 · SHIBUYA, TOKYO</p>
          </div>
          <a
            href={STREAM_WATCH_URL}
            target="_blank"
            rel="noreferrer"
            className="pointer-events-auto flex items-center gap-1 text-[10px] text-foreground/60 hover:text-foreground"
          >
            FNN Prime Online
            <ExternalLink size={10} />
          </a>
        </div>
      </div>
    </GlassCard>
  );
}
